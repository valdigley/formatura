/*
  # Add external_reference column to payment_transactions

  1. Schema Changes
    - Add `external_reference` column to `payment_transactions` table
    - Add `mercadopago_payment_id` column to `payment_transactions` table
    - Add `preference_id` column to `payment_transactions` table
    - Add `payer_email` column to `payment_transactions` table
    - Add `webhook_data` column to `payment_transactions` table

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- Add missing columns to payment_transactions table
DO $$
BEGIN
  -- Add external_reference column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'external_reference'
  ) THEN
    ALTER TABLE payment_transactions ADD COLUMN external_reference text;
  END IF;

  -- Add mercadopago_payment_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'mercadopago_payment_id'
  ) THEN
    ALTER TABLE payment_transactions ADD COLUMN mercadopago_payment_id text;
  END IF;

  -- Add preference_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'preference_id'
  ) THEN
    ALTER TABLE payment_transactions ADD COLUMN preference_id text;
  END IF;

  -- Add payer_email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'payer_email'
  ) THEN
    ALTER TABLE payment_transactions ADD COLUMN payer_email text;
  END IF;

  -- Add webhook_data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'webhook_data'
  ) THEN
    ALTER TABLE payment_transactions ADD COLUMN webhook_data jsonb;
  END IF;
END $$;