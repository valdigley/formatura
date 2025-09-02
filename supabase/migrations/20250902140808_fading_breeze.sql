/*
  # Add contract sending status tracking

  1. Schema Changes
    - Add `contract_sent_status` column to `students` table
    - Add `contract_sent_at` column to `students` table
    - Add `contract_sent_error` column to `students` table
    - Add `payment_sent_status` column to `students` table
    - Add `payment_sent_at` column to `students` table
    - Add `payment_sent_error` column to `students` table

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- Add contract and payment sending status columns to students table
DO $$
BEGIN
  -- Add contract_sent_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'contract_sent_status'
  ) THEN
    ALTER TABLE students ADD COLUMN contract_sent_status text DEFAULT 'pending';
  END IF;

  -- Add contract_sent_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'contract_sent_at'
  ) THEN
    ALTER TABLE students ADD COLUMN contract_sent_at timestamp with time zone;
  END IF;

  -- Add contract_sent_error column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'contract_sent_error'
  ) THEN
    ALTER TABLE students ADD COLUMN contract_sent_error text;
  END IF;

  -- Add payment_sent_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'payment_sent_status'
  ) THEN
    ALTER TABLE students ADD COLUMN payment_sent_status text DEFAULT 'pending';
  END IF;

  -- Add payment_sent_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'payment_sent_at'
  ) THEN
    ALTER TABLE students ADD COLUMN payment_sent_at timestamp with time zone;
  END IF;

  -- Add payment_sent_error column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'payment_sent_error'
  ) THEN
    ALTER TABLE students ADD COLUMN payment_sent_error text;
  END IF;
END $$;

-- Add check constraints for status values
DO $$
BEGIN
  -- Add constraint for contract_sent_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'students' AND constraint_name = 'students_contract_sent_status_check'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_contract_sent_status_check 
    CHECK (contract_sent_status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]));
  END IF;

  -- Add constraint for payment_sent_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'students' AND constraint_name = 'students_payment_sent_status_check'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_payment_sent_status_check 
    CHECK (payment_sent_status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]));
  END IF;
END $$;