/*
  # Sincronizar usuários do Authentication

  1. Verificação
    - Verificar usuários existentes em auth.users
    - Sincronizar com tabela users personalizada
  
  2. Sincronização
    - Copiar dados de auth.users para users
    - Criar registros de fotógrafo automaticamente
    - Configurar permissões adequadas
  
  3. Segurança
    - Manter RLS ativo
    - Preservar dados existentes
*/

-- Primeiro, vamos verificar se existem usuários em auth.users
DO $$
BEGIN
  -- Inserir usuários de auth.users na tabela users se não existirem
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
    'photographer' as role,
    au.created_at,
    au.updated_at
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL
  AND au.email IS NOT NULL;

  -- Criar registros de fotógrafo para usuários que não têm
  INSERT INTO public.photographers (user_id, business_name, phone, settings, created_at)
  SELECT 
    u.id,
    COALESCE(u.name || ' - Estúdio Fotográfico', 'Estúdio Fotográfico') as business_name,
    COALESCE(au.raw_user_meta_data->>'phone', '(11) 99999-9999') as phone,
    '{"notifications": true, "auto_backup": true}'::jsonb as settings,
    u.created_at
  FROM public.users u
  JOIN auth.users au ON u.id = au.id
  LEFT JOIN public.photographers p ON u.id = p.user_id
  WHERE p.user_id IS NULL
  AND u.role = 'photographer';

  -- Criar configurações padrão para usuários que não têm
  INSERT INTO public.user_settings (user_id, settings, created_at, updated_at)
  SELECT 
    u.id,
    '{
      "general": {
        "studio_name": "' || COALESCE(u.name, 'Meu Estúdio') || ' Fotografia",
        "timezone": "America/Sao_Paulo"
      },
      "notifications": {
        "agendamento": true,
        "pagamento": true,
        "confirmacao": true
      },
      "contract_template": "CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS\n\nCONTRATANTE: {{client_name}}\nCPF: {{client_cpf}}\nTELEFONE: {{client_phone}}\nEMAIL: {{client_email}}\n\nCONTRATADA: {{studio_name}}\n\nOBJETO: Prestação de serviços fotográficos para formatura da turma {{class_name}}.\n\nVALOR: R$ {{package_price}}\nSESSÕES FOTOGRÁFICAS: {{session_count}} sessões\nENTREGA: {{delivery_days}} dias úteis\n\nData: {{contract_date}}\n\n_________________________    _________________________\n    Contratante                  Contratada"
    }'::jsonb as settings,
    now() as created_at,
    now() as updated_at
  FROM public.users u
  LEFT JOIN public.user_settings us ON u.id = us.user_id
  WHERE us.user_id IS NULL;

END $$;

-- Verificar quantos usuários foram sincronizados
SELECT 
  'Usuários sincronizados' as tipo,
  COUNT(*) as quantidade
FROM public.users
UNION ALL
SELECT 
  'Fotógrafos criados' as tipo,
  COUNT(*) as quantidade
FROM public.photographers
UNION ALL
SELECT 
  'Configurações criadas' as tipo,
  COUNT(*) as quantidade
FROM public.user_settings;