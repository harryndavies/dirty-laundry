-- DEMO SEED SCRIPT
-- Creates a "The Johnsons" group with 4 members, chores, and completions
-- Run this in the Supabase SQL Editor
--
-- NOTE: This creates auth users directly. You won't be able to log in as them
-- (they're just for populating the demo). Log in as your own account and join
-- the group using the invite code printed at the end.

-- 1. Create fake auth users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'dad@demo.test', '$2a$10$demo', now(), now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000002', 'mum@demo.test', '$2a$10$demo', now(), now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000003', 'jake@demo.test', '$2a$10$demo', now(), now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000004', 'lily@demo.test', '$2a$10$demo', now(), now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- 2. Create profiles (the trigger may have done this, but upsert to be safe)
INSERT INTO profiles (id, display_name, avatar_color)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Dad', '#0066FF'),
  ('d0000000-0000-0000-0000-000000000002', 'Mum', '#FF2D9B'),
  ('d0000000-0000-0000-0000-000000000003', 'Jake', '#FF6B00'),
  ('d0000000-0000-0000-0000-000000000004', 'Lily', '#8B5CF6')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, avatar_color = EXCLUDED.avatar_color;

-- 3. Create the demo group
INSERT INTO groups (id, name, invite_code, created_by)
VALUES ('d0000000-0000-0000-0000-100000000000', 'The Johnsons', 'DEMO2026', 'd0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 4. Add members
INSERT INTO group_members (group_id, user_id, role, total_points)
VALUES
  ('d0000000-0000-0000-0000-100000000000', 'd0000000-0000-0000-0000-000000000001', 'owner', 0),
  ('d0000000-0000-0000-0000-100000000000', 'd0000000-0000-0000-0000-000000000002', 'member', 0),
  ('d0000000-0000-0000-0000-100000000000', 'd0000000-0000-0000-0000-000000000003', 'kid', 0),
  ('d0000000-0000-0000-0000-100000000000', 'd0000000-0000-0000-0000-000000000004', 'kid', 0)
ON CONFLICT DO NOTHING;

-- 5. Create chores
INSERT INTO chores (id, group_id, name, points, base_points, is_persistent, area, created_by, reminder_day, reminder_time)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-100000000000', 'Do the dishes',        10, 10, true,  'Kitchen',     'd0000000-0000-0000-0000-000000000001', 1, '18:00'),
  ('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-100000000000', 'Hoover downstairs',    15, 15, true,  'Living Room', 'd0000000-0000-0000-0000-000000000001', 3, '10:00'),
  ('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-100000000000', 'Hoover upstairs',      15, 15, true,  'Bedroom',     'd0000000-0000-0000-0000-000000000001', 3, '10:00'),
  ('c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-100000000000', 'Clean the bathroom',   20, 20, true,  'Bathroom',    'd0000000-0000-0000-0000-000000000002', 6, '09:00'),
  ('c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-100000000000', 'Put a wash on',        10, 10, true,  'Laundry',     'd0000000-0000-0000-0000-000000000002', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-100000000000', 'Hang out washing',     10, 10, true,  'Laundry',     'd0000000-0000-0000-0000-000000000002', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-100000000000', 'Cook dinner',          20, 20, true,  'Kitchen',     'd0000000-0000-0000-0000-000000000001', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-100000000000', 'Take the bins out',    10, 10, true,  'General',     'd0000000-0000-0000-0000-000000000001', 4, '07:30'),
  ('c0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-100000000000', 'Mow the grass',        25, 25, true,  'Garden',      'd0000000-0000-0000-0000-000000000001', 6, '11:00'),
  ('c0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-100000000000', 'Wipe kitchen surfaces', 10, 10, true, 'Kitchen',     'd0000000-0000-0000-0000-000000000002', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-100000000000', 'Unload dishwasher',     5,  5, true,  'Kitchen',     'd0000000-0000-0000-0000-000000000003', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-100000000000', 'Tidy living room',     10, 10, true,  'Living Room', 'd0000000-0000-0000-0000-000000000004', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 6. Insert completions over the past 2 weeks (trigger auto-updates total_points)
-- Reset points first to avoid double-counting on re-run
UPDATE group_members SET total_points = 0 WHERE group_id = 'd0000000-0000-0000-0000-100000000000';
DELETE FROM completions WHERE group_id = 'd0000000-0000-0000-0000-100000000000';

INSERT INTO completions (group_id, chore_id, user_id, points_earned, chore_name, completed_at) VALUES
  -- Dad — steady contributor
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 20, 'Cook dinner',          now() - interval '13 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', 10, 'Take the bins out',    now() - interval '11 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 20, 'Cook dinner',          now() - interval '9 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000001', 25, 'Mow the grass',        now() - interval '7 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', 10, 'Take the bins out',    now() - interval '4 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 20, 'Cook dinner',          now() - interval '2 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 10, 'Do the dishes',        now() - interval '1 day'),
  -- Mum — top of the leaderboard
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 20, 'Clean the bathroom',   now() - interval '13 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 10, 'Put a wash on',        now() - interval '12 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000002', 10, 'Hang out washing',     now() - interval '12 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000002', 10, 'Wipe kitchen surfaces', now() - interval '10 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 15, 'Hoover downstairs',    now() - interval '8 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 10, 'Put a wash on',        now() - interval '6 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000002', 10, 'Hang out washing',     now() - interval '6 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 20, 'Clean the bathroom',   now() - interval '5 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000002', 20, 'Cook dinner',          now() - interval '3 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000002', 10, 'Wipe kitchen surfaces', now() - interval '1 day'),
  -- Jake (kid) — doing his bit
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000003',  5, 'Unload dishwasher',    now() - interval '12 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 10, 'Do the dishes',        now() - interval '10 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000003',  5, 'Unload dishwasher',    now() - interval '7 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000003', 10, 'Take the bins out',    now() - interval '5 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000003',  5, 'Unload dishwasher',    now() - interval '2 days'),
  -- Lily (kid) — fewer chores
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000004', 10, 'Tidy living room',     now() - interval '11 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000004', 10, 'Tidy living room',     now() - interval '6 days'),
  ('d0000000-0000-0000-0000-100000000000', 'c0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000004',  5, 'Unload dishwasher',    now() - interval '3 days');

-- Expected totals: Dad=115, Mum=135, Jake=35, Lily=25

-- Print the invite code
SELECT 'Demo group created! Invite code: DEMO2026' AS result;
SELECT name, invite_code FROM groups WHERE id = 'd0000000-0000-0000-0000-100000000000';
