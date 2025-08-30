/*
  # Add city field to students table

  1. Changes
    - Add `city` column to `students` table
    - Column is nullable to maintain compatibility with existing data

  2. Notes
    - Existing students will have NULL city values
    - New students can have city specified separately from address
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'city'
  ) THEN
    ALTER TABLE students ADD COLUMN city text;
  END IF;
END $$;