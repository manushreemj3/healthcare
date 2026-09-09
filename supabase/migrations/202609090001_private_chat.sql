create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  worker_id bigint not null,
  doctor_id bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (worker_id <> doctor_id)
);

create unique index if not exists conversations_worker_doctor_unique
  on public.conversations (least(worker_id, doctor_id), greatest(worker_id, doctor_id));

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id bigint not null,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id bigint not null,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create or replace function public.is_chat_member(target_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = target_conversation
      and user_id = (auth.jwt() ->> 'app_user_id')::bigint
  );
$$;

create or replace function public.get_or_create_direct_conversation(target_user_id bigint)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  current_user_id bigint := (auth.jwt() ->> 'app_user_id')::bigint;
  current_role text := lower(auth.jwt() ->> 'app_role');
  conversation_id uuid;
  worker bigint;
  doctor bigint;
begin
  if current_user_id is null or target_user_id is null or current_user_id = target_user_id then
    raise exception 'invalid chat participants';
  end if;
  if current_role in ('doctor', 'chief_doctor', 'chief_doc') then
    doctor := current_user_id; worker := target_user_id;
  elsif current_role in ('asha_worker', 'receptionist', 'asha') then
    worker := current_user_id; doctor := target_user_id;
  else
    raise exception 'role cannot use private chat';
  end if;

  insert into public.conversations(worker_id, doctor_id)
  values (worker, doctor)
  on conflict do nothing;
  select id into conversation_id from public.conversations
    where worker_id = worker and doctor_id = doctor;
  insert into public.conversation_members(conversation_id, user_id)
  values (conversation_id, worker), (conversation_id, doctor)
  on conflict do nothing;
  return conversation_id;
end;
$$;

create or replace function public.mark_conversation_read(target_conversation uuid)
returns void language sql security definer set search_path = public as $$
  update public.messages
  set read_at = now()
  where conversation_id = target_conversation
    and sender_id <> (auth.jwt() ->> 'app_user_id')::bigint
    and public.is_chat_member(target_conversation);
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy conversations_member_read on public.conversations for select using (public.is_chat_member(id));
create policy members_member_read on public.conversation_members for select using (public.is_chat_member(conversation_id));
create policy messages_member_read on public.messages for select using (public.is_chat_member(conversation_id));
create policy messages_member_insert on public.messages for insert
  with check (public.is_chat_member(conversation_id) and sender_id = (auth.jwt() ->> 'app_user_id')::bigint);
create policy messages_sender_update on public.messages for update
  using (sender_id = (auth.jwt() ->> 'app_user_id')::bigint)
  with check (sender_id = (auth.jwt() ->> 'app_user_id')::bigint);

grant usage on schema public to authenticated;
grant select on public.conversations, public.conversation_members, public.messages to authenticated;
grant insert, update on public.messages to authenticated;
grant execute on function public.get_or_create_direct_conversation(bigint) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;