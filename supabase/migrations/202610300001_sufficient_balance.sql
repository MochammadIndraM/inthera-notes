-- Apply after the initial migration. Existing balances are never rewritten.
begin;

create function public.guard_transaction_balance()
returns trigger language plpgsql volatile security invoker set search_path = '' as $$
declare
 previous public.financial_transactions;
 following public.financial_transactions;
 owner_id uuid;
 account_ids uuid[];
 account_row record;
 delta numeric;
begin
 if tg_op <> 'INSERT' then previous := old; end if;
 if tg_op <> 'DELETE' then following := new; end if;
 if tg_op = 'UPDATE' and following.user_id is distinct from previous.user_id then
   raise exception 'Transaction owner cannot change' using errcode = '23514';
 end if;
 owner_id := coalesce(following.user_id, previous.user_id);
 account_ids := array[previous.account_id,previous.from_account_id,previous.to_account_id,
                      following.account_id,following.from_account_id,following.to_account_id];

 -- Lock all old/new accounts in a stable order before reading the ledger.
 for account_row in
   select a.id from public.financial_accounts a
   where a.user_id = owner_id and a.id = any(account_ids)
   order by a.id for update
 loop
   -- A real row version also makes stale REPEATABLE READ writers fail safely.
   -- No balance field is stored: balances remain computed from the ledger.
   update public.financial_accounts set updated_at = updated_at
   where id = account_row.id and user_id = owner_id;
 end loop;

 -- VOLATILE queries acquire a fresh snapshot after waiting for account locks.
 for account_row in
   select a.id, a.balance from public.account_balances a
   where a.user_id = owner_id and a.id = any(account_ids) order by a.id
 loop
   delta := (case
     when following.type='income' and following.account_id=account_row.id then following.amount::numeric
     when following.type='expense' and following.account_id=account_row.id then -following.amount::numeric
     when following.type='transfer' and following.to_account_id=account_row.id then following.amount::numeric
     when following.type='transfer' and following.from_account_id=account_row.id then -following.amount::numeric
     else 0 end) - (case
     when previous.type='income' and previous.account_id=account_row.id then previous.amount::numeric
     when previous.type='expense' and previous.account_id=account_row.id then -previous.amount::numeric
     when previous.type='transfer' and previous.to_account_id=account_row.id then previous.amount::numeric
     when previous.type='transfer' and previous.from_account_id=account_row.id then -previous.amount::numeric
     else 0 end);
   -- Legacy negative balances may be repaired, but never made more negative.
   if delta < 0 and account_row.balance::numeric + delta < 0 then
     raise exception 'insufficient_balance' using errcode = 'P1001';
   end if;
 end loop;
 if tg_op = 'DELETE' then return old; end if;
 return new;
end $$;

create function public.guard_opening_balance()
returns trigger language plpgsql volatile security invoker set search_path = '' as $$
declare current_balance numeric;
begin
 if tg_op = 'INSERT' then
   if new.opening_balance < 0 then
     raise exception 'negative_opening_balance' using errcode = 'P1002';
   end if;
 elsif new.opening_balance < old.opening_balance then
   select a.balance::numeric into current_balance from public.account_balances a
   where a.id=old.id and a.user_id=old.user_id;
   if current_balance + new.opening_balance::numeric - old.opening_balance::numeric < 0 then
     raise exception 'insufficient_balance' using errcode = 'P1001';
   end if;
 end if;
 return new;
end $$;

create trigger sufficient_balance
 before insert or update or delete on public.financial_transactions
 for each row execute function public.guard_transaction_balance();
create trigger sufficient_opening_balance
 before insert or update of opening_balance on public.financial_accounts
 for each row execute function public.guard_opening_balance();

revoke all on function public.guard_transaction_balance(), public.guard_opening_balance() from public, anon;
grant execute on function public.guard_transaction_balance(), public.guard_opening_balance() to authenticated;
commit;
