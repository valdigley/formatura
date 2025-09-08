/*
  # Add payment_date column to payment_transactions table

  1. Changes
    - Add `payment_date` column to `payment_transactions` table
    - Column type: timestamp with time zone (nullable)
    - This resolves the schema mismatch error where the application expects this column

  2. Notes
    - The column is nullable to accommodate existing records
    - New payments can have their payment_date set when payment is confirmed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE payment_transactions ADD COLUMN payment_date timestamptz;
  END IF;
END $$;