import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { Plus, Search, Filter, Edit, Trash2, Phone, Mail, User, Link, Copy, Check, UserPlus, MessageSquare, DollarSign, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { StudentForm } from './StudentForm';

type Student = Database['public']['Tables']['students']['Row'];
type GraduationClass = Database['public']['Tables']['graduation_classes']['Row'];
type PhotoPackage = Database['public']['Tables']['photo_packages']['Row'];

export const StudentList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [graduationClasses, setGraduationClasses] = useState<GraduationClass[]>([]);
  const [photoPackages, setPhotoPackages] = useState<PhotoPackage[]>([]);
  const [photographerId, setPhotographerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [copiedRegistrationLink, setCopiedRegistrationLink] = useState(false);
  const [whatsappConfig, setWhatsappConfig] = useState<any>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null);
  const [sendingPayment, setSendingPayment] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    loadWhatsAppConfig();
  }, []);

  const loadWhatsAppConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      if (data?.settings?.whatsapp) {
        setWhatsappConfig(data.settings.whatsapp);
      }
    } catch (error) {
      console.error('Error loading WhatsApp config:', error);
    }
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get photographer ID
      const { data: photographer } = await supabase
        .from('photographers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (photographer) {
        setPhotographerId(photographer.id);
      }

      const [studentsResult, classesResult, packagesResult] = await Promise.all([
        supabase
          .from('students')
          .select(`
            *,
            graduation_classes(name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('graduation_classes')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['em_andamento', 'concluido']),
        supabase
          .from('photo_packages')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (classesResult.error) throw classesResult.error;
      if (packagesResult.error) throw packagesResult.error;

      setStudents(studentsResult.data || []);
      setGraduationClasses(classesResult.data || []);
      setPhotoPackages(packagesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    const matchesClass = classFilter === 'all' || student.graduation_class_id === classFilter;
    
    return matchesSearch && matchesStatus && matchesClass;
  });

  const deleteStudent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este formando?')) return;
    
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const sendWhatsAppMessage = async (student: Student) => {
    if (!whatsappConfig?.is_connected) {
      alert('Configure e conecte o WhatsApp primeiro nas Configurações');
      return;
    }

    setSendingWhatsApp(student.id);
    try {
      // Função para normalizar e tentar diferentes formatos de telefone
      const normalizePhone = (phone: string) => {
        let clean = phone.replace(/\D/g, '');
        
        if (clean.startsWith('55')) {
          clean = clean.substring(2);
        }
        
        const variations = [];
        
        if (clean.length === 10) {
          const with9 = clean.substring(0, 2) + '9' + clean.substring(2);
          variations.push(`55${with9}`);
          variations.push(`55${clean}`);
          variations.push(with9);
          variations.push(clean);
        } else if (clean.length === 11) {
          variations.push(`55${clean}`);
          variations.push(clean);
          if (clean.charAt(2) === '9') {
            const without9 = clean.substring(0, 2) + clean.substring(3);
            variations.push(`55${without9}`);
            variations.push(without9);
          }
        } else {
          variations.push(clean);
          variations.push(`55${clean}`);
        }
        
        return [...new Set(variations)];
      };
      
      const phoneVariations = normalizePhone(student.phone);
      console.log('Tentando enviar mensagem para números:', phoneVariations);

      const message = `Olá ${student.full_name}! 📸 

Bem-vindo(a) ao nosso estúdio fotográfico! 

Seu cadastro foi confirmado para a sessão de formatura. Em breve entraremos em contato com mais detalhes sobre:

📅 Data e horário da sessão
📍 Local da sessão fotográfica  
💼 Pacote contratado
📋 Orientações importantes

Qualquer dúvida, estamos à disposição!

Atenciosamente,
Equipe Fotográfica`;

      // Tenta enviar para cada variação do número até conseguir
      let messageSent = false;
      let lastError = '';
      let successPhone = '';
      
      for (const phoneNumber of phoneVariations) {
        try {
          console.log(`Tentando enviar mensagem para: ${phoneNumber}`);
          
          const response = await fetch(`${whatsappConfig.api_url}/message/sendText/${whatsappConfig.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': whatsappConfig.api_key,
            },
            body: JSON.stringify({
              number: `${phoneNumber}@s.whatsapp.net`,
              text: message,
            }),
          });

          const responseData = await response.json();
          console.log(`Resposta para ${phoneNumber}:`, responseData);

          if (response.ok && responseData.key) {
            console.log(`✅ Mensagem enviada com sucesso para: ${phoneNumber}`);
            messageSent = true;
            successPhone = phoneNumber;
            
            // Update student notes with success
            const successDetails = `ENVIADO COM SUCESSO\nTelefone: ${phoneNumber}\nRemote JID: ${responseData.key.remoteJid || 'N/A'}\nID da mensagem: ${responseData.key.id || 'N/A'}`;
            
            await supabase
              .from('students')
              .update({
                notes: (student.notes || '') + `\n\n=== ENVIO DE MENSAGEM ===\nData: ${new Date().toLocaleString('pt-BR')}\nStatus: ${successDetails}`,
                updated_at: new Date().toISOString()
              })
              .eq('id', student.id);
            
            break;
          } else {
            lastError = responseData.message || `Erro HTTP: ${response.status}`;
            console.log(`❌ Falha ao enviar mensagem para ${phoneNumber}:`, lastError);
          }
        } catch (error: any) {
          lastError = error.message;
          console.error(`Erro ao tentar enviar mensagem para ${phoneNumber}:`, error);
        }
      }
      
      if (messageSent) {
        alert(`Mensagem enviada com sucesso para ${successPhone}!`);
      } else {
        // Update student notes with failure
        const failureDetails = `FALHA NO ENVIO\nErro: ${lastError}\nTelefones tentados: ${phoneVariations.join(', ')}`;
        
        await supabase
          .from('students')
          .update({
            notes: (student.notes || '') + `\n\n=== ENVIO DE MENSAGEM ===\nData: ${new Date().toLocaleString('pt-BR')}\nStatus: ${failureDetails}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', student.id);
        
        throw new Error(`Falha ao enviar para todos os números testados. Último erro: ${lastError}. Números tentados: ${phoneVariations.join(', ')}`);
      }
    } catch (error: any) {
      alert(`Erro ao enviar WhatsApp: ${error.message}`);
    } finally {
      setSendingWhatsApp(null);
    }
  };

  const sendPaymentRequest = async (student: Student) => {
    if (!whatsappConfig?.is_connected) {
      alert('Configure e conecte o WhatsApp primeiro nas Configurações');
      return;
    }

    setSendingPayment(student.id);
    try {
      // Get MercadoPago config
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: settings } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      const mercadoPagoConfig = settings?.settings?.mercadopago;
      if (!mercadoPagoConfig?.is_configured) {
        alert('Configure o Mercado Pago primeiro nas Configurações');
        return;
      }

      // Find student's graduation class and package info from notes
      const graduationClass = graduationClasses.find(c => c.id === student.graduation_class_id);
      
      // Extract package info from student notes (if available)
      let packagePrice = 500; // Default price
      let packageName = 'Pacote Fotográfico de Formatura';
      
      if (student.notes) {
        const priceMatch = student.notes.match(/Preço:\s*R\$\s*([\d.,]+)/);
        const packageMatch = student.notes.match(/Pacote:\s*([^\n]+)/);
        
        if (priceMatch) {
          packagePrice = parseFloat(priceMatch[1].replace(/[.,]/g, ''));
        }
        if (packageMatch) {
          packageName = packageMatch[1].trim();
        }
      }

      // Create payment preference
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago?action=create-preference`;
      
      // Split full name for better approval rates
      const nameParts = student.full_name.trim().split(' ');
      const firstName = nameParts[0] || student.full_name;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Silva';
      
      // Extract address components if available
      const addressParts = student.address ? student.address.split(',') : [];
      const streetName = addressParts[0]?.trim() || 'Rua das Flores';
      const streetNumber = addressParts[1]?.trim().replace(/\D/g, '') || '123';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: mercadoPagoConfig.access_token,
          environment: mercadoPagoConfig.environment,
          title: packageName,
          amount: packagePrice,
          payer: {
            name: firstName,
            surname: lastName,
            email: student.email,
            phone: {
              area_code: student.phone.substring(0, 2),
              number: student.phone.substring(2)
            },
            cpf: student.cpf || '12345678909',
            address: {
              street_name: streetName,
              street_number: parseInt(streetNumber) || 123,
              zip_code: '01234567'
            }
          },
          external_reference: `student-${student.id}-${Date.now()}`,
          notification_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-webhook`
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || 'Erro ao criar link de pagamento');
      }

      const paymentLink = responseData.payment_link;
      
      // Save payment transaction to database immediately
      const { data: newTransaction, error: transactionError } = await supabase
        .from('payment_transactions')
        .insert([{
          user_id: user.id,
          student_id: student.id,
          preference_id: responseData.preference?.id,
          external_reference: `student-${student.id}-${Date.now()}`,
          amount: packagePrice,
          status: 'pending',
          payer_email: student.email,
          metadata: {
            package_name: packageName,
            student_name: student.full_name,
            graduation_class: graduationClass?.name
          }
        }])
        .select()
        .single();

      if (transactionError) {
        console.error('Error creating payment transaction:', transactionError);
        throw new Error('Erro ao registrar transação de pagamento');
      }

      console.log('Payment transaction created:', newTransaction?.id);
      
      // Função para normalizar e tentar diferentes formatos de telefone
      const normalizePhone = (phone: string) => {
        let clean = phone.replace(/\D/g, '');
        
        // Remove código do país se presente
        if (clean.startsWith('55')) {
          clean = clean.substring(2);
        }
        
        // Retorna diferentes variações do número
        const variations = [];
        
        if (clean.length === 10) {
          // Número sem 9º dígito - adiciona o 9
          const with9 = clean.substring(0, 2) + '9' + clean.substring(2);
          variations.push(`55${with9}`);
          variations.push(`55${clean}`);
          variations.push(with9);
          variations.push(clean);
        } else if (clean.length === 11) {
          // Número com 9º dígito
          variations.push(`55${clean}`);
          variations.push(clean);
          // Também tenta sem o 9º dígito
          if (clean.charAt(2) === '9') {
            const without9 = clean.substring(0, 2) + clean.substring(3);
            variations.push(`55${without9}`);
            variations.push(without9);
          }
        } else if (clean.length === 13 && clean.startsWith('55')) {
          // Número já com código do país
          variations.push(clean);
          const withoutCountry = clean.substring(2);
          variations.push(withoutCountry);
          // Tenta variações com/sem 9º dígito
          if (withoutCountry.length === 11 && withoutCountry.charAt(2) === '9') {
            const without9 = withoutCountry.substring(0, 2) + withoutCountry.substring(3);
            variations.push(`55${without9}`);
            variations.push(without9);
          }
        } else {
          // Outros casos - tenta como está e com código do país
          variations.push(clean);
          variations.push(`55${clean}`);
        }
        
        // Remove duplicatas e retorna
        return [...new Set(variations)];
      };
      
      const phoneVariations = normalizePhone(student.phone);
      console.log('Tentando enviar pagamento para números:', phoneVariations);

      const message = `Olá ${student.full_name}! 📸💰

Sua sessão fotográfica de formatura está confirmada!

📋 *DETALHES DO PAGAMENTO:*
• Pacote: ${packageName}
• Valor: R$ ${packagePrice.toLocaleString('pt-BR')}
${graduationClass ? `• Turma: ${graduationClass.name}` : ''}
${graduationClass?.session_date ? `• Data da Sessão: ${new Date(graduationClass.session_date).toLocaleDateString('pt-BR')}` : ''}

💳 *LINK PARA PAGAMENTO:*
${paymentLink}

✅ *FORMAS DE PAGAMENTO DISPONÍVEIS:*
• PIX (aprovação imediata)
• Cartão de crédito (até 12x)
• Cartão de débito
• Boleto bancário

⏰ *IMPORTANTE:*
• Link válido por 24 horas
• Após o pagamento, você receberá confirmação
• Em caso de dúvidas, entre em contato

Obrigado pela confiança! 📷✨`;

      // Tenta enviar para cada variação do número até conseguir
      let messageSent = false;
      let lastError = '';
      let successPhone = '';
      
      for (const phoneNumber of phoneVariations) {
        try {
          console.log(`Tentando enviar pagamento para: ${phoneNumber}`);
          
          const whatsappResponse = await fetch(`${whatsappConfig.api_url}/message/sendText/${whatsappConfig.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': whatsappConfig.api_key,
            },
            body: JSON.stringify({
              number: `${phoneNumber}@s.whatsapp.net`,
              text: message,
            }),
          });

          const responseData = await whatsappResponse.json();
          console.log(`Resposta para ${phoneNumber}:`, responseData);

          if (whatsappResponse.ok && responseData.key) {
            console.log(`✅ Pagamento enviado com sucesso para: ${phoneNumber}`);
            messageSent = true;
            successPhone = phoneNumber;
            
            // Update student notes with success
            const successDetails = `ENVIADO COM SUCESSO\nTelefone: ${phoneNumber}\nRemote JID: ${responseData.key.remoteJid || 'N/A'}\nID da mensagem: ${responseData.key.id || 'N/A'}`;
            
            await supabase
              .from('students')
              .update({
                notes: (student.notes || '') + `\n\n=== ENVIO DE PAGAMENTO ===\nData: ${new Date().toLocaleString('pt-BR')}\nStatus: ${successDetails}`,
                payment_sent_status: 'sent',
                payment_sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', student.id);
            
            break;
          } else {
            lastError = responseData.message || `Erro HTTP: ${whatsappResponse.status}`;
            console.log(`❌ Falha ao enviar pagamento para ${phoneNumber}:`, lastError);
          }
        } catch (error: any) {
          lastError = error.message;
          console.error(`Erro ao tentar enviar pagamento para ${phoneNumber}:`, error);
        }
      }
      
      if (messageSent) {
        alert(`Link de pagamento enviado via WhatsApp com sucesso para ${successPhone}!`);
      } else {
        // Update student notes with failure
        const failureDetails = `FALHA NO ENVIO\nErro: ${lastError}\nTelefones tentados: ${phoneVariations.join(', ')}`;
        
        await supabase
          .from('students')
          .update({
            notes: (student.notes || '') + `\n\n=== ENVIO DE PAGAMENTO ===\nData: ${new Date().toLocaleString('pt-BR')}\nStatus: ${failureDetails}`,
            payment_sent_status: 'failed',
            payment_sent_error: lastError,
            updated_at: new Date().toISOString()
          })
          .eq('id', student.id);
        
        throw new Error(`Falha ao enviar para todos os números testados. Último erro: ${lastError}`);
      }

    } catch (error: any) {
      alert(`Erro ao enviar solicitação de pagamento: ${error.message}`);
    } finally {
      setSendingPayment(null);
    }
  };

  const generateRegistrationLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/cadastro-formando?photographer_id=${photographerId}`;
  };

  const copyRegistrationLink = async () => {
    if (!photographerId) {
      alert('Erro: ID do fotógrafo não encontrado');
      return;
    }
    
    const link = generateRegistrationLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopiedRegistrationLink(true);
      setTimeout(() => {
        setCopiedRegistrationLink(false);
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      // Fallback para navegadores que não suportam clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedRegistrationLink(true);
      setTimeout(() => {
        setCopiedRegistrationLink(false);
      }, 2000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'graduated': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'graduated': return 'Formado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Formandos</h1>
          <p className="text-gray-600 mt-1">Gerencie todos os formandos das sessões fotográficas</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={copyRegistrationLink}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="Copiar link de cadastro para enviar aos formandos"
          >
            {copiedRegistrationLink ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Link Copiado!
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Link de Cadastro
              </>
            )}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Formando
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar formandos por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="graduated">Formado</option>
            </select>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todas as Turmas</option>
              {graduationClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => (
          <div
            key={student.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{student.full_name}</h3>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                    {getStatusLabel(student.status)}
                  </span>
                </div>
              </div>
              <div className="flex space-x-1">
                {whatsappConfig?.is_connected && (
                  <>
                    <button
                      onClick={() => sendPaymentRequest(student)}
                      disabled={sendingPayment === student.id}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Enviar solicitação de pagamento via WhatsApp"
                    >
                      {sendingPayment === student.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      ) : (
                        <DollarSign className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => sendWhatsAppMessage(student)}
                      disabled={sendingWhatsApp === student.id}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Enviar mensagem de boas-vindas via WhatsApp"
                    >
                      {sendingWhatsApp === student.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setEditingStudent(student)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteStudent(student.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{student.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <Phone className="h-4 w-4" />
                <span>{student.phone}</span>
              </div>
              {student.graduation_class_id && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Turma: {graduationClasses.find(c => c.id === student.graduation_class_id)?.name || 'N/A'}
                </div>
              )}
              
              {/* Contract and Payment Status */}
              <div className="space-y-1">
                {/* Contract Status */}
                {student.notes && student.notes.includes('=== ENVIO DE CONTRATO ===') && (
                  <div className="flex items-center space-x-2 text-xs">
                    {student.notes.includes('ENVIADO COM SUCESSO') ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Contrato enviado</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span className="text-red-600 dark:text-red-400">Falha no envio do contrato</span>
                      </>
                    )}
                  </div>
                )}
                
                {/* Payment Status */}
                {student.notes && student.notes.includes('=== ENVIO DE PAGAMENTO ===') && (
                  <div className="flex items-center space-x-2 text-xs">
                    {student.notes.includes('ENVIADO COM SUCESSO') && student.notes.includes('=== ENVIO DE PAGAMENTO ===') ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Pagamento enviado</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span className="text-red-600 dark:text-red-400">Falha no envio do pagamento</span>
                      </>
                    )}
                  </div>
                )}
                
                {/* Show "not sent" status for students without any sending attempts */}
                {(!student.notes || (!student.notes.includes('=== ENVIO DE CONTRATO ===') && !student.notes.includes('=== ENVIO DE PAGAMENTO ==='))) && (
                  <div className="flex items-center space-x-2 text-xs">
                    <Clock className="h-3 w-3 text-yellow-500" />
                    <span className="text-yellow-600 dark:text-yellow-400">Aguardando envio</span>
                  </div>
                )}
              </div>
            </div>

            {student.notes && (
              <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-300">{student.notes}</p>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Cadastrado em {new Date(student.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum formando encontrado</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece adicionando seu primeiro formando'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={copyRegistrationLink}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Copiar Link de Cadastro
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Manualmente
            </button>
          </div>
        </div>
      )}

      {/* Forms */}
      {showAddForm && (
        <StudentForm
          onClose={() => setShowAddForm(false)}
          onSuccess={fetchData}
          graduationClasses={graduationClasses}
          photoPackages={photoPackages}
        />
      )}

      {editingStudent && (
        <StudentForm
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={fetchData}
          graduationClasses={graduationClasses}
          photoPackages={photoPackages}
        />
      )}
    </div>
  );
};