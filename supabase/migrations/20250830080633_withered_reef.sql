/*
  # Fix Payment Transactions RLS and Policies

  1. Security Updates
    - Enable RLS on payment_transactions table
    - Add policies for users to view their own payment transactions
    - Update foreign key relationships

  2. Data Integrity
    - Ensure proper user_id tracking in payment transactions
    - Add indexes for better performance
*/

-- Enable RLS on payment_transactions table
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "payment_transactions_insert_own" ON payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_select_own" ON payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_master_access" ON payment_transactions;

-- Create new policies for payment transactions
CREATE POLICY "Users can view own payment transactions"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own payment transactions"
  ON payment_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own payment transactions"
  ON payment_transactions
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_student 
ON payment_transactions (user_id, student_id);

-- Update existing payment transactions to have proper user_id
UPDATE payment_transactions 
SET user_id = students.user_id
FROM students 
WHERE payment_transactions.student_id = students.id 
AND payment_transactions.user_id IS NULL;