#!/bin/bash

# Instalação do sistema completo com todos os componentes
# Execute após o sistema de teste estar funcionando

set -e

echo "🎯 INSTALANDO SISTEMA COMPLETO..."

cd /opt/foto-formatura

# Criar types/database.ts
echo "📝 Criando tipos do banco..."
mkdir -p src/types
cat > src/types/database.ts << 'DBTYPES'
export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          email: string;
          phone: string;
          cpf: string | null;
          birth_date: string | null;
          address: string | null;
          emergency_contact: string | null;
          graduation_class_id: string | null;
          notes: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          email: string;
          phone: string;
          cpf?: string | null;
          birth_date?: string | null;
          address?: string | null;
          emergency_contact?: string | null;
          graduation_class_id?: string | null;
          notes?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          email?: string;
          phone?: string;
          cpf?: string | null;
          birth_date?: string | null;
          address?: string | null;
          emergency_contact?: string | null;
          graduation_class_id?: string | null;
          notes?: string | null;
          status?: string;
          updated_at?: string;
        };
      };
      graduation_classes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          responsible_name: string | null;
          responsible_whatsapp: string | null;
          school_name: string;
          graduation_year: number;
          course: string | null;
          student_count: number;
          session_date: string | null;
          location: string | null;
          notes: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          responsible_name?: string | null;
          responsible_whatsapp?: string | null;
          school_name: string;
          graduation_year: number;
          course?: string | null;
          student_count?: number;
          session_date?: string | null;
          location?: string | null;
          notes?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          responsible_name?: string | null;
          responsible_whatsapp?: string | null;
          school_name?: string;
          graduation_year?: number;
          course?: string | null;
          student_count?: number;
          session_date?: string | null;
          location?: string | null;
          notes?: string | null;
          status?: string;
          updated_at?: string;
        };
      };
      photo_packages: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          price: number;
          session_count: number;
          duration_months: number;
          features: any[] | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          price: number;
          session_count?: number;
          duration_months?: number;
          features?: any[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          session_count?: number;
          duration_months?: number;
          features?: any[] | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      photo_sessions: {
        Row: {
          id: string;
          user_id: string;
          graduation_class_id: string | null;
          package_id: string | null;
          title: string;
          description: string | null;
          session_date: string | null;
          location: string | null;
          duration_minutes: number;
          photographer_name: string | null;
          status: string;
          photos_taken: number;
          photos_delivered: number;
          delivery_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          graduation_class_id?: string | null;
          package_id?: string | null;
          title: string;
          description?: string | null;
          session_date?: string | null;
          location?: string | null;
          duration_minutes?: number;
          photographer_name?: string | null;
          status?: string;
          photos_taken?: number;
          photos_delivered?: number;
          delivery_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          graduation_class_id?: string | null;
          package_id?: string | null;
          title?: string;
          description?: string | null;
          session_date?: string | null;
          location?: string | null;
          duration_minutes?: number;
          photographer_name?: string | null;
          status?: string;
          photos_taken?: number;
          photos_delivered?: number;
          delivery_date?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      session_payments: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          student_id: string | null;
          amount: number;
          payment_method: string;
          payment_date: string | null;
          due_date: string;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          student_id?: string | null;
          amount: number;
          payment_method?: string;
          payment_date?: string | null;
          due_date: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          student_id?: string | null;
          amount?: number;
          payment_method?: string;
          payment_date?: string | null;
          due_date?: string;
          status?: string;
          notes?: string | null;
          updated_at?: string;
        };
      };
      payment_transactions: {
        Row: {
          id: string;
          student_id: string;
          mercadopago_payment_id: string;
          preference_id: string;
          external_reference: string;
          amount: number;
          status: string;
          payment_method: string;
          payment_date: string | null;
          payer_email: string;
          metadata: any;
          webhook_data: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          mercadopago_payment_id?: string;
          preference_id?: string;
          external_reference?: string;
          amount: number;
          status?: string;
          payment_method?: string;
          payment_date?: string | null;
          payer_email?: string;
          metadata?: any;
          webhook_data?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          mercadopago_payment_id?: string;
          preference_id?: string;
          external_reference?: string;
          amount?: number;
          status?: string;
          payment_method?: string;
          payment_date?: string | null;
          payer_email?: string;
          metadata?: any;
          webhook_data?: any;
          updated_at?: string;
        };
      };
    };
  };
}
DBTYPES

echo "✅ Tipos criados!"
echo "📋 Próximo: Execute ./build-and-start.sh"
EOF

chmod +x create-components.sh
./create-components.sh