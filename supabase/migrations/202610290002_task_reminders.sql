begin;

create table public.task_reminder_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 in_app_enabled boolean not null default true,
 email_enabled boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.task_reminder_preferences enable row level security;
create policy owner_access on public.task_reminder_preferences for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.task_reminder_preferences from anon;
grant select,insert,update,delete on public.task_reminder_preferences to authenticated;
grant all on public.task_reminder_preferences to service_role;
create trigger touch before insert or update on public.task_reminder_preferences for each row execute function public.touch_record();

create table public.task_reminder_deliveries (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 reminder_date date not null, state text not null default 'pending' check(state in ('pending','processing','sent','failed','skipped')),
 payload jsonb not null, email_request jsonb,
 attempts integer not null default 0, claimed_at timestamptz, claim_token uuid, last_run_id uuid,
 sent_at timestamptz, provider_id text, error_code text,
 created_at timestamptz not null default now(), unique(user_id,reminder_date)
);
create index reminder_delivery_queue on public.task_reminder_deliveries(reminder_date,state,claimed_at);
alter table public.task_reminder_deliveries enable row level security;
create policy owner_read on public.task_reminder_deliveries for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.task_reminder_deliveries from anon,authenticated;
grant select on public.task_reminder_deliveries to authenticated;
grant all on public.task_reminder_deliveries to service_role;

-- Only the server worker can access verified recipient addresses and claim work.
create function public.task_reminder_payload(p_user uuid,p_day date) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('email',u.email,'name',coalesce(p.display_name,''),'date',p_day,
 'due_count',(select count(*) from public.tasks where user_id=p_user and status<>'done' and due_date=p_day),
 'overdue_count',(select count(*) from public.tasks where user_id=p_user and status<>'done' and due_date<p_day),
 'tasks',(select jsonb_agg(to_jsonb(t) order by due_date,id) from
   (select id,title,due_date from public.tasks where user_id=p_user and status<>'done' and due_date<=p_day order by due_date,id limit 10) t))
 from auth.users u join public.task_reminder_preferences r on r.user_id=u.id
 left join public.profiles p on p.id=u.id
 where u.id=p_user and r.email_enabled and u.email is not null and u.email_confirmed_at is not null
 and exists(select 1 from public.tasks where user_id=p_user and status<>'done' and due_date<=p_day);
$$;

create function public.claim_task_reminders(p_run uuid,p_limit integer default 20) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare local_day date := (now() at time zone 'Asia/Jakarta')::date; result jsonb;
begin
 if p_run is null or p_limit not between 1 and 100 then raise exception 'Invalid reminder batch'; end if;
 -- Never retry yesterday's payload past the provider's idempotency window.
 update public.task_reminder_deliveries set state='skipped',claim_token=null,error_code='expired'
 where reminder_date<local_day and state in ('pending','processing','failed');
 insert into public.task_reminder_deliveries(user_id,reminder_date,payload)
 select r.user_id,local_day,data.payload from public.task_reminder_preferences r
 cross join lateral (select public.task_reminder_payload(r.user_id,local_day) payload) data
 where r.email_enabled and data.payload is not null
 on conflict(user_id,reminder_date) do nothing;
 with candidates as (
  select d.id from public.task_reminder_deliveries d
  where d.reminder_date=local_day and d.attempts<3 and d.last_run_id is distinct from p_run
  and (d.state in ('pending','failed') or (d.state='processing' and d.claimed_at<now()-interval '10 minutes'))
  order by d.created_at,d.id for update skip locked limit p_limit
 ), claimed as (
  update public.task_reminder_deliveries d set state='processing',attempts=attempts+1,
    claim_token=gen_random_uuid(),claimed_at=now(),last_run_id=p_run
  from candidates c where d.id=c.id returning d.id,d.user_id,d.claim_token,d.payload,d.email_request
 ) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into result from claimed;
 return result;
end $$;

create function public.prepare_task_reminder(p_id uuid,p_token uuid,p_request jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare delivery public.task_reminder_deliveries; result jsonb;
begin
 select * into delivery from public.task_reminder_deliveries where id=p_id and claim_token=p_token and state='processing' for update;
 if not found then return null; end if;
 -- Honor opt-out, email changes, completion, and deadline changes before sending.
 if delivery.reminder_date<>(now() at time zone 'Asia/Jakarta')::date
 or not exists(select 1 from public.task_reminder_preferences r join auth.users u on u.id=r.user_id
   where r.user_id=delivery.user_id and r.email_enabled and u.email_confirmed_at is not null and u.email=delivery.payload->>'email')
 or exists(select 1 from jsonb_array_elements(delivery.payload->'tasks') item where not exists(
   select 1 from public.tasks t where t.id=(item->>'id')::uuid and t.user_id=delivery.user_id
   and t.status<>'done' and t.due_date=(item->>'due_date')::date)) then
   update public.task_reminder_deliveries set state='skipped',claim_token=null,error_code='no_longer_applicable' where id=p_id;
   return null;
 end if;
 -- Immutable email body makes provider idempotency safe across retries.
 update public.task_reminder_deliveries set email_request=coalesce(email_request,p_request) where id=p_id returning email_request into result;
 return result;
end $$;

create function public.finish_task_reminder(p_id uuid,p_token uuid,p_state text,p_provider text default null,p_error text default null) returns boolean
 language plpgsql security definer set search_path='' as $$
begin
 if p_state not in ('sent','failed') then raise exception 'Invalid reminder result'; end if;
 update public.task_reminder_deliveries set state=p_state,claim_token=null,
   sent_at=case when p_state='sent' then now() else null end,
   provider_id=left(p_provider,128),error_code=case when p_error ~ '^[a-zA-Z0-9_-]{1,80}$' then p_error else null end
 where id=p_id and claim_token=p_token and state='processing';
 return found;
end $$;

create function public.pending_task_reminders() returns integer language sql stable security definer set search_path='' as $$
 select count(*)::integer from public.task_reminder_deliveries
 where reminder_date=(now() at time zone 'Asia/Jakarta')::date and state not in ('sent','skipped');
$$;
revoke execute on function public.task_reminder_payload(uuid,date),public.claim_task_reminders(uuid,integer),public.prepare_task_reminder(uuid,uuid,jsonb),public.finish_task_reminder(uuid,uuid,text,text,text),public.pending_task_reminders() from public,anon,authenticated;
grant execute on function public.task_reminder_payload(uuid,date),public.claim_task_reminders(uuid,integer),public.prepare_task_reminder(uuid,uuid,jsonb),public.finish_task_reminder(uuid,uuid,text,text,text),public.pending_task_reminders() to service_role;
commit;
