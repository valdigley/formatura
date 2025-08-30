/*
  # Sistema de Gestão de Sessões Fotográficas de Formatura

  1. New Tables
    - `students` - Dados dos formandos
    - `graduation_classes` - Turmas de formatura
    - `photo_sessions` - Sessões fotográficas agendadas
    - `photo_packages` - Pacotes fotográficos disponíveis
    - `session_payments` - Pagamentos das sessões

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data

  3. Features
    - Complete CRUD operations for all entities
    - Payment tracking and status management
    - Session scheduling and management
*/

-- Students table for graduation photography
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  cpf text,
  birth_date date,
  address text,
  emergency_contact text,
  graduation_class_id uuid,
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Graduation classes
CREATE TABLE IF NOT EXISTS graduation_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  school_name text NOT NULL,
  graduation_year integer NOT NULL,
  course text,
  student_count integer DEFAULT 0,
  session_date timestamptz,
  location text,
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Photo packages
CREATE TABLE IF NOT EXISTS photo_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  session_count integer DEFAULT 1,
  duration_months integer DEFAULT 1,
  features jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Photo sessions
CREATE TABLE IF NOT EXISTS photo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  graduation_class_id uuid REFERENCES graduation_classes(id) ON DELETE CASCADE,
  package_id uuid REFERENCES photo_packages(id),
  title text NOT NULL,
  description text,
  session_date timestamptz,
  location text DEFAULT 'Estúdio',
  duration_minutes integer DEFAULT 120,
  photographer_name text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  photos_taken integer DEFAULT 0,
  photos_delivered integer DEFAULT 0,
  delivery_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Session payments
CREATE TABLE IF NOT EXISTS session_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES photo_sessions(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id),
  amount numeric(10,2) NOT NULL,
  payment_method text DEFAULT 'dinheiro' CHECK (payment_method IN ('dinheiro', 'pix', 'cartao', 'transferencia')),
  payment_date date,
  due_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key to students table
ALTER TABLE students ADD CONSTRAINT students_graduation_class_id_fkey 
  FOREIGN KEY (graduation_class_id) REFERENCES graduation_classes(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduation_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for students
CREATE POLICY "Users can manage own students"
  ON students FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for graduation_classes
CREATE POLICY "Users can manage own graduation classes"
  ON graduation_classes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for photo_packages
CREATE POLICY "Users can manage own photo packages"
  ON photo_packages FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for photo_sessions
CREATE POLICY "Users can manage own photo sessions"
  ON photo_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for session_payments
CREATE POLICY "Users can manage own session payments"
  ON session_payments FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_graduation_class_id ON students(graduation_class_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_graduation_classes_user_id ON graduation_classes(user_id);
CREATE INDEX IF NOT EXISTS idx_graduation_classes_session_date ON graduation_classes(session_date);
CREATE INDEX IF NOT EXISTS idx_photo_packages_user_id ON photo_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_packages_is_active ON photo_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_photo_sessions_user_id ON photo_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_sessions_graduation_class_id ON photo_sessions(graduation_class_id);
CREATE INDEX IF NOT EXISTS idx_photo_sessions_session_date ON photo_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_session_payments_user_id ON session_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_session_payments_session_id ON session_payments(session_id);
CREATE INDEX IF NOT EXISTS idx_session_payments_due_date ON session_payments(due_date);