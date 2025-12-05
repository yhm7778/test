-- Enable UUID extension
create extension if not exists "uuid-ossp";
-- Create profiles table
create table if not exists profiles (
    id uuid primary key references auth.users on delete cascade not null,
    email text unique,
    role text default 'client' check (role in ('admin', 'staff', 'client')),
    created_at timestamp with time zone default now()
);
-- Create applications table
create table if not exists applications (
    id uuid primary key default uuid_generate_v4(),
    created_at timestamp with time zone default now(),
    user_id uuid references auth.users on delete
    set null,
        store_name text not null,
        keywords text [],
        advantages text,
        tags text [],
        place_url text,
        notes text,
        photo_urls text [],
        expire_at timestamp with time zone default (now() + interval '7 days')
);
-- Enable Row Level Security
alter table profiles enable row level security;
alter table applications enable row level security;
-- Profiles RLS Policies
create policy "Users can view own profile" on profiles for
select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for
insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for
update using (auth.uid() = id);
-- Applications RLS Policies
create policy "Anyone can insert applications" on applications for
insert with check (true);
create policy "Users can view own applications" on applications for
select using (
        auth.uid() = user_id
        or user_id is null
        or exists (
            select 1
            from profiles
            where profiles.id = auth.uid()
                and profiles.role in ('admin', 'staff')
        )
    );
create policy "Admins and staff can view all applications" on applications for
select using (
        exists (
            select 1
            from profiles
            where profiles.id = auth.uid()
                and profiles.role in ('admin', 'staff')
        )
    );
create policy "Admins can delete applications" on applications for delete using (
    exists (
        select 1
        from profiles
        where profiles.id = auth.uid()
            and profiles.role = 'admin'
    )
);
-- Create function to automatically create profile on signup
create or replace function public.handle_new_user() returns trigger as $$ begin
insert into public.profiles (id, email, role)
values (new.id, new.email, 'client');
return new;
end;
$$ language plpgsql security definer;
-- Create trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after
insert on auth.users for each row execute procedure public.handle_new_user();
-- Create index for better performance
create index if not exists applications_user_id_idx on applications(user_id);
create index if not exists applications_created_at_idx on applications(created_at);
create index if not exists applications_expire_at_idx on applications(expire_at);
create index if not exists profiles_role_idx on profiles(role);