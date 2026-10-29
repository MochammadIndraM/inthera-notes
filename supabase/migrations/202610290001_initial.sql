-- IntheraNotes: apply once through the Supabase migration runner.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text check (length(display_name) <= 80),
 timezone text not null default 'Asia/Jakarta' check (timezone = 'Asia/Jakarta'),
 theme text not null default 'system' check (theme in ('system','light','dark')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.projects (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 80), description text check (length(description) <= 5000),
 color text not null default '#7560e8' check (color ~ '^#[0-9a-fA-F]{6}$'), is_archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id, user_id)
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 project_id uuid, title text not null check (length(trim(title)) between 1 and 160), description text check (length(description) <= 5000),
 status text not null default 'todo' check (status in ('todo','in_progress','done')),
 priority text not null default 'medium' check (priority in ('low','medium','high')), due_date date,
 completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key (project_id,user_id) references public.projects(id,user_id) on delete restrict
);
create table public.financial_accounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 80), type text not null check (type in ('cash','bank','ewallet','other')),
 opening_balance bigint not null default 0, opened_on date, is_archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id,user_id)
);
create table public.financial_categories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 80), type text not null check (type in ('income','expense')),
 is_default boolean not null default false, is_archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id,user_id), unique (id,user_id,type)
);
create unique index category_unique_name on public.financial_categories (user_id,type,lower(trim(name)));
create table public.financial_transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 type text not null check (type in ('income','expense','transfer')), amount bigint not null check (amount > 0), transaction_date date not null,
 account_id uuid, from_account_id uuid, to_account_id uuid, category_id uuid,
 title text check (length(title) <= 160), notes text check (length(notes) <= 5000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((type in ('income','expense') and account_id is not null and category_id is not null and from_account_id is null and to_account_id is null)
 or (type = 'transfer' and account_id is null and category_id is null and from_account_id is not null and to_account_id is not null and from_account_id <> to_account_id)),
 foreign key (account_id,user_id) references public.financial_accounts(id,user_id) on delete restrict,
 foreign key (from_account_id,user_id) references public.financial_accounts(id,user_id) on delete restrict,
 foreign key (to_account_id,user_id) references public.financial_accounts(id,user_id) on delete restrict,
 foreign key (category_id,user_id,type) references public.financial_categories(id,user_id,type) on delete restrict
);
create table public.budgets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 category_id uuid not null, category_type text not null default 'expense' check (category_type = 'expense'),
 month date not null check (extract(day from month)=1), limit_amount bigint not null check (limit_amount > 0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (user_id,category_id,month), foreign key (category_id,user_id,category_type) references public.financial_categories(id,user_id,type) on delete restrict
);
create index tasks_status_due on public.tasks(user_id,status,due_date);
create index tasks_created on public.tasks(user_id,created_at desc);
create index projects_owner on public.projects(user_id,is_archived);
create index accounts_owner on public.financial_accounts(user_id,is_archived);
create index transactions_date on public.financial_transactions(user_id,transaction_date desc,id);
create index transactions_type_date on public.financial_transactions(user_id,type,transaction_date);
create index transactions_account on public.financial_transactions(user_id,account_id);
create index transactions_from on public.financial_transactions(user_id,from_account_id);
create index transactions_to on public.financial_transactions(user_id,to_account_id);
create index transactions_category on public.financial_transactions(user_id,category_id,transaction_date);

create function public.touch_record() returns trigger language plpgsql set search_path = '' as $$
begin
 new.updated_at := now();
 if tg_table_name = 'tasks' then
   if new.status = 'done' then
     if tg_op = 'UPDATE' and old.status = 'done' then new.completed_at := old.completed_at;
     else new.completed_at := now(); end if;
   else new.completed_at := null; end if;
 end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['profiles','projects','tasks','financial_accounts','financial_categories','financial_transactions','budgets'] loop
   execute format('create trigger touch before insert or update on public.%I for each row execute function public.touch_record()',t);
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from anon',t);
   execute format('grant select, insert, update, delete on public.%I to authenticated',t);
   execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)',t,case when t='profiles' then 'id' else 'user_id' end,case when t='profiles' then 'id' else 'user_id' end);
 end loop;
end $$;

