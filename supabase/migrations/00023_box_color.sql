-- Add color column to boxes table
alter table boxes
  add column if not exists color text not null default '#6366f1';
