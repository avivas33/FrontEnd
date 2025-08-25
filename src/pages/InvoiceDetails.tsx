import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Eye, EyeOff, Smartphone, Building2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import BillPayHeader from '@/components/BillPayHeader';
import { ACHPaymentModal } from '@/components/ACHPaymentModal';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useIsMobile } from '@/hooks/use-mobile';
import { clienteService, pagoService } from '@/services';

// Missing interfaces
interface CompanyPaymentMethods {
  companyName: string;
  paymentMethods: {
    creditCard: {
      enabled: boolean;
      displayName: string;
    };
    yappy: {
      enabled: boolean;
      displayName: string;
    };
    paypal: {
      enabled: boolean;
      displayName: string;
    };
    ach: {
      enabled: boolean;
      displayName: string;
    };
  };
}

interface PayPalCreateOrderRequest {
  clienteCode: string;
  numeroFactura: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  emailCliente?: string;
  nombreCliente: string;
  invoiceDetails?: Array<{
    invoiceNumber: string;
    amount: number;
  }>;
}

// Función para formatear números con comas para miles y punto para decimales
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

interface InvoiceData {
  clientName: string;
  clientCode: string;
  serviceType: string;
  invoiceNumber: string;
  officialSerNr: string;
  payDeal: string;
  invDate: string;
  dueDate: string;
  amount: number;
  status: string;
}

interface LocationState {
  clientCode: string;
  searchType: string;
  invoiceDataList: InvoiceData[];
  totalAmount: number;
  empresaSeleccionada?: string;
  revisarEstadoCuenta?: boolean; // ¡CRÍTICO! Para preservar estado de autenticación
}

const InvoiceDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { invoiceNumber } = useParams<{ invoiceNumber?: string }>();
  const state = location.state as LocationState & { mobile?: string; eMail?: string };
  const isMobile = useIsMobile();
  
  // Activity tracking para captura de huella digital
  const {
    trackPageView,
    trackCheckoutStart,
    trackPaymentAttempt,
    trackPaymentSuccess,
    trackPaymentFailed
  } = useActivityTracking(state?.clientCode || invoiceNumber);
  
  const [isOpen, setIsOpen] = useState(() => !isMobile); // Estado inicial basado en tamaño de pantalla
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'yappy' | 'paypal' | 'ach'>('card');
  const [showACHModal, setShowACHModal] = useState(false);
  
  // Configurar el estado inicial del colapso según el dispositivo y hacer scroll en móvil
  useEffect(() => {
    let isMounted = true;
    
    if (isMounted) {
      setIsOpen(!isMobile); // Oculto en móvil, visible en escritorio
    }
    
    // Auto-scroll a métodos de pago solo en móvil
    if (isMobile && paymentMethodsRef.current && isMounted) {
      // Pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        if (isMounted) {
          paymentMethodsRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center'
          });
        }
      }, 300);
    }
    
    return () => {
      isMounted = false;
    };
  }, [isMobile]); // Incluir isMobile en dependencias para evitar error React #310
  
  // Manejar retorno desde cancelación de PayPal
  useEffect(() => {
    let isMounted = true; // Flag para evitar setState en componente desmontado
    
    const urlParams = new URLSearchParams(window.location.search);
    const isPayPalCancel = urlParams.get('paypal_cancel') === 'true';
    
    if (isPayPalCancel && isMounted) {
      // Restaurar estado desde sessionStorage
      const savedState = sessionStorage.getItem('paypalCancelReturnState');
      if (savedState && isMounted) {
        try {
          const parsedState = JSON.parse(savedState);
          setInvoiceState(parsedState);
          
          // ¡CRÍTICO! Preservar estado de autenticación en sessionStorage para otros componentes
          if (parsedState.revisarEstadoCuenta !== undefined) {
            sessionStorage.setItem('userAuthenticated', parsedState.revisarEstadoCuenta.toString());
          }
          
          sessionStorage.removeItem('paypalCancelReturnState');
          
          // Limpiar la URL
          window.history.replaceState({}, '', '/invoice-details');
          
          toast.info('Pago con PayPal cancelado. Puedes seleccionar otro método de pago.');
          
          console.log('🔄 Estado de PayPal restaurado correctamente:', {
            autenticado: parsedState.revisarEstadoCuenta,
            facturas: parsedState.invoiceDataList?.length
          });
        } catch (error) {
          console.error('Error al restaurar estado de PayPal:', error);
          toast.error('Error al restaurar el estado. Por favor, intenta de nuevo.');
        }
      } else if (isMounted) {
        // Si no hay estado guardado, mostrar mensaje de ayuda
        toast.warning('No se pudo restaurar el estado anterior. Por favor, busca tu cliente nuevamente.');
      }
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Credit card states
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  
  // Yappy states
  const [yappyPhone, setYappyPhone] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Visibility toggles
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [showExpiryDate, setShowExpiryDate] = useState(false);
  
  // Payment methods configuration
  const [paymentMethods, setPaymentMethods] = useState<CompanyPaymentMethods | null>(null);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  
  // States para cargar factura por parámetro
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [invoiceState, setInvoiceState] = useState<LocationState & { mobile?: string; eMail?: string } | null>(null);
  
  // Refs
  const yappyBtnRef = useRef<HTMLDivElement>(null);
  const paymentMethodsRef = useRef<HTMLDivElement>(null);
  const isPaymentInProgress = useRef(false); // Ref adicional para prevenir doble procesamiento

  // Usar el state original o el simulado
  const currentState = state || invoiceState;

  // Efecto para cargar las formas de pago disponibles para la empresa
  useEffect(() => {
    const loadPaymentMethods = async () => {
      // Obtener el código de empresa desde las facturas seleccionadas
      const empresaCode = currentState?.empresaSeleccionada || currentState?.invoiceDataList?.[0]?.invoiceNumber?.split('-')?.[0];
      
      if (!empresaCode) {
        console.warn('No se pudo determinar el código de empresa');
        setLoadingPaymentMethods(false);
        return;
      }

      try {
        console.log(`Cargando formas de pago para empresa: ${empresaCode}`);
        const response = await clienteService.getPaymentMethodsByCompany(empresaCode);
        
        if (response.success && response.data) {
          setPaymentMethods(response.data);
          
          // Configurar el método de pago por defecto según lo que esté habilitado
          const methods = response.data.paymentMethods;
          if (methods.creditCard.enabled) {
            setPaymentMethod('card');
          } else if (methods.yappy.enabled) {
            setPaymentMethod('yappy');
          } else if (methods.paypal?.enabled) {
            setPaymentMethod('paypal');
          } else if (methods.ach.enabled) {
            setPaymentMethod('ach');
          }
        } else {
          console.error('Error al obtener formas de pago:', response);
          toast.error('No se pudieron cargar las formas de pago disponibles');
        }
      } catch (error) {
        console.error('Error al cargar formas de pago:', error);
        toast.error('Error al cargar las formas de pago');
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    loadPaymentMethods();
  }, [currentState?.empresaSeleccionada, currentState?.invoiceDataList]);

  // Efecto para hacer scroll cuando los métodos de pago terminen de cargar en móvil
  useEffect(() => {
    let isMounted = true;
    
    if (!loadingPaymentMethods && isMobile && paymentMethodsRef.current && isMounted) {
      // Pequeño delay para asegurar que el DOM esté completamente renderizado
      setTimeout(() => {
        if (isMounted) {
          paymentMethodsRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
          });
        }
      }, 100);
    }
    
    return () => {
      isMounted = false;
    };
  }, [loadingPaymentMethods, isMobile]);

  useEffect(() => {
    // Cargar el script de Yappy solo una vez
    if (!document.getElementById('yappy-cdn-script')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js';
      script.id = 'yappy-cdn-script';
      document.body.appendChild(script);
    }

    // Esperar a que el componente esté disponible en el DOM
    const interval = setInterval(() => {
      const btnyappy = document.querySelector('btn-yappy') as any;
      if (btnyappy) {
        // Evento de click: crear orden en backend
        btnyappy.addEventListener('eventClick', async () => {
          try {
            btnyappy.isButtonLoading = true;
            const aliasYappy = yappyPhone;
            
            const nowEpoch = Math.floor(Date.now() / 1000);
            const total = currentState.totalAmount.toFixed(2);
            const body = {
              orderId: currentState.invoiceDataList[0].invoiceNumber,
              domain: "http://portal.celero.net",
              paymentDate: nowEpoch,
              aliasYappy: aliasYappy,
              ipnUrl: `${window.location.origin}/api/clientes/yappy/ipn`,
              discount: "0.00",
              taxes: "0.00",
              subtotal: total,
              total: total
            };
            const result = await pagoService.crearOrdenYappy(body);
            if (result && result.body?.token && result.body?.documentName && result.body?.transactionId) {
              const params = {
                transactionId: result.body.transactionId,
                documentName: result.body.documentName,
                token: result.body.token
              };
              btnyappy.eventPayment(params);
            } else {
              toast.error('No se pudo crear la orden de Yappy');
            }
          } catch (error) {
            toast.error('Error al crear la orden de Yappy');
          } finally {
            btnyappy.isButtonLoading = false;
          }
        });
        
        btnyappy.addEventListener('eventSuccess', async (event: any) => {
          const facturesDetail = currentState.invoiceDataList.map(inv => 
            `${inv.invoiceNumber}: $${formatCurrency(inv.amount)}`
          ).join(', ');
          
          toast.success('¡Pago Yappy realizado con éxito!', {
            description: `Facturas pagadas: ${facturesDetail}. Total: $${formatCurrency(currentState.totalAmount)}`,
            duration: 5000,
          });
          
          try {
            const orderId = event?.detail?.orderId || currentState.invoiceDataList[0].invoiceNumber;
            const recibo = {
              serNr: orderId,
              transDate: new Date().toISOString().slice(0, 10),
              payMode: 'YP',
              person: currentState.invoiceDataList[0].clientName || '',
              cuCode: currentState.invoiceDataList[0].clientCode || '',
              refStr: orderId,
              email: currentState.eMail, // Agregar email del cliente para notificación
              detalles: currentState.invoiceDataList.map(inv => ({
                invoiceNr: inv.invoiceNumber,
                sum: inv.amount, // Usar número directamente
                objects: '', // Agregar campos requeridos
                stp: '1'     // Agregar campos requeridos
              }))
            };

            const resultado = await pagoService.crearRecibo(recibo);
            if (resultado.success) {
              navigate('/payment-confirmation', {
                state: {
                  clientName: currentState.invoiceDataList[0].clientName,
                  clientCode: currentState.invoiceDataList[0].clientCode,
                  invoiceNumbers: currentState.invoiceDataList.map(inv => inv.invoiceNumber).join(', '),
                  amount: currentState.totalAmount,
                  paymentMethod: 'YAPPY',
                  receiptNumber: resultado.data?.SerNr,
                  invoiceData: currentState.invoiceDataList.map(inv => ({
                    ...inv,
                    status: 'pagado'
                  }))
                }
              });
            } else {
              toast.error(resultado.message || 'Error al crear el recibo de caja');
            }
          } catch (error) {
            await trackPaymentFailed('yappy', currentState.totalAmount, 'USD', 'RECEIPT_CREATION_ERROR');
            console.error('Error al crear recibo:', error);
            toast.error('Pago exitoso, pero error al crear recibo');
          }
        });
        
        btnyappy.addEventListener('eventError', (event) => {
          toast.error('Error en el pago con Yappy');
        });
        clearInterval(interval);
      }
    }, 300);
    
    return () => {
      clearInterval(interval);
    };
  }, [currentState, yappyPhone, navigate, trackPaymentSuccess, trackPaymentFailed]);
  
  // Efecto para cargar factura cuando se pasa como parámetro
  useEffect(() => {
    // Track page view para captura de huella digital
    trackPageView('invoice_details', {
      invoiceNumber: invoiceNumber || state?.numero_factura,
      clientCode: state?.codigo_cliente,
      amount: state?.saldo_pendiente
    });
    
    const loadInvoiceByNumber = async () => {
      if (!invoiceNumber || state?.invoiceDataList) {
        // Si no hay parámetro o ya tenemos datos del state, no hacer nada
        return;
      }
      
      setLoadingInvoice(true);
      try {
        // Extraer código de cliente del número de factura
        // Formato esperado: EMPRESA-NUMERO o similar
        const clientCode = invoiceNumber.split('-')[0] || invoiceNumber.substring(0, 3);
        
        // Buscar el cliente primero
        const clientResponse = await clienteService.getCliente(clientCode);
        if (!clientResponse.data?.CUVc?.length) {
          toast.error('No se encontró información del cliente para esta factura');
          navigate('/');
          return;
        }
        
        const clientData = clientResponse.data.CUVc[0];
        
        // Buscar facturas abiertas del cliente
        const facturasResponse = await clienteService.getFacturasAbiertas(clientCode);
        if (!facturasResponse.data?.facturas?.length) {
          toast.error('No se encontraron facturas pendientes para este cliente');
          navigate('/');
          return;
        }
        
        // Filtrar la factura específica
        const facturaEspecifica = facturasResponse.data.facturas.find(
          (f: any) => f.invoiceNumber === invoiceNumber || f.numero === invoiceNumber
        );
        
        if (!facturaEspecifica) {
          toast.error(`No se encontró la factura ${invoiceNumber} en las facturas pendientes`);
          navigate('/');
          return;
        }
        
        // Convertir datos al formato esperado
        const invoiceData: InvoiceData = {
          clientName: clientData.Name,
          clientCode: clientData.Code,
          serviceType: 'residential',
          invoiceNumber: facturaEspecifica.invoiceNumber || facturaEspecifica.numero,
          officialSerNr: facturaEspecifica.officialSerNr || '',
          payDeal: facturaEspecifica.payDeal || '',
          invDate: facturaEspecifica.invDate || facturaEspecifica.fecha,
          dueDate: facturaEspecifica.dueDate || facturaEspecifica.fechaVencimiento,
          amount: facturaEspecifica.amount || facturaEspecifica.monto,
          status: facturaEspecifica.status || facturaEspecifica.estado || 'pending'
        };
        
        // Determinar código de empresa
        const empresaCode = invoiceNumber.split('-')[0] || '2';
        
        // Crear state simulado
        const simulatedState: LocationState & { mobile?: string; eMail?: string } = {
          clientCode: clientData.Code,
          searchType: 'direct',
          invoiceDataList: [invoiceData],
          totalAmount: invoiceData.amount,
          empresaSeleccionada: empresaCode,
          mobile: clientData.Mobile,
          eMail: clientData.eMail
        };
        
        setInvoiceState(simulatedState);
        toast.success(`Factura ${invoiceNumber} cargada correctamente`);
        
      } catch (error) {
        console.error('Error al cargar factura:', error);
        toast.error('Error al cargar la información de la factura');
        navigate('/');
      } finally {
        setLoadingInvoice(false);
      }
    };
    
    loadInvoiceByNumber();
  }, [invoiceNumber, state, navigate, trackPageView]);
  
  // Debug: Verificar estado de autenticación
  console.log('🔍 InvoiceDetails - Estado de autenticación:', {
    revisarEstadoCuenta: currentState?.revisarEstadoCuenta,
    fromState: state?.revisarEstadoCuenta,
    fromInvoiceState: invoiceState?.revisarEstadoCuenta
  });
  
  // Si está cargando la factura por parámetro
  if (loadingInvoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Cargando factura {invoiceNumber}...</p>
        </div>
      </div>
    );
  }
  
  // Si no hay datos de factura y no es un retorno de PayPal, redirigir
  const urlParams = new URLSearchParams(window.location.search);
  const isPayPalReturn = urlParams.get('paypal_cancel') === 'true';
  
  if (!currentState?.invoiceDataList || currentState.invoiceDataList.length === 0) {
    // Si es un retorno de PayPal, esperar un momento para que se restaure el estado
    if (isPayPalReturn) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg">Restaurando información de pago...</p>
          </div>
        </div>
      );
    }
    navigate('/');
    return null;
  }
  
  // Utilidad para limpiar el número de celular
  function limpiarCelular(mobile?: string): string {
    if (!mobile) return '';
    
    // Quitar todo lo que no sea dígito
    const soloNumeros = mobile.replace(/\D/g, '');
    
    // Manejar varios formatos posibles:
    // 507XXXXXXXX (11 dígitos con código país)
    // 6XXXXXXX (8 dígitos sin código país)
    
    if (soloNumeros.length === 11 && soloNumeros.startsWith('507')) {
      return soloNumeros; // Ya tiene el formato correcto
    } else if (soloNumeros.length === 8 && soloNumeros.startsWith('6')) {
      return '507' + soloNumeros; // Agregar código país
    }
    
    return soloNumeros; // Devolver tal como está para otros casos
  }
  
  // Función para renderizar facturas como cards en móvil
  const renderMobileInvoiceCards = () => (
    <div className="space-y-3">
      {currentState.invoiceDataList.map((invoice, index) => (
        <Card key={index} className="p-4 shadow-sm border-gray-200">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Factura</p>
                <p className="font-medium text-black">{invoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Monto</p>
                <p className="font-bold text-lg text-black">${formatCurrency(invoice.amount)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-gray-500">Fecha emisión</p>
                <p className="text-sm text-gray-700">{parseLocalDate(invoice.invDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vencimiento</p>
                <p className="text-sm text-gray-700">{parseLocalDate(invoice.dueDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const handlePayPalPayment = async () => {
    setIsProcessing(true);
    
    // Track payment attempt
    await trackPaymentAttempt('paypal', currentState.totalAmount, 'USD');
    
    try {
      // Prepare PayPal order data
      const invoiceNumbers = currentState.invoiceDataList.map(inv => inv.invoiceNumber).join(', ');
      
      // Guardar estado actual para la cancelación de PayPal
      const cancelReturnState = {
        clientCode: currentState.invoiceDataList[0].clientCode,
        clientName: currentState.invoiceDataList[0].clientName,
        searchType: 'hogar',
        mobile: currentState.mobile,
        eMail: currentState.eMail,
        invoiceDataList: currentState.invoiceDataList,
        totalAmount: currentState.totalAmount,
        revisarEstadoCuenta: currentState.revisarEstadoCuenta, // ¡CRÍTICO! Preservar autenticación
        fromPayPalCancel: true
      };
      sessionStorage.setItem('paypalCancelReturnState', JSON.stringify(cancelReturnState));
      
      const orderRequest: PayPalCreateOrderRequest = {
        clienteCode: currentState.invoiceDataList[0].clientCode,
        numeroFactura: invoiceNumbers,
        amount: currentState.totalAmount,
        currency: 'USD',
        description: `Pago de facturas: ${invoiceNumbers}`,
        returnUrl: `${window.location.origin}/payment-confirmation?paypal=true`,
        cancelUrl: `${window.location.origin}/invoice-details?paypal_cancel=true`,
        emailCliente: currentState.eMail || undefined,
        nombreCliente: currentState.invoiceDataList[0].clientName,
        invoiceDetails: currentState.invoiceDataList.map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount
        }))
      };
      
      console.log('🔍 PayPal URLs configuradas:', {
        returnUrl: orderRequest.returnUrl,
        cancelUrl: orderRequest.cancelUrl,
        origin: window.location.origin
      });
      
      // Create PayPal order
      const orderResponse = await pagoService.crearOrdenPayPal(orderRequest);
      
      if (orderResponse.success && orderResponse.data) {
        // Track successful order creation
        await trackPaymentSuccess('paypal', currentState.totalAmount, 'USD', orderResponse.data.orderId);
        
        // Store invoice data in sessionStorage for later retrieval
        sessionStorage.setItem('paypalPaymentData', JSON.stringify({
          clientCode: currentState.invoiceDataList[0].clientCode,
          clientName: currentState.invoiceDataList[0].clientName,
          emailCliente: currentState.eMail || '',
          invoiceNumbers: invoiceNumbers,
          invoiceDataList: currentState.invoiceDataList,
          totalAmount: currentState.totalAmount,
          orderId: orderResponse.data.orderId
        }));
        
        // Redirect to PayPal
        window.location.href = orderResponse.data.approvalUrl;
      } else {
        // Track failed order creation
        await trackPaymentFailed('paypal', currentState.totalAmount, 'USD', 'ORDER_CREATION_FAILED');
        toast.error(orderResponse.message || 'Error al crear la orden de pago PayPal');
      }
    } catch (error) {
      // Track error
      await trackPaymentFailed('paypal', currentState.totalAmount, 'USD', 'API_ERROR');
      console.error('Error al procesar pago PayPal:', error);
      toast.error('Error al procesar el pago con PayPal');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handlePayment = async () => {
    // Prevenir doble click usando ref para respuesta inmediata
    if (isPaymentInProgress.current || isProcessing) {
      console.log('Pago ya en proceso, ignorando click duplicado');
      return;
    }
    
    // Marcar inmediatamente como en progreso
    isPaymentInProgress.current = true;
    
    // Track checkout start
    await trackCheckoutStart(paymentMethod, currentState.totalAmount, 'USD');
    
    if (paymentMethod === 'card') {
      // Validaciones existentes
      if (!cardNumber.trim()) {
        toast.error('Por favor ingrese el número de tarjeta');
        isPaymentInProgress.current = false;
        return;
      }
      if (!cardName.trim()) {
        toast.error('Por favor ingrese el nombre en la tarjeta');
        isPaymentInProgress.current = false;
        return;
      }
      if (!expiryDate.trim()) {
        toast.error('Por favor ingrese la fecha de expiración');
        isPaymentInProgress.current = false;
        return;
      }
      if (!cvv.trim()) {
        toast.error('Por favor ingrese el código de seguridad');
        isPaymentInProgress.current = false;
        return;
      }

      // Deshabilitar botón INMEDIATAMENTE
      setIsProcessing(true);
      
      // Track payment attempt
      await trackPaymentAttempt(paymentMethod, currentState.totalAmount, 'USD');
      
      try {
        // Construir el body para el endpoint
        const invoiceNumbers = currentState.invoiceDataList.map(inv => inv.invoiceNumber).join(', ');
        console.log('Email del cliente:', currentState.eMail);
        // Determinar el código de empresa desde las facturas seleccionadas
        const companyCode = currentState.empresaSeleccionada || currentState.invoiceDataList[0]?.invoiceNumber?.split('-')?.[0] || '2';
        console.log('Procesando pago Cobalt para empresa:', companyCode);
        
        const venta = {
          currency_code: 'USD',
          amount: Math.round(currentState.totalAmount * 100).toString(), // en centavos
          pan: cardNumber.replace(/\s+/g, ''),
          exp_date: expiryDate,
          cvv2: cvv,
          card_holder: cardName,
          tax: '0',
          tip: '0',
          // --- Campos adicionales para notificaciones y configuración ---
          customer_email: currentState.eMail || 'not-provided@celero.com',
          customer_name: currentState.invoiceDataList[0].clientName,
          order_id: invoiceNumbers,
          description: `Pago de facturas: ${invoiceNumbers}`,
          contract_number: currentState.invoiceDataList[0].clientCode,
          company_code: companyCode, // Código de empresa para credenciales Cobalt específicas
          InvoiceDetails: currentState.invoiceDataList.map(inv => ({
            InvoiceNumber: inv.invoiceNumber,
            Amount: inv.amount
          }))
        };
        const data = await pagoService.ventaTarjeta(venta);
        if (data.status === 'ok' && data.data?.status === 'authorized') {
          // PRIORIDAD: Pago autorizado - capturar authorization_number
          const authNumber = data.data.authorization_number || data.data.ballot || '';
          
          // Track payment success
          await trackPaymentSuccess(
            paymentMethod, 
            currentState.totalAmount, 
            'USD', 
            authNumber
          );
          
          // Crear mensaje detallado con facturas
          const facturesDetail = currentState.invoiceDataList.map(inv => 
            `${inv.invoiceNumber}: $${formatCurrency(inv.amount)}`
          ).join(', ');
          
          toast.success('¡Pago realizado con éxito!', {
            description: `Facturas pagadas: ${facturesDetail}. Total: $${formatCurrency(currentState.totalAmount)}`,
            duration: 5000,
          });
          
          // Intentar crear recibo pero NO bloquear la navegación si falla
          let receiptNumber = null;
          try {
            const recibo = {
              serNr: data.data.ballot || '',
              transDate: new Date().toISOString().slice(0, 10),
              payMode: 'TC',
              person: currentState.invoiceDataList[0].clientName || '',
              cuCode: currentState.invoiceDataList[0].clientCode || '',
              refStr: authNumber,
              email: currentState.eMail,
              detalles: currentState.invoiceDataList.map(inv => ({
                invoiceNr: inv.invoiceNumber,
                sum: inv.amount,
                objects: '',
                stp: '1'
              }))
            };
            const reciboData = await pagoService.crearRecibo(recibo);
            if (reciboData.success) {
              receiptNumber = reciboData.data?.SerNr;
            } else {
              console.error('Error creando recibo:', reciboData.message);
              // No mostrar error - el pago fue exitoso
            }
          } catch (err) {
            console.error('Error de conexión al crear recibo:', err);
            // No mostrar error - el pago fue exitoso
          }
          
          // SIEMPRE navegar a confirmación si el pago fue autorizado
          navigate('/payment-confirmation', { 
            state: {
              clientName: currentState.invoiceDataList[0].clientName,
              clientCode: currentState.invoiceDataList[0].clientCode,
              invoiceNumbers: currentState.invoiceDataList.map(inv => inv.invoiceNumber).join(', '),
              amount: currentState.totalAmount,
              paymentMethod: 'TARJETA',
              transactionId: authNumber, // Enviar authorization_number como transactionId
              receiptNumber: receiptNumber, // Puede ser null si falló el recibo
              invoiceData: currentState.invoiceDataList.map(inv => ({
                ...inv,
                status: 'pagado'
              }))
            }
          });
          
          // Resetear flags después de navegar
          setIsProcessing(false);
          isPaymentInProgress.current = false;
        } else {
          // Track payment failure with response message
          await trackPaymentFailed(
            paymentMethod, 
            currentState.totalAmount, 
            'USD', 
            data.data?.status || 'PAYMENT_DECLINED', 
            data.message || 'Payment was declined'
          );
          
          toast.error(data.message || 'Error procesando el pago');
        }
      } catch (err) {
        // Track payment failure for connection error
        await trackPaymentFailed(
          paymentMethod, 
          currentState.totalAmount, 
          'USD', 
          'CONNECTION_ERROR', 
          'Error de conexión con el procesador de pagos'
        );
        
        toast.error('Error de conexión con el procesador de pagos');
      } finally {
        setIsProcessing(false);
        isPaymentInProgress.current = false; // Resetear el ref
      }
      return;
    } else if (paymentMethod === 'yappy') {
      // Validate Yappy details
      if (!yappyPhone.trim()) {
        toast.error('Por favor ingrese el número de celular asociado a Yappy');
        isPaymentInProgress.current = false;
        return;
      }
      
      if (yappyPhone.length < 8) {
        toast.error('El número de celular debe tener al menos 8 dígitos');
        isPaymentInProgress.current = false;
        return;
      }
      
      setIsProcessing(true);
      
      // Track payment attempt
      await trackPaymentAttempt(paymentMethod, currentState.totalAmount, 'USD');
      
      try {
        // Crear solicitud Yappy con detalles de facturas
        const yappyRequest = {
          yappyPhone: yappyPhone,
          clienteCode: currentState.invoiceDataList[0].clientCode,
          emailCliente: currentState.eMail || '',
          invoiceDetails: currentState.invoiceDataList.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            amount: inv.amount
          }))
        };

        const data = await pagoService.crearOrdenYappyFrontend(yappyRequest);
        
        if (data.success) {
          // Track payment success
          await trackPaymentSuccess(
            paymentMethod, 
            currentState.totalAmount, 
            'USD', 
            data.data?.orderId || `YAPPY-${Date.now()}`
          );
          
          // Crear mensaje detallado con facturas
          const facturesDetail = currentState.invoiceDataList.map(inv => 
            `${inv.invoiceNumber}: $${inv.amount.toFixed(2)}`
          ).join(', ');
          
          toast.success('¡Pago Yappy realizado con éxito!', {
            description: `Facturas pagadas: ${facturesDetail}. Total: $${currentState.totalAmount.toFixed(2)}`,
            duration: 5000,
          });
          
          navigate('/payment-confirmation', { 
            state: {
              clientName: currentState.invoiceDataList[0].clientName,
              clientCode: currentState.invoiceDataList[0].clientCode,
              invoiceNumbers: currentState.invoiceDataList.map(inv => inv.invoiceNumber).join(', '),
              amount: currentState.totalAmount,
              paymentMethod: paymentMethod,
              transactionId: data.data?.orderId,
              receiptNumber: data.data?.receiptNumber,
              invoiceData: currentState.invoiceDataList.map(inv => ({
                ...inv,
                status: 'pagado'
              }))
            }
          });
        } else {
          // Track payment failure
          await trackPaymentFailed(
            paymentMethod, 
            currentState.totalAmount, 
            'USD', 
            data.message || 'Error en Yappy'
          );
          
          toast.error(data.message || 'Error al procesar el pago con Yappy');
        }
      } catch (error) {
        console.error('Error en pago Yappy:', error);
        
        // Track payment failure
        await trackPaymentFailed(
          paymentMethod, 
          currentState.totalAmount, 
          'USD', 
          'Error de conexión con Yappy'
        );
        
        toast.error('Error al conectar con Yappy. Por favor, intente nuevamente.');
      } finally {
        setIsProcessing(false);
        isPaymentInProgress.current = false; // Resetear el ref
      }
      return;
    }
    
    // Resetear el ref al final si llega aquí
    isPaymentInProgress.current = false;
  };
  
  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const val = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = val.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };
  
  // Format expiry date
  const formatExpiryDate = (value: string) => {
    const val = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (val.length > 2) {
      return `${val.substring(0, 2)}/${val.substring(2, 4)}`;
    }
    return val;
  };
  
  // Utilidad para parsear fechas locales (evita desfase por zona horaria)
  function parseLocalDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Declarar el custom element para evitar el error de JSX
  // @ts-ignore
  // eslint-disable-next-line
  const BtnYappy = (props: any) => <btn-yappy {...props} />;
  
  // Permitir que el usuario edite el campo yappyPhone manualmente
  const handleYappyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYappyPhone(e.target.value.replace(/\D/g, ''));
  };

  // Manejar confirmación de pago ACH
  const handleACHConfirm = async (files: any[]) => {
    try {
      toast.success('Registrando comprobantes ACH...');
      
      // Registrar cada archivo en SQLite
      const registrosExitosos = [];
      const errores = [];
      
      for (const file of files) {
        try {
          // Si es un pago global, registrar para cada factura
          if (file.isGlobal) {
            for (const invoice of currentState.invoiceDataList) {
              const pagoData = {
                clienteCode: invoice.clientCode,
                numeroFactura: invoice.invoiceNumber,
                empresaCode: invoice.empresaCode || '1', // Usar código por defecto si no existe
                numeroTransaccion: file.numeroTransaccion,
                montoTransaccion: invoice.amount,
                fechaTransaccion: file.fechaTransaccion,
                observaciones: file.observaciones || `Pago global - Archivo: ${file.file.name}`,
                usuarioRegistro: 'Cliente',
                fotoComprobante: file.file
              };
              
              const resultado = await clienteService.registrarPagoACH(pagoData);
              registrosExitosos.push({
                factura: invoice.invoiceNumber,
                pagoId: resultado.pagoId
              });
            }
          } else {
            // Pago individual - buscar la factura correspondiente
            const invoice = currentState.invoiceDataList.find(inv => inv.invoiceNumber === file.invoiceId);
            if (invoice) {
              const pagoData = {
                clienteCode: invoice.clientCode,
                numeroFactura: invoice.invoiceNumber,
                empresaCode: invoice.empresaCode || '1',
                numeroTransaccion: file.numeroTransaccion,
                montoTransaccion: invoice.amount,
                fechaTransaccion: file.fechaTransaccion,
                observaciones: file.observaciones || `Pago individual - Archivo: ${file.file.name}`,
                usuarioRegistro: 'Cliente',
                fotoComprobante: file.file
              };
              
              const resultado = await clienteService.registrarPagoACH(pagoData);
              registrosExitosos.push({
                factura: invoice.invoiceNumber,
                pagoId: resultado.pagoId
              });
            }
          }
        } catch (error) {
          console.error('Error al registrar archivo:', file.file.name, error);
          errores.push({
            archivo: file.file.name,
            error: error.message
          });
        }
      }
      
      // Mostrar resultados
      if (registrosExitosos.length > 0) {
        // Crear mensaje detallado con facturas
        const facturesDetail = currentState.invoiceDataList.map(inv => 
          `${inv.invoiceNumber}: $${inv.amount.toFixed(2)}`
        ).join(', ');
        
        toast.success(`¡Pago ACH realizado con éxito!`, {
          description: `${registrosExitosos.length} comprobantes registrados. Facturas: ${facturesDetail}. Total: $${formatCurrency(currentState.totalAmount)}`,
          duration: 5000,
        });
        
        // Crear recibo de caja en el ERP
        const recibo = {
          serNr: `ACH-${Date.now()}`,
          transDate: new Date().toISOString().slice(0, 10),
          payMode: 'ACH',
          person: currentState.invoiceDataList[0].clientName || '',
          cuCode: currentState.invoiceDataList[0].clientCode || '',
          refStr: `ACH-${files[0]?.numeroTransaccion} - ${registrosExitosos.length} comprobantes`,
          // No enviar email para ACH - se excluye automáticamente en el backend
          detalles: currentState.invoiceDataList.map(inv => ({
            invoiceNr: inv.invoiceNumber,
            sum: inv.amount, // Usar número directamente
            objects: '',
            stp: '1'
          }))
        };
        
        const reciboData = await pagoService.crearRecibo(recibo);
        if (!reciboData.success) {
          toast.error(reciboData.message || 'Error al crear el recibo de caja');
          return;
        }

        // Navegar a confirmación
        navigate('/payment-confirmation', {
          state: {
            clientName: currentState.invoiceDataList[0].clientName,
            clientCode: currentState.invoiceDataList[0].clientCode,
            invoiceNumbers: currentState.invoiceDataList.map(inv => inv.invoiceNumber).join(', '),
            amount: currentState.totalAmount,
            paymentMethod: 'ACH',
            numeroTransaccion: files[0]?.numeroTransaccion,
            comprobantesRegistrados: registrosExitosos.length,
            receiptNumber: reciboData.data?.SerNr, // Número de recibo del ERP
            invoiceData: currentState.invoiceDataList.map(inv => ({
              ...inv,
              status: 'pagado'
            }))
          }
        });
      }
      
      if (errores.length > 0) {
        toast.error(`Error en ${errores.length} archivos. Revise los datos e intente nuevamente.`);
        console.error('Errores en archivos:', errores);
      }
      
    } catch (error) {
      console.error('Error al procesar el pago ACH:', error);
      toast.error('Error al procesar el pago ACH');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <BillPayHeader />
      
      <main className={`flex-1 container max-w-4xl py-6 ${isMobile ? 'px-3' : 'px-4'}`}>
        <div className="mb-6">
          <button 
            onClick={() => navigate('/invoice-list', { state: { clientCode: currentState.clientCode, searchType: currentState.searchType } })} 
            className="flex items-center text-billpay-blue hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            REGRESAR
          </button>
        </div>
        
        <h1 className="text-2xl font-bold text-black mb-6">Detalles de pago</h1>
        
        <div className={`${isMobile ? 'space-y-6' : 'grid md:grid-cols-3 gap-6'}`}>
          <div className={`${isMobile ? '' : 'md:col-span-2'}`}>
            <Card className={`${isMobile ? 'p-4' : 'p-6'} shadow-sm border-gray-100 mb-6`}>
              <div className="mb-6">
                <h2 className="text-xl text-black font-medium mb-4">Resumen de facturas</h2>
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                  <CollapsibleTrigger className="flex w-full justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <p className="text-black font-medium">{currentState.invoiceDataList.length} # Facturas:</p>
                    <div className="text-sm text-gray-500">{isOpen ? 'Ocultar' : 'Mostrar'}</div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {isMobile ? (
                      <div className="mt-4">
                        {renderMobileInvoiceCards()}
                      </div>
                    ) : (
                      <div className="overflow-x-auto mt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Factura</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Vencimiento</TableHead>
                              <TableHead>Monto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentState.invoiceDataList.map((invoice, index) => (
                              <TableRow key={index}>
                                <TableCell>{invoice.invoiceNumber}</TableCell>
                                <TableCell>{parseLocalDate(invoice.invDate).toLocaleDateString()}</TableCell>
                                <TableCell>{parseLocalDate(invoice.dueDate).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium">${formatCurrency(invoice.amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
              
              <div className="flex justify-between py-3 border-t border-b mb-6">
                <span className="font-medium">Total a pagar:</span>
                <span className="text-xl font-bold text-black">${formatCurrency(currentState.totalAmount)}</span>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pagar con:
                </h3>
                
                {/* Payment Method Selection */}
                <div 
                  ref={paymentMethodsRef}
                  className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}
                >
                  <button
                    onClick={() => setPaymentMethod('card')}
                    disabled={loadingPaymentMethods || !paymentMethods?.paymentMethods?.creditCard?.enabled}
                    className={`${isMobile ? 'p-4' : 'p-2.5'} border-2 rounded-lg flex flex-col items-center justify-center space-y-1 transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-billpay-blue bg-blue-50'
                        : paymentMethods?.paymentMethods?.creditCard?.enabled
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                    title={paymentMethods?.paymentMethods?.creditCard?.enabled ? 
                      paymentMethods.paymentMethods.creditCard.displayName : 
                      'Tarjeta de crédito no disponible para esta empresa'}
                  >
                    <CreditCard className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`} />
                    <span className={`${isMobile ? 'text-xs text-center' : 'text-sm'}`}>
                      {paymentMethods?.paymentMethods?.creditCard?.displayName || 'Tarjeta de crédito'}
                    </span>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('yappy')}
                    disabled={loadingPaymentMethods || !paymentMethods?.paymentMethods?.yappy?.enabled}
                    className={`${isMobile ? 'p-4' : 'p-2.5'} border-2 rounded-lg flex flex-col items-center justify-center space-y-1 transition-colors ${
                      paymentMethod === 'yappy'
                        ? 'border-orange-500 bg-orange-50'
                        : paymentMethods?.paymentMethods?.yappy?.enabled
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                    title={paymentMethods?.paymentMethods?.yappy?.enabled ? 
                      paymentMethods.paymentMethods.yappy.displayName : 
                      'Yappy no disponible para esta empresa'}
                  >
                    <Smartphone className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`} />
                    <span className={`${isMobile ? 'text-xs text-center' : 'text-sm'}`}>
                      {paymentMethods?.paymentMethods?.yappy?.displayName || 'Yappy'}
                    </span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('paypal')}
                    disabled={loadingPaymentMethods || !paymentMethods?.paymentMethods?.paypal?.enabled}
                    className={`${isMobile ? 'p-4' : 'p-2.5'} border-2 rounded-lg flex flex-col items-center justify-center space-y-1 transition-colors ${
                      paymentMethod === 'paypal'
                        ? 'border-blue-600 bg-blue-50'
                        : paymentMethods?.paymentMethods?.paypal?.enabled
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                    title={paymentMethods?.paymentMethods?.paypal?.enabled ? 
                      paymentMethods.paymentMethods.paypal.displayName : 
                      'PayPal no disponible para esta empresa'}
                  >
                    <Wallet className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`} />
                    <span className={`${isMobile ? 'text-xs text-center' : 'text-sm'}`}>
                      {paymentMethods?.paymentMethods?.paypal?.displayName || 'PayPal'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setPaymentMethod('ach');
                      setShowACHModal(true);
                    }}
                    disabled={loadingPaymentMethods || !paymentMethods?.paymentMethods?.ach?.enabled}
                    className={`${isMobile ? 'p-4' : 'p-2.5'} border-2 rounded-lg flex flex-col items-center justify-center space-y-1 transition-colors ${
                      paymentMethod === 'ach'
                        ? 'border-green-500 bg-green-50'
                        : paymentMethods?.paymentMethods?.ach?.enabled
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                    title={paymentMethods?.paymentMethods?.ach?.enabled ? 
                      paymentMethods.paymentMethods.ach.displayName : 
                      'ACH no disponible para esta empresa'}
                  >
                    <Building2 className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`} />
                    <span className={`${isMobile ? 'text-xs text-center' : 'text-sm'}`}>
                      {paymentMethods?.paymentMethods?.ach?.displayName || 'ACH'}
                    </span>
                  </button>
                </div>
                
                {/* Mensaje de carga o empresa */}
                {loadingPaymentMethods && (
                  <div className="text-center text-gray-500 mb-4">
                    <div className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-billpay-blue rounded-full mr-2"></div>
                    Cargando formas de pago...
                  </div>
                )}
                
                {paymentMethods && !loadingPaymentMethods && (
                  <div className="text-center text-gray-600 mb-4">
                    <span className="text-sm">
                      Formas de pago para {paymentMethods.companyName}
                    </span>
                  </div>
                )}
                
                {/* Credit Card Form */}
                {paymentMethod === 'card' && (
                  <form onSubmit={e => { 
                    e.preventDefault(); 
                    if (!isProcessing) {
                      handlePayment();
                    }
                  }}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="cardNumber">Número de tarjeta</Label>
                        <div className="relative">
                          <Input
                            id="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            maxLength={19}
                            type={showCardNumber ? "text" : "password"}
                            className={`pr-10 ${isMobile ? 'h-12 text-lg' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCardNumber(!showCardNumber)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                          >
                            {showCardNumber ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="cardName">Nombre en la tarjeta</Label>
                        <Input
                          id="cardName"
                          placeholder="John Doe"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className={`${isMobile ? 'h-12 text-lg' : ''}`}
                        />
                      </div>
                      
                      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        <div>
                          <Label htmlFor="expiryDate">Fecha de expiración (MM/YY)</Label>
                          <div className="relative">
                            <Input
                              id="expiryDate"
                              placeholder="MM/YY"
                              value={expiryDate}
                              onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                              maxLength={5}
                              type={showExpiryDate ? "text" : "password"}
                              className={`pr-10 ${isMobile ? 'h-12 text-lg' : ''}`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowExpiryDate(!showExpiryDate)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                            >
                              {showExpiryDate ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="cvv">Código de seguridad (CVV)</Label>
                          <div className="relative">
                            <Input
                              id="cvv"
                              placeholder="123"
                              value={cvv}
                              onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                              maxLength={4}
                              type={showCvv ? "text" : "password"}
                              className={`pr-10 ${isMobile ? 'h-12 text-lg' : ''}`}
                            />
                            <button 
                              type="button"
                              onClick={() => setShowCvv(!showCvv)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                            >
                              {showCvv ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Checkbox de guardar tarjeta - Oculto temporalmente
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="saveCard" 
                          checked={saveCard}
                          onCheckedChange={(checked) => setSaveCard(checked as boolean)}
                        />
                        <Label htmlFor="saveCard" className={`${isMobile ? 'text-sm' : 'text-sm'} cursor-pointer`}>
                          Guardar esta tarjeta para futuros pagos
                        </Label>
                      </div>
                      */}
                      {/* Botón de pagar solo visible en método tarjeta */}
                      <div className="flex justify-center">
                        <Button
                          type="submit"
                          className={`bg-gradient-to-r from-billpay-cyan to-blue-500 hover:from-billpay-cyan/90 hover:to-blue-500/90 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${
                            isMobile 
                              ? 'w-full h-12 text-base px-6 py-3' 
                              : 'px-6 md:px-10 py-4 md:py-7 text-base md:text-lg w-[135%] sm:w-auto h-12 md:h-14'
                          } mt-4`}
                          size="lg"
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Procesando...' : 'Realizar Pago'}
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
                
                {/* Yappy Form */}
                {paymentMethod === 'yappy' && (
                  <form onSubmit={e => { e.preventDefault(); handlePayment(); }}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="yappyPhone">Número de celular asociado a Yappy</Label>
                        <Input
                          id="yappyPhone"
                          placeholder="Ej: 60000000"
                          value={yappyPhone}
                          onChange={handleYappyPhoneChange}
                          maxLength={8}
                          className={`${isMobile ? 'text-lg h-12' : 'text-lg'}`}
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Ingrese su número de celular sin espacios ni guiones
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <BtnYappy 
                          theme="orange" 
                          rounded="true" 
                          style={{ width: isMobile ? '80%' : '50%', minHeight: isMobile ? '48px' : 'auto' }} 
                        />
                      </div>
                      <div className={`bg-orange-50 border border-orange-200 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                        <p className={`${isMobile ? 'text-sm' : 'text-sm'} text-orange-800`}>
                          <strong>Instrucciones:</strong><br/>
                          1. Haz clic en el botón "Pagar con Yappy"<br/>
                          2. Se abrirá la aplicación Yappy en tu dispositivo<br/>
                          3. Confirma el pago en la aplicación Yappy
                        </p>
                      </div>
                    </div>
                    
                  </form>
                )}
                
                {/* PayPal Form */}
                {paymentMethod === 'paypal' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Pago con PayPal:</strong><br/>
                        Será redirigido a PayPal para completar su pago de forma segura.
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <Button
                        onClick={handlePayPalPayment}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6 md:px-10 py-4 md:py-7 rounded-full text-base md:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-[135%] sm:w-auto h-12 md:h-14"
                        size="lg"
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Procesando...' : 'Pagar con PayPal'}
                      </Button>
                    </div>
                    <div className="text-center text-gray-600 text-sm">
                      <p>Serás redirigido a PayPal para completar el pago</p>
                      <p className="mt-1">Monto total: <strong>${formatCurrency(currentState.totalAmount)}</strong></p>
                    </div>
                  </div>
                )}
                
              </div>
            </Card>
            

          </div>
          
          <div>
            <Card className={`${isMobile ? 'p-4' : 'p-6'} shadow-sm border-gray-100`}>
              <h3 className={`${isMobile ? 'text-lg' : 'text-lg'} font-medium mb-4`}>Información del cliente</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Cliente:</p>
                  <p className="font-medium">{currentState.invoiceDataList[0].clientName}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Código de cliente:</p>
                  <p className="font-medium">{currentState.invoiceDataList[0].clientCode}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Tipo de servicio:</p>
                  <p className="font-medium capitalize">residencial</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium mb-2">Resumen</h4>
                
                <div className="flex justify-between py-1">
                  <span className="text-gray-500"># Facturas:</span>
                  <span>{currentState.invoiceDataList.length}</span>
                </div>
                
                <div className="flex justify-between py-1 border-t mt-2 pt-2">
                  <span className="font-medium">Total:</span>
                  <span className={`font-bold text-black ${isMobile ? 'text-lg' : ''}`}>${formatCurrency(currentState.totalAmount)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Modal de pago ACH */}
      <ACHPaymentModal
        isOpen={showACHModal}
        onClose={() => setShowACHModal(false)}
        invoices={currentState.invoiceDataList}
        totalAmount={currentState.totalAmount}
        onConfirm={handleACHConfirm}
      />
    </div>
  );
};

export default InvoiceDetails;