-- Reject archived relations for new usage; retain the same relation on historical edits.
create function public.validate_active_relations() returns trigger language plpgsql set search_path = '' as $$
declare relation_id uuid;
begin
 if tg_table_name = 'financial_transactions' then
   foreach relation_id in array array[new.account_id,new.from_account_id,new.to_account_id] loop
     if relation_id is not null and (tg_op='INSERT' or relation_id is distinct from old.account_id and relation_id is distinct from old.from_account_id and relation_id is distinct from old.to_account_id) then
       if not exists(select 1 from public.financial_accounts where id=relation_id and user_id=new.user_id and not is_archived) then raise exception 'Akun tidak aktif atau tidak tersedia' using errcode='23514'; end if;
     end if;
   end loop;
   if new.category_id is not null and (tg_op='INSERT' or new.category_id is distinct from old.category_id) then
     if not exists(select 1 from public.financial_categories where id=new.category_id and user_id=new.user_id and not is_archived) then raise exception 'Kategori tidak aktif atau tidak tersedia' using errcode='23514'; end if;
   end if;
 elsif tg_table_name = 'tasks' then
   if new.project_id is not null then
     if tg_op='INSERT' or new.project_id is distinct from old.project_id then
       if not exists(select 1 from public.projects where id=new.project_id and user_id=new.user_id and not is_archived) then raise exception 'Proyek tidak aktif atau tidak tersedia' using errcode='23514'; end if;
     end if;
   end if;
 elsif tg_table_name = 'budgets' then
   if tg_op='INSERT' or new.category_id is distinct from old.category_id then
     if not exists(select 1 from public.financial_categories where id=new.category_id and user_id=new.user_id and not is_archived) then raise exception 'Kategori tidak aktif atau tidak tersedia' using errcode='23514'; end if;
   end if;
 end if;
 return new;
end $$;
create trigger active_relations before insert or update on public.financial_transactions for each row execute function public.validate_active_relations();
create trigger active_project before insert or update on public.tasks for each row execute function public.validate_active_relations();
create trigger active_budget_category before insert or update on public.budgets for each row execute function public.validate_active_relations();

create function public.initialize_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(new.raw_user_meta_data->>'display_name',80)) on conflict do nothing;
 insert into public.financial_categories(user_id,name,type,is_default)
 select new.id, name, 'expense',true from unnest(array['Makanan & Minuman','Transportasi','Belanja','Tagihan','Hiburan','Kesehatan','Pendidikan','Rumah Tangga','Lainnya']) name on conflict do nothing;
 insert into public.financial_categories(user_id,name,type,is_default)
 select new.id, name, 'income',true from unnest(array['Gaji','Freelance','Bisnis','Hadiah','Investasi','Lainnya']) name on conflict do nothing;
 return new;
end $$;
create trigger initialize_inthera_user after insert on auth.users for each row execute function public.initialize_user();
-- Backfill existing Auth users without requiring a service-role key in the app.
insert into public.profiles(id,display_name) select id,left(raw_user_meta_data->>'display_name',80) from auth.users on conflict do nothing;
insert into public.financial_categories(user_id,name,type,is_default)
select u.id,c.name,c.type,true from auth.users u cross join (values
 ('Makanan & Minuman','expense'),('Transportasi','expense'),('Belanja','expense'),('Tagihan','expense'),('Hiburan','expense'),('Kesehatan','expense'),('Pendidikan','expense'),('Rumah Tangga','expense'),('Lainnya','expense'),
 ('Gaji','income'),('Freelance','income'),('Bisnis','income'),('Hadiah','income'),('Investasi','income'),('Lainnya','income')) c(name,type) on conflict do nothing;

-- Cast all monetary values to decimal strings before PostgREST JSON serialization.
create view public.account_balances with (security_invoker=true) as
select a.id,a.user_id,a.name,a.type,a.opening_balance::text,a.opened_on,a.is_archived,
 (a.opening_balance::numeric + coalesce((select sum(case
 when t.type='income' and t.account_id=a.id then t.amount::numeric
 when t.type='expense' and t.account_id=a.id then -t.amount::numeric
 when t.type='transfer' and t.to_account_id=a.id then t.amount::numeric
 when t.type='transfer' and t.from_account_id=a.id then -t.amount::numeric else 0 end)
 from public.financial_transactions t where t.user_id=a.user_id and (t.account_id=a.id or t.from_account_id=a.id or t.to_account_id=a.id)),0))::text as balance
from public.financial_accounts a;
create view public.transaction_records with (security_invoker=true) as
select t.id,t.user_id,t.type,t.amount::text,t.transaction_date,t.account_id,t.from_account_id,t.to_account_id,t.category_id,t.title,t.notes,t.created_at,
 c.name category_name,a.name account_name,f.name from_account_name,d.name to_account_name,
 concat_ws(' ',t.title,t.notes) search_text, t.amount as sort_amount
