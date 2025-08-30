/*
  # Atualizar campos da tabela graduation_classes

  1. Novos Campos
    - `responsible_name` (text) - Nome do responsável pela turma
    - `responsible_whatsapp` (text) - WhatsApp do responsável
  
  2. Alterações
    - Atualizar status para 'em_andamento' e 'concluido'
    - Adicionar validações para WhatsApp
  
  3. Segurança
    - Manter RLS habilitado
    - Políticas existentes continuam válidas
*/

-- Adicionar novos campos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'graduation_classes' AND column_name = 'responsible_name'
  ) THEN
    ALTER TABLE graduation_classes ADD COLUMN responsible_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'graduation_classes' AND column_name = 'responsible_whatsapp'
  ) THEN
    ALTER TABLE graduation_classes ADD COLUMN responsible_whatsapp text;
  END IF;
END $$;

-- Atualizar constraint de status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'graduation_classes' AND constraint_name = 'graduation_classes_status_check'
  ) THEN
    ALTER TABLE graduation_classes DROP CONSTRAINT graduation_classes_status_check;
  END IF;
END $$;

ALTER TABLE graduation_classes ADD CONSTRAINT graduation_classes_status_check 
CHECK (status = ANY (ARRAY['em_andamento'::text, 'concluido'::text]));

-- Adicionar validação para WhatsApp (formato brasileiro)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'graduation_classes' AND constraint_name = 'graduation_classes_whatsapp_check'
  ) THEN
    ALTER TABLE graduation_classes ADD CONSTRAINT graduation_classes_whatsapp_check 
    CHECK (responsible_whatsapp IS NULL OR responsible_whatsapp ~ '^[0-9]{10,11}$');
  END IF;
END $$;