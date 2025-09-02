import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Mail, Phone, MapPin, Calendar, FileText, Camera, CheckCircle, AlertCircle, BookOpen, Package, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PaymentSelection {
  package_id: string;
  payment_method: string;
  installments?: number;
  discount?: number;
  final_price?: number;
}

export const PublicRegistrationForm: React.FC = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    birth_date: '',
    address: '',
    city: '',
    emergency_contact: '',
    graduation_class_id: '',
    notes: '',
  });
  const [graduationClasses, setGraduationClasses] = useState<any[]>([]);
  const [photoPackages, setPhotoPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [paymentSelection, setPaymentSelection] = useState<PaymentSelection | null>(null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [photographerId, setPhotographerId] = useState<string>('');
  const [photographerUserId, setPhotographerUserId] = useState<string>('');

  useEffect(() => {
    // Get photographer ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const photoId = urlParams.get('photographer_id');
    if (photoId) {
      setPhotographerId(photoId);
      fetchPhotographerData(photoId);
    } else {
      setError('Link inválido. Entre em contato com o fotógrafo.');
    }
  }, []);

  const fetchPhotographerData = async (photoId: string) => {
    try {
      // First get the user_id from photographer_id
      const { data: photographer, error: photoError } = await supabase
        .from('photographers')
        .select('user_id')
        .eq('id', photoId)
        .single();

      if (photoError) throw photoError;
      setPhotographerUserId(photographer.user_id);

      // Fetch graduation classes and packages
      const [classesResult, packagesResult] = await Promise.all([
        supabase
        .from('graduation_classes')
        .select('*')
        .eq('user_id', photographer.user_id)
        .eq('status', 'em_andamento')
        .order('name'),
        supabase
        .from('photo_packages')
        .select('*')
        .eq('user_id', photographer.user_id)
        .eq('is_active', true)
        .order('name')
      ]);
      
      if (classesResult.error) throw classesResult.error;
      if (packagesResult.error) throw packagesResult.error;
      
      setGraduationClasses(classesResult.data || []);
      setPhotoPackages(packagesResult.data || []);
    } catch (error) {
      console.error('Error fetching photographer data:', error);
      setError('Erro ao carregar dados do fotógrafo.');
    }
  };

  // Update available payment methods when package changes
  useEffect(() => {
    if (selectedPackage) {
      const pkg = photoPackages.find(p => p.id === selectedPackage);
      if (pkg && pkg.features && Array.isArray(pkg.features)) {
        const methods = pkg.features.filter((f: any) => f.method);
        setAvailablePaymentMethods(methods);
        setPaymentSelection(null);
      }
    } else {
      setAvailablePaymentMethods([]);
      setPaymentSelection(null);
    }
  }, [selectedPackage, photoPackages]);

  const calculateFinalPrice = (basePrice: number, discount: number = 0) => {
    return basePrice * (1 - discount / 100);
  };

  const handlePaymentMethodChange = (methodData: any) => {
    const pkg = photoPackages.find(p => p.id === selectedPackage);
    if (!pkg) return;

    const finalPrice = calculateFinalPrice(pkg.price, methodData.discount || 0);
    
    setPaymentSelection({
      package_id: selectedPackage,
      payment_method: methodData.method,
      installments: methodData.installments || 1,
      discount: methodData.discount || 0,
      final_price: finalPrice,
    });
  };

  const generateContract = async (studentData: any, packageData: any, paymentData: any, graduationClass?: any) => {
    try {
      // Get contract template from photographer settings
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', photographerUserId)
        .single();

      if (settingsError) {
        console.error('Error fetching contract template:', settingsError);
        return null;
      }

      let template = settings?.settings?.contract_template || `CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS

CONTRATANTE: {{client_name}}
CPF: {{client_cpf}}
TELEFONE: {{client_phone}}
EMAIL: {{client_email}}

CONTRATADA: {{studio_name}}

OBJETO: Prestação de serviços fotográficos para formatura da turma {{class_name}}.

VALOR: R$ {{package_price}}
FORMA DE PAGAMENTO: {{payment_method}}
ENTREGA: 15 dias úteis

Data: {{contract_date}}

_________________________    _________________________
    Contratante                  Contratada`;

      // Get studio name from general settings
      const studioName = settings?.settings?.general?.studio_name || 'Estúdio Fotográfico';
      
      // Use provided graduation class or find it
      const classInfo = graduationClass || graduationClasses.find(c => c.id === studentData.graduation_class_id);
      
      // Replace template variables
      const contract = template
        .replace(/\{\{client_name\}\}/g, studentData.full_name)
        .replace(/\{\{nome_completo\}\}/g, studentData.full_name)
        .replace(/\{\{client_cpf\}\}/g, studentData.cpf || 'Não informado')
        .replace(/\{\{cpf\}\}/g, studentData.cpf || 'Não informado')
        .replace(/\{\{client_phone\}\}/g, studentData.phone)
        .replace(/\{\{whatsapp\}\}/g, studentData.phone)
        .replace(/\{\{client_email\}\}/g, studentData.email)
        .replace(/\{\{email\}\}/g, studentData.email)
        .replace(/\{\{endereco\}\}/g, studentData.address || 'Não informado')
        .replace(/\{\{cidade\}\}/g, studentData.city || 'Não informado')
        .replace(/\{\{studio_name\}\}/g, studioName)
        .replace(/\{\{class_name\}\}/g, classInfo?.name || 'Turma de Formatura')
        .replace(/\{\{tipo_evento\}\}/g, 'Formatura')
        .replace(/\{\{data_evento\}\}/g, graduationClass?.session_date ? format(new Date(graduationClass.session_date), 'dd/MM/yyyy', { locale: ptBR }) : 'A definir')
        .replace(/\{\{horario_evento\}\}/g, graduationClass?.session_date ? format(new Date(graduationClass.session_date), 'HH:mm', { locale: ptBR }) : 'A definir')
        .replace(/\{\{local_festa\}\}/g, graduationClass?.location || 'A definir')
        .replace(/\{\{package_name\}\}/g, packageData?.name || 'Pacote Personalizado')
        .replace(/\{\{package_features\}\}/g, packageData?.features ? 
          packageData.features
            .filter((f: any) => typeof f === 'string')
            .join(', ') : 'Conforme acordado')
        .replace(/\{\{package_price\}\}/g, paymentData?.final_price?.toLocaleString('pt-BR') || packageData?.price?.toLocaleString('pt-BR') || '0,00')
        .replace(/\{\{payment_method\}\}/g, (() => {
          if (!paymentData) return 'A definir';
          
          let paymentText = '';
          switch (paymentData.payment_method) {
            case 'dinheiro':
              paymentText = 'Dinheiro à vista';
              if (paymentData.discount > 0) {
                paymentText += ` (desconto de ${paymentData.discount}%)`;
              }
              break;
            case 'pix':
              paymentText = 'PIX à vista';
              if (paymentData.discount > 0) {
                paymentText += ` (desconto de ${paymentData.discount}%)`;
              }
              break;
            case 'cartao':
              if (paymentData.installments > 1) {
                paymentText = `Cartão de crédito em ${paymentData.installments}x de R$ ${(paymentData.final_price / paymentData.installments).toLocaleString('pt-BR')}`;
              } else {
                paymentText = 'Cartão de crédito à vista';
              }
              if (paymentData.discount > 0) {
                paymentText += ` (desconto de ${paymentData.discount}%)`;
              }
              break;
            case 'transferencia':
              paymentText = 'Transferência bancária';
              if (paymentData.discount > 0) {
                paymentText += ` (desconto de ${paymentData.discount}%)`;
              }
              break;
            case 'parcelado':
              paymentText = `Parcelado em ${paymentData.installments}x de R$ ${(paymentData.final_price / paymentData.installments).toLocaleString('pt-BR')}`;
              if (paymentData.discount > 0) {
                paymentText += ` (desconto de ${paymentData.discount}%)`;
              }
              break;
            default:
              paymentText = paymentData.payment_method;
          }
          
          return paymentText;
        })())
        .replace(/\{\{contract_date\}\}/g, format(new Date(), 'dd/MM/yyyy', { locale: ptBR }));

      return contract;
    } catch (error) {
      console.error('Error generating contract:', error);
      return null;
    }
  };

  const sendContractViaWhatsApp = async (studentData: any, contract: string) => {
    try {
      // Get WhatsApp configuration
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', photographerUserId)
        .single();

      if (settingsError || !settings?.settings?.whatsapp?.is_connected) {
        console.log('WhatsApp não configurado ou não conectado');
        return { success: false, error: 'WhatsApp não configurado ou não conectado', phone: studentData.phone };
      }

      const whatsappConfig = settings.settings.whatsapp;
      
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
          // Também tenta sem código do país
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
      
      const phoneVariations = normalizePhone(studentData.phone);
      console.log('Tentando enviar contrato para números:', phoneVariations);

      const message = `Olá ${studentData.full_name}! 📸

🎉 *CADASTRO REALIZADO COM SUCESSO!* 🎉

Segue abaixo o contrato para sua sessão fotográfica de formatura. 

📋 *IMPORTANTE:* Leia com atenção e confirme seu aceite respondendo *"ACEITO"* nesta conversa.

📄 *CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS:*

${contract}

---

✅ *PARA CONFIRMAR:* Responda *"ACEITO"* 

📞 *DÚVIDAS?* Entre em contato conosco!

Atenciosamente,
Equipe Fotográfica 📷✨`;

      // Tenta enviar para cada variação do número até conseguir
      for (const phoneNumber of phoneVariations) {
        try {
          console.log(`Tentando enviar contrato para: ${phoneNumber}`);
          
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
            console.log(`✅ Contrato enviado com sucesso para: ${phoneNumber}`);
            return { 
              success: true, 
              phone: phoneNumber, 
              messageId: responseData.key.id,
              remoteJid: responseData.key.remoteJid 
            };
          } else {
            console.log(`❌ Falha ao enviar contrato para ${phoneNumber}:`, responseData.message || 'Erro desconhecido');
          }
        } catch (error) {
          console.error(`Erro ao tentar enviar contrato para ${phoneNumber}:`, error);
        }
      }
      
      console.log('❌ Falha ao enviar contrato para todas as variações do número');
      return { 
        success: false, 
        phone: phoneVariations[0], 
        error: 'Não foi possível enviar para nenhuma variação do número',
        attemptedNumbers: phoneVariations
      };
    } catch (error) {
      console.error('Error sending contract via WhatsApp:', error);
      return { 
        success: false, 
        error: error.message || 'Erro interno ao enviar contrato',
        phone: studentData.phone 
      };
    }
  };

  const sendPaymentRequest = async (studentData: any, packageData: any, paymentData: any, graduationClass?: any) => {
    try {
      // Get MercadoPago config
      const { data: settings } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', photographerUserId)
        .single();

      const mercadoPagoConfig = settings?.settings?.mercadopago;
      if (!mercadoPagoConfig?.is_configured) {
        console.log('Mercado Pago não configurado');
        return { success: false, error: 'Mercado Pago não configurado' };
      }

      // Create payment preference
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago?action=create-preference`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: mercadoPagoConfig.access_token,
          environment: mercadoPagoConfig.environment,
          title: packageData?.name || 'Pacote Fotográfico de Formatura',
          amount: paymentData.final_price || packageData?.price || 500,
          payer: {
            name: studentData.full_name,
            email: studentData.email,
            phone: {
              area_code: studentData.phone.substring(0, 2),
              number: studentData.phone.substring(2)
            },
            cpf: studentData.cpf || '12345678909'
          },
          external_reference: `student-${studentData.id || Date.now()}-registration`,
          notification_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-webhook`
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || 'Erro ao criar link de pagamento');
      }

      const paymentLink = responseData.payment_link;
      
      // Get WhatsApp config
      const whatsappConfig = settings.settings.whatsapp;
      if (!whatsappConfig?.is_connected) {
        console.log('WhatsApp não conectado para envio de pagamento');
        return { success: false, error: 'WhatsApp não conectado' };
      }
      
      // Normalizar telefone para pagamento
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
      
      const phoneVariations = normalizePhone(studentData.phone);
      console.log('Tentando enviar pagamento para números:', phoneVariations);

      const paymentMessage = `💰 *SOLICITAÇÃO DE PAGAMENTO* 💰

Olá ${studentData.full_name}! 

Agora que você já recebeu e pode revisar o contrato, segue o link para efetuar o pagamento:

📋 *DETALHES DO PAGAMENTO:*
• Pacote: ${packageData?.name || 'Pacote Fotográfico'}
• Valor: R$ ${(paymentData.final_price || packageData?.price || 0).toLocaleString('pt-BR')}
• Forma de Pagamento: ${paymentData.payment_method}
${paymentData.installments > 1 ? `• Parcelas: ${paymentData.installments}x de R$ ${((paymentData.final_price || 0) / paymentData.installments).toLocaleString('pt-BR')}` : ''}
${paymentData.discount > 0 ? `• Desconto Aplicado: ${paymentData.discount}%` : ''}
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
• Após o pagamento, você receberá confirmação automática
• Sua sessão será confirmada após a aprovação do pagamento

📞 Em caso de dúvidas, entre em contato!

Obrigado! 📷✨`;

      // Tenta enviar para cada variação do número até conseguir
      for (const phoneNumber of phoneVariations) {
        try {
          console.log(`Tentando enviar pagamento para: ${phoneNumber}`);
          
          const response = await fetch(`${whatsappConfig.api_url}/message/sendText/${whatsappConfig.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': whatsappConfig.api_key,
            },
            body: JSON.stringify({
              number: `${phoneNumber}@s.whatsapp.net`,
              text: paymentMessage,
            }),
          });

          const responseData = await response.json();
          console.log(`Resposta pagamento para ${phoneNumber}:`, responseData);

          if (response.ok && responseData.key) {
            console.log(`✅ Pagamento enviado com sucesso para: ${phoneNumber}`);
            return { 
              success: true, 
              phone: phoneNumber, 
              messageId: responseData.key.id,
              remoteJid: responseData.key.remoteJid 
            };
          } else {
            console.log(`❌ Falha ao enviar pagamento para ${phoneNumber}:`, responseData.message || 'Erro desconhecido');
          }
        } catch (error) {
          console.error(`Erro ao tentar enviar pagamento para ${phoneNumber}:`, error);
        }
      }
      
      return { 
        success: false, 
        error: 'Não foi possível enviar para nenhuma variação do número',
        attemptedNumbers: phoneVariations
      };
    } catch (error) {
      console.error('Error sending payment request:', error);
      return { 
        success: false, 
        error: error.message || 'Erro interno ao enviar pagamento'
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!photographerId) {
        throw new Error('ID do fotógrafo não encontrado');
      }

      // Clean phone number
      const cleanPhone = formData.phone.replace(/\D/g, '');
      
      // Clean CPF
      const cleanCpf = formData.cpf.replace(/\D/g, '');

      // Insert new student
      const { data: newStudent, error } = await supabase
        .from('students')
        .insert([{
          user_id: photographerUserId,
          full_name: formData.full_name,
          email: formData.email,
          phone: cleanPhone,
          cpf: cleanCpf || null,
          birth_date: formData.birth_date || null,
          address: formData.address ? `${formData.address}, ${formData.city}` : null,
          emergency_contact: formData.emergency_contact || null,
          graduation_class_id: formData.graduation_class_id || null,
          notes: formData.notes + (paymentSelection ? `\n\nPacote: ${photoPackages.find(p => p.id === selectedPackage)?.name}\nForma de Pagamento: ${paymentSelection.payment_method}\nPreço: R$ ${paymentSelection.final_price?.toLocaleString('pt-BR')}` : '') || null,
          status: 'active',
        }])
        .select()
        .single();

      if (error) throw error;

      // Generate and send contract if package was selected
      if (paymentSelection && selectedPackage) {
        const packageData = photoPackages.find(p => p.id === selectedPackage);
        const graduationClass = graduationClasses.find(c => c.id === formData.graduation_class_id);
        
        const contract = await generateContract(
          { 
            ...formData, 
            id: newStudent.id,
            phone: cleanPhone, 
            cpf: cleanCpf,
            city: formData.city,
            graduation_class_id: formData.graduation_class_id 
          },
          packageData,
          paymentSelection,
          graduationClass
        );

        if (contract) {
          const contractResult = await sendContractViaWhatsApp(
            { ...formData, id: newStudent.id, phone: cleanPhone },
            contract
          );
          
          // Registrar o resultado do envio do contrato
          const contractStatus = contractResult.success ? 'sent_success' : 'sent_failed';
          const contractDetails = contractResult.success 
            ? `ENVIADO COM SUCESSO\nTelefone: ${contractResult.phone}\nRemote JID: ${contractResult.remoteJid || 'N/A'}\nID da mensagem: ${contractResult.messageId || 'N/A'}`
            : `FALHA NO ENVIO\nErro: ${contractResult.error}\nTelefones tentados: ${contractResult.attemptedNumbers?.join(', ') || contractResult.phone}`;
            
          await supabase
            .from('students')
            .update({
              notes: (newStudent.notes || '') + `\n\n=== ENVIO DE CONTRATO ===\nData: ${new Date().toLocaleString('pt-BR')}\nStatus: ${contractDetails}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', newStudent.id);
          
          // Send payment request after contract
          const paymentResult = await sendPaymentRequest(
            { ...formData, id: newStudent.id, phone: cleanPhone },
            packageData,
            paymentSelection,
            graduationClass
          );
          
          // Registrar o resultado do envio do pagamento
          const paymentDetails = paymentResult.success 
            ? `ENVIADO COM SUCESSO\nTelefone: ${paymentResult.phone}\nRemote JID: ${paymentResult.remoteJid || 'N/A'}\nID da mensagem: ${paymentResult.messageId || 'N/A'}`
            : `FALHA NO ENVIO\nErro: ${paymentResult.error}\nTelefones tentados: ${paymentResult.attemptedNumbers?.join(', ') || 'N/A'}`;
            
          await supabase
            .from('students')
            .update({
              notes: (newStudent.notes || '') + `\n\n=== ENVIO DE PAGAMENTO ===\nData: ${new Date().toLocaleString('pt-BR')}\nStatus: ${paymentDetails}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', newStudent.id);
        }
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar formando');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cadastro Realizado!</h2>
          <p className="text-gray-600 mb-6">
            Seu cadastro foi realizado com sucesso! 
            {paymentSelection ? (
              <span> O contrato foi enviado via WhatsApp para seu número. Verifique suas mensagens e confirme o aceite.</span>
            ) : (
              <span> O fotógrafo entrará em contato em breve para agendar sua sessão fotográfica.</span>
            )}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Próximos passos:</strong><br />
              {paymentSelection ? (
                <>
                  • Verifique o contrato no WhatsApp<br />
                  • Responda "ACEITO" para confirmar<br />
                  • Aguarde confirmação da data da sessão<br />
                </>
              ) : (
                <>
                  • Aguarde o contato do fotógrafo<br />
                  • Confirme a data da sessão fotográfica<br />
                </>
              )}
              • Prepare-se para o grande dia da formatura!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <div className="flex items-center space-x-3 mb-2">
              <Camera className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Cadastro de Formando</h1>
            </div>
            <p className="text-blue-100">Preencha seus dados para a sessão fotográfica de formatura</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Informações Pessoais
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => handleChange('cpf', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleChange('birth_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                  <Phone className="h-5 w-5 mr-2 text-blue-600" />
                  Contato
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone/WhatsApp *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contato de Emergência
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact}
                    onChange={(e) => handleChange('emergency_contact', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                    placeholder="Nome e telefone"
                  />
                </div>
              </div>
            </div>

            {/* Graduation Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                Turma de Formatura *
              </label>
              <select
                value={formData.graduation_class_id}
                onChange={(e) => handleChange('graduation_class_id', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              >
                <option value="">Selecione sua turma de formatura</option>
                {graduationClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.school_name} ({cls.graduation_year})
                  </option>
                ))}
              </select>
            </div>

            {/* Package Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <Package className="h-4 w-4 mr-2 text-blue-600" />
                Pacote Fotográfico
              </label>
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              >
                <option value="">Selecione um pacote (opcional)</option>
                {photoPackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} - R$ {pkg.price.toLocaleString('pt-BR')}
                  </option>
                ))}
              </select>
              
              {selectedPackage && (
                <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  {(() => {
                    const pkg = photoPackages.find(p => p.id === selectedPackage);
                    return pkg ? (
                      <div>
                        <div className="font-medium text-blue-800 dark:text-blue-300 mb-2">{pkg.name}</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400 mb-2">Preço base: R$ {pkg.price.toLocaleString('pt-BR')}</div>
                        {pkg.description && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mb-3">{pkg.description}</div>
                        )}
                        
                        {/* Features */}
                        {pkg.features && Array.isArray(pkg.features) && pkg.features.filter((f: any) => typeof f === 'string').length > 0 && (
                          <div className="mb-3">
                            <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Recursos inclusos:</div>
                            <div className="space-y-1">
                              {pkg.features
                                .filter((feature: any) => typeof feature === 'string')
                                .map((feature, index) => (
                                  <div key={index} className="flex items-center space-x-2 text-xs text-blue-700 dark:text-blue-400">
                                    <CheckCircle className="h-3 w-3 text-green-500 dark:text-green-400" />
                                    <span>{feature}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            {/* Payment Method Selection */}
            {selectedPackage && availablePaymentMethods.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-blue-600" />
                  Forma de Pagamento *
                </label>
                <div className="space-y-2">
                  {availablePaymentMethods.map((method, index) => {
                    const pkg = photoPackages.find(p => p.id === selectedPackage);
                    const finalPrice = pkg ? calculateFinalPrice(pkg.price, method.discount || 0) : 0;
                    
                    return (
                      <label key={index} className="flex items-center p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.method}
                          onChange={() => handlePaymentMethodChange(method)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          required={selectedPackage !== ''}
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {method.method === 'dinheiro' && '💵 Dinheiro'}
                              {method.method === 'pix' && '📱 PIX'}
                              {method.method === 'cartao' && '💳 Cartão'}
                              {method.method === 'transferencia' && '🏦 Transferência'}
                              {method.method === 'parcelado' && '📊 Parcelado'}
                            </span>
                            <div className="text-right">
                              {method.installments > 1 && (
                                <div className="text-sm text-gray-600 dark:text-gray-300">{method.installments}x de R$ {(finalPrice / method.installments).toLocaleString('pt-BR')}</div>
                              )}
                              {method.discount > 0 && (
                                <div className="text-sm text-green-600 dark:text-green-400">Desconto: {method.discount}%</div>
                              )}
                              <div className="font-bold text-gray-900 dark:text-white">
                                Total: R$ {finalPrice.toLocaleString('pt-BR')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                
                {paymentSelection && (
                  <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-lg">
                    <div className="text-sm text-green-800 dark:text-green-300">
                      <strong>Resumo do Pagamento:</strong><br />
                      Método: {paymentSelection.payment_method}<br />
                      {paymentSelection.installments > 1 && `Parcelas: ${paymentSelection.installments}x<br />`}
                      {paymentSelection.discount > 0 && `Desconto: ${paymentSelection.discount}%<br />`}
                      <strong>Valor Final: R$ {paymentSelection.final_price?.toLocaleString('pt-BR')}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                  Endereço
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                  placeholder="Rua, número, bairro"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cidade *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                  placeholder="Sua cidade"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                Observações Especiais
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                placeholder="Alguma informação especial que gostaria de compartilhar sobre a sessão fotográfica..."
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all transform hover:scale-105"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircle className="h-5 w-5 mr-2" />
                )}
                {loading ? 'Cadastrando...' : 'Realizar Cadastro'}
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Importante:</strong> Preencha todas as informações com cuidado. 
                Estes dados serão utilizados para organizar sua sessão fotográfica de formatura.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};