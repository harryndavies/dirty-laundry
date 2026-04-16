-- Add Pro purchase fields to groups table
ALTER TABLE groups ADD COLUMN is_pro boolean NOT NULL DEFAULT false;
ALTER TABLE groups ADD COLUMN stripe_payment_id text;

-- Grandfather existing pocket money users
UPDATE groups SET is_pro = true WHERE pocket_money_rate IS NOT NULL;

-- Ensure group owners can update their group (if not already present)
-- Note: This may already exist in your Supabase setup. Check before running.
-- CREATE POLICY "groups_update_owner" ON groups FOR UPDATE
--   USING (created_by = auth.uid());