from public.financial_transactions t
left join public.financial_categories c on c.id=t.category_id
left join public.financial_accounts a on a.id=t.account_id
left join public.financial_accounts f on f.id=t.from_account_id
left join public.financial_accounts d on d.id=t.to_account_id;
create view public.budget_usage with (security_invoker=true) as
select b.id,b.user_id,b.category_id,c.name category_name,b.month,b.limit_amount::text,
 coalesce((select sum(t.amount)::text from public.financial_transactions t where t.user_id=b.user_id and t.type='expense' and t.category_id=b.category_id and t.transaction_date>=b.month and t.transaction_date<(b.month+interval '1 month')::date),'0') spent
from public.budgets b join public.financial_categories c on c.id=b.category_id;
grant select on public.account_balances,public.transaction_records,public.budget_usage to authenticated;
revoke all on public.account_balances,public.transaction_records,public.budget_usage from anon;

create function public.workspace_summary(p_start date,p_end date) returns jsonb language sql stable security invoker set search_path='' as $$
 with period as (select * from public.financial_transactions where user_id=auth.uid() and transaction_date>=p_start and transaction_date<p_end),
 days as (select d::date as calendar_date from generate_series(case when p_end>p_start and p_end-p_start<=367 then p_start::timestamp end,(p_end-1)::timestamp,interval '1 day') d),
 daily as (select d.calendar_date,coalesce(sum(t.amount) filter(where t.type='income'),0)::text income,coalesce(sum(t.amount) filter(where t.type='expense'),0)::text expense from days d left join period t on t.transaction_date=d.calendar_date group by d.calendar_date),
 cats as (select c.id,c.name,sum(t.amount)::text amount from period t join public.financial_categories c on c.id=t.category_id where t.type='expense' group by c.id,c.name order by sum(t.amount) desc),
 local_day as (select (now() at time zone 'Asia/Jakarta')::date today)
 select jsonb_build_object(
 'balance',(select coalesce(sum(balance::numeric),0)::text from public.account_balances where user_id=auth.uid()),
 'income',(select coalesce(sum(amount),0)::text from period where type='income'),
 'expense',(select coalesce(sum(amount),0)::text from period where type='expense'),
 'active_tasks',(select count(*) from public.tasks where user_id=auth.uid() and status<>'done'),
 'completed_today',(select count(*) from public.tasks,local_day where user_id=auth.uid() and status='done' and (completed_at at time zone 'Asia/Jakarta')::date=today),
 'due_today',(select count(*) from public.tasks,local_day where user_id=auth.uid() and status<>'done' and due_date=today),
 'overdue',(select count(*) from public.tasks,local_day where user_id=auth.uid() and status<>'done' and due_date<today),
 'daily',coalesce((select jsonb_agg(jsonb_build_object('date',calendar_date,'income',income,'expense',expense) order by calendar_date) from daily),'[]'::jsonb),
 'categories',coalesce((select jsonb_agg(to_jsonb(cats)) from cats),'[]'::jsonb));
$$;
-- One JSON document provides a consistent statement snapshot and avoids the
-- PostgREST row cap for exports. Monetary fields remain strings.
create function public.export_transactions(p_start date,p_end date,p_type text default null,p_account uuid default null,p_category uuid default null,p_search text default '',p_sort text default '')
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('rows',coalesce(jsonb_agg(jsonb_build_object(
   'transaction_date',t.transaction_date,'type',t.type,'amount',t.amount,'title',t.title,'notes',t.notes,
   'category_name',t.category_name,'account_name',t.account_name,'from_account_name',t.from_account_name,'to_account_name',t.to_account_name)
   order by
     case when p_sort='oldest' then t.transaction_date end asc,
     case when p_sort='largest' then t.sort_amount end desc,
     case when p_sort='smallest' then t.sort_amount end asc,
     case when p_sort not in ('oldest','largest','smallest') then t.transaction_date end desc,t.id asc),'[]'::jsonb))
 from public.transaction_records t
 where t.user_id=auth.uid() and t.transaction_date>=p_start and t.transaction_date<p_end
 and (p_type is null or t.type=p_type)
 and (p_account is null or p_account in (t.account_id,t.from_account_id,t.to_account_id))
 and (p_category is null or t.category_id=p_category)
 and (p_search='' or t.search_text ilike '%'||p_search||'%');
$$;
create function public.delete_project(p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.projects where id=p_id and user_id=auth.uid()) then raise exception 'Proyek tidak tersedia'; end if;
 update public.tasks set project_id=null where project_id=p_id and user_id=auth.uid();
 delete from public.projects where id=p_id and user_id=auth.uid();
end $$;
revoke execute on function public.initialize_user(),public.touch_record(),public.validate_active_relations(),public.workspace_summary(date,date),public.delete_project(uuid),public.export_transactions(date,date,text,uuid,uuid,text,text) from public,anon;
grant execute on function public.workspace_summary(date,date),public.delete_project(uuid),public.export_transactions(date,date,text,uuid,uuid,text,text) to authenticated;
commit;
