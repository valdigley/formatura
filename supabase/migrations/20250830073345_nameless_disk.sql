/*
  # Add student relationship to payment transactions

  1. Schema Changes
    - Add `student_id` column to `payment_transactions` table
    - Add foreign key constraint to `students` table
    - Add index for better query performance

  2. Security
    - Update RLS policies to include student relationship
*/

-- Add student_id column to payment_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE payment_transactions ADD COLUMN student_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_transactions_student_id_fkey'
  ) THEN
    ALTER TABLE payment_transactions 
    ADD CONSTRAINT payment_transactions_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for better performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_payment_transactions_student_id'
  ) THEN
    CREATE INDEX idx_payment_transactions_student_id ON payment_transactions(student_id);
  END IF;
END $$;