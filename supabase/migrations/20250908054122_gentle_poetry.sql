/*
  # Add updated_at column to payment_transactions table

  1. New Columns
    - `updated_at` (timestamp with time zone, default now())
  
  2. Triggers
    - Add trigger to automatically update updated_at on row modifications
  
  3. Functions
    - Create or update the set_updated_at function if needed
*/

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at() 
RETURNS TRIGGER AS $$ 
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.payment_transactions 
    ADD COLUMN updated_at timestamp with time zone DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'set_updated_at_payment_transactions'
  ) THEN
    CREATE TRIGGER set_updated_at_payment_transactions 
    BEFORE UPDATE ON public.payment_transactions 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;