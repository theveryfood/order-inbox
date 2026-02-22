create table orders (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  raw_message text not null,
  customer_name text not null,
  items jsonb not null default '[]'::jsonb,
  delivery_date date,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'fulfilled', 'cancelled')),
  created_at timestamptz default now()
);

alter table orders enable row level security;
