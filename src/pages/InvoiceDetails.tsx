import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { clienteService, pagoService, type CompanyPaymentMethods, type PayPalCreateOrderRequest } from '@/services';

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
}

const InvoiceDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState & { mobile?: string; eMail?: string };
  
  const [isOpen, setIsOpen] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'yappy' | 'paypal' | 'ach'>('card');
  const [showACHModal, setShowACHModal] = useState(false);
  
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
  
  // Refs
  const yappyBtnRef = useRef<HTMLDivElement>(null);
  
  // If there's no invoice data, redirect to the invoice list page
  if (!state?.invoiceDataList || state.invoiceDataList.length === 0) {
    navigate('/invoice-list');
    return null;
  }
  
  // Utilidad para limpiar el número de celular
  function limpiarCelular(mobile?: string): string {
    if (!mobile) return '';
    
    // Quitar todo lo que no sea dígito
    const soloNumeros = mobile.replace(/\D/g, '');
    
    // Manejar varios formatos posibles:
    
    // 1. Si es un número internacional completo (ej: +50769387770)
    if (soloNumeros.startsWith('507') && soloNumeros.length >= 11) {
      return soloNumeros.substring(3, 11); // Tomar los 8 dígitos después del prefijo país
    }
    
    // 2. Si es un número con formato local (ej: 69387770)
    if (soloNumeros.length === 8) {
      return soloNumeros;
    }
    
    // 3. Si es un número con otro formato, intentar tomar los últimos 8 dígitos
    return soloNumeros.slice(-8);
  }

  // Efecto para cargar las formas de pago disponibles para la empresa
  useEffect(() => {
    const loadPaymentMethods = async () => {
      // Obtener el código de empresa desde las facturas seleccionadas
      const empresaCode = state?.empresaSeleccionada || state?.invoiceDataList?.[0]?.invoiceNumber?.split('-')?.[0];
      
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
  }, [state?.empresaSeleccionada, state?.invoiceDataList]);

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
            // Limpiar y loguear el móvil justo antes de crear la orden
            let aliasYappy = yappyPhone;
            if (state?.mobile) {
              aliasYappy = limpiarCelular(state.mobile);
              setYappyPhone(aliasYappy); // sincroniza el input visual
            }
            // Construir el body según la documentación YappyOrdenRequest
            const nowEpoch = Math.floor(Date.now() / 1000);
            const total = state.totalAmount.toFixed(2);
            const body = {
              orderId: state.invoiceDataList[0].invoiceNumber, // o un id único de orden
              domain: "https://selfservice-dev.celero.network", // URL de dominio configurado en Yappy Comercial
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
        // Eventos de éxito y error
        btnyappy.addEventListener('eventSuccess', async (event: any) => {
          toast.success('Pago Yappy realizado con éxito');
          // Crear recibo de caja con Forma de Pago 'YP' y RefStr = orderId
          try {
            const orderId = event?.detail?.orderId || state.invoiceDataList[0].invoiceNumber;
            const recibo = {
              serNr: orderId, // Usar orderId como serNr para trazabilidad
              transDate: new Date().toISOString().slice(0, 10),
              payMode: 'YP',
              person: state.invoiceDataList[0].clientName || '',
              cuCode: state.invoiceDataList[0].clientCode || '',
              refStr: orderId,
              detalles: state.invoiceDataList.map(inv => ({
                invoiceNr: inv.invoiceNumber,
                sum: inv.amount.toFixed(2),
                objects: '',
                stp: '1'
              }))
            };
            const reciboData = await pagoService.crearRecibo(recibo);
            if (!reciboData.success) {
              toast.error(reciboData.message || 'Error al crear el recibo de caja');
              return;
            }
            navigate('/payment-confirmation', {
              state: {
                clientName: state.invoiceDataList[0].clientName,
                clientCode: state.invoiceDataList[0].clientCode,
                invoiceNumbers: state.invoiceDataList.map(inv => inv.invoiceNumber).join(', '),
                amount: state.totalAmount,
                paymentMethod: 'YAPPY',
                invoiceData: state.invoiceDataList.map(inv => ({
                  ...inv,
                  status: 'pagado' // Marcar como pagada
                }))
              }
            });
          } catch (err) {
            toast.error('Error de conexión al crear el recibo de caja');
          }
        });
        btnyappy.addEventListener('eventError', (event) => {
          toast.error('Error en el pago con Yappy');
        });
        clearInterval(interval);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [state, yappyPhone]);
  
  // Al cargar la página, prellenar el móvil si hay datos disponibles
  useEffect(() => {
    // Asegurémonos de que stateMobile sea un string o undefined, no null
    const stateMobile = state?.mobile || undefined;
    
    if (!yappyPhone && stateMobile) {
      const cleaned = limpiarCelular(stateMobile);
      
      if (cleaned.length > 0) {
        setYappyPhone(cleaned);
      }
    } else if (!stateMobile) {
      // Si no hay número móvil en el state, asignar un valor predeterminado para facilitar las pruebas
      const defaultMobile = '69387770';
      setYappyPhone(defaultMobile);
    }
  }, []);

  // Prellenar el campo yappyPhone cada vez que el usuario cambie a Yappy
  useEffect(() => {
    if (paymentMethod === 'yappy' && !yappyPhone) {
      // Si tenemos un número en el state, usarlo
      if (state?.mobile) {
        const cleaned = limpiarCelular(state.mobile);
        
        if (cleaned.length > 0) {
          setYappyPhone(cleaned);
        }
      } 
      // Si no hay número en el state, usar un valor predeterminado
      else {
        const defaultMobile = '69387770';
        setYappyPhone(defaultMobile);
      }
    }
  }, [paymentMethod]);
  
  const handlePayPalPayment = async () => {
    setIsProcessing(true);
    
    try {
      // Prepare PayPal order data
      const invoiceNumbers = state.invoiceDataList.map(inv => inv.invoiceNumber).join(', ');
      const orderRequest: PayPalCreateOrderRequest = {
        clienteCode: state.invoiceDataList[0].clientCode,
        numeroFactura: invoiceNumbers,
        amount: state.totalAmount,
        currency: 'USD',
        description: `Pago de facturas: ${invoiceNumbers}`,
        returnUrl: `${window.location.origin}/payment-confirmation?paypal=true`,
        cancelUrl: `${window.location.origin}/invoice-details`,
        emailCliente: state.eMail || undefined,
        nombreCliente: state.invoiceDataList[0].clientName
      };
      
      // Create PayPal order
      const orderResponse = await pagoService.crearOrdenPayPal(orderRequest);
      
      if (orderResponse.success && orderResponse.data) {
        // Store invoice data in sessionStorage for later retrieval
        sessionStorage.setItem('paypalPaymentData', JSON.stringify({
          clientCode: state.invoiceDataList[0].clientCode,
          clientName: state.invoiceDataList[0].clientName,
          invoiceNumbers: invoiceNumbers,
          invoiceDataList: state.invoiceDataList,
          totalAmount: state.totalAmount,
          orderId: orderResponse.data.orderId
        }));
        
        // Redirect to PayPal
        window.location.href = orderResponse.data.approvalUrl;
      } else {
        toast.error(orderResponse.message || 'Error al crear la orden de pago PayPal');
      }
    } catch (error) {
      console.error('Error al procesar pago PayPal:', error);
      toast.error('Error al procesar el pago con PayPal');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handlePayment = async () => {
    if (paymentMethod === 'card') {
      // Validaciones existentes
      if (!cardNumber.trim()) {
        toast.error('Por favor ingrese el número de tarjeta');
        return;
      }
      if (!cardName.trim()) {
        toast.error('Por favor ingrese el nombre en la tarjeta');
        return;
      }
      if (!expiryDate.trim()) {
        toast.error('Por favor ingrese la fecha de expiración');
        return;
      }
      if (!cvv.trim()) {
        toast.error('Por favor ingrese el código de seguridad');
        return;
      }

      setIsProcessing(true);
      try {
        // Construir el body para el endpoint
        const invoiceNumbers = state.invoiceDataList.map(inv => inv.invoiceNumber).join(', ');
        console.log('Email del cliente:', state.eMail);
        const venta = {
          currency_code: 'USD',
          amount: Math.round(state.totalAmount * 100).toString(), // en centavos
          pan: cardNumber.replace(/\s+/g, ''),
          exp_date: expiryDate,
          cvv2: cvv,
          card_holder: cardName,
          tax: '0',
          tip: '0',
          // --- Nuevos campos agregados ---
          customer_email: state.eMail || 'not-provided@celero.com',
          customer_name: state.invoiceDataList[0].clientName,
          order_id: invoiceNumbers,
          description: `Pago de facturas: ${invoiceNumbers}`,
          contract_number: state.invoiceDataList[0].clientCode
        };
        const data = await pagoService.ventaTarjeta(venta);
        if (data.status === 'ok' && data.data?.status === 'authorized') {
          toast.success('Pago realizado con éxito');
          // Crear recibo de caja
          try {
            const recibo = {
              serNr: data.data.ballot || '',
              transDate: new Date().toISOString().slice(0, 10),
              payMode: 'TC',
              person: state.invoiceDataList[0].clientName || '',
              cuCode: state.invoiceDataList[0].clientCode || '',
              refStr: data.data.authorization_number || '',
              detalles: state.invoiceDataList.map(inv => ({
                invoiceNr: inv.invoiceNumber,
                sum: inv.amount.toFixed(2),
                objects: '',
                stp: '1'
              }))
            };
            const reciboData = await pagoService.crearRecibo(recibo);
            if (!reciboData.success) {
              toast.error(reciboData.message || 'Error al crear el recibo de caja');
            }
          } catch (err) {
            toast.error('Error de conexión al crear el recibo de caja');
          }
          navigate('/payment-confirmation', { 
            state: {
              clientName: state.invoiceDataList[0].clientName,
              clientCode: state.invoiceDataList[0].clientCode,
              invoiceNumbers: state.invoiceDataList.map(inv => inv.invoiceNumber).join(', '),
              amount: state.totalAmount,
              paymentMethod: 'TARJETA',
              invoiceData: state.invoiceDataList.map(inv => ({
                ...inv,
                status: 'pagado' // Marcar como pagada
              }))
            }
          });
        } else {
          toast.error(data.message || 'Error procesando el pago');
        }
      } catch (err) {
        toast.error('Error de conexión con el procesador de pagos');
      } finally {
        setIsProcessing(false);
      }
      return;
    } else if (paymentMethod === 'yappy') {
      // Validate Yappy details
      if (!yappyPhone.trim()) {
        toast.error('Por favor ingrese el número de celular asociado a Yappy');
        return;
      }
      
      if (yappyPhone.length < 8) {
        toast.error('El número de celular debe tener al menos 8 dígitos');
        return;
      }
    }
    
    // Simulate payment processing
    setIsProcessing(true);
    
    setTimeout(() => {
      setIsProcessing(false);
      
      // Success case - navigate to confirmation page
      toast.success('Pago realizado con éxito');
      navigate('/payment-confirmation', { 
        state: {
          clientName: state.invoiceDataList[0].clientName,
          clientCode: state.invoiceDataList[0].clientCode,
          invoiceNumbers: state.invoiceDataList.map(inv => inv.invoiceNumber).join(', '),
          amount: state.totalAmount,
          paymentMethod: paymentMethod,
          invoiceData: state.invoiceDataList
        }
      });
    }, 2000);
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
            for (const invoice of state.invoiceDataList) {
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
            const invoice = state.invoiceDataList.find(inv => inv.invoiceNumber === file.invoiceId);
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
        toast.success(`${registrosExitosos.length} comprobantes registrados exitosamente`);
        
        // Crear recibo de caja en el ERP
        const recibo = {
          serNr: `ACH-${Date.now()}`,
          transDate: new Date().toISOString().slice(0, 10),
          payMode: 'ACH',
          person: state.invoiceDataList[0].clientName || '',
          cuCode: state.invoiceDataList[0].clientCode || '',
          refStr: `ACH-${files[0]?.numeroTransaccion} - ${registrosExitosos.length} comprobantes`,
          detalles: state.invoiceDataList.map(inv => ({
            invoiceNr: inv.invoiceNumber,
            sum: inv.amount.toFixed(2),
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
            clientName: state.invoiceDataList[0].clientName,
            clientCode: state.invoiceDataList[0].clientCode,
            invoiceNumbers: state.invoiceDataList.map(inv => inv.invoiceNumber).join(', '),
            amount: state.totalAmount,
            paymentMethod: 'ACH',
            numeroTransaccion: files[0]?.numeroTransaccion,
            comprobantesRegistrados: registrosExitosos.length,
            invoiceData: state.invoiceDataList.map(inv => ({
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
      
      <main className="flex-1 container max-w-4xl py-6 px-4">
        <div className="mb-6">
          <button 
            onClick={() => navigate('/invoice-list', { state: { clientCode: state.clientCode, searchType: state.searchType } })} 
            className="flex items-center text-billpay-blue hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            REGRESAR
          </button>
        </div>
        
        <h1 className="text-2xl font-bold text-black mb-6">Detalles de pago</h1>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="p-6 shadow-sm border-gray-100 mb-6">
              <div className="mb-6">
                <h2 className="text-xl text-black font-medium mb-4">Resumen de facturas</h2>
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                  <CollapsibleTrigger className="flex w-full justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <p className="text-black font-medium">{state.invoiceDataList.length} # Facturas:</p>
                    <div className="text-sm text-gray-500">{isOpen ? 'Ocultar' : 'Mostrar'}</div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                          {state.invoiceDataList.map((invoice, index) => (
                            <TableRow key={index}>
                              <TableCell>{invoice.invoiceNumber}</TableCell>
                              <TableCell>{parseLocalDate(invoice.invDate).toLocaleDateString()}</TableCell>
                              <TableCell>{parseLocalDate(invoice.dueDate).toLocaleDateString()}</TableCell>
                              <TableCell className="font-medium">${invoice.amount.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              
              <div className="flex justify-between py-3 border-t border-b mb-6">
                <span className="font-medium">Total a pagar:</span>
                <span className="text-xl font-bold text-black">${state.totalAmount.toFixed(2)}</span>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pagar con tarjeta
                </h3>
                
                {/* Payment Method Selection */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    disabled={loadingPaymentMethods || !paymentMethods?.paymentMethods?.creditCard?.enabled}
                    className={`p-2.5 border-2 rounded-lg flex flex-col items-center justify-center space-y-1 transition-colors ${
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
                    <CreditCard className="h-5 w-5" />
                    <span className="text-sm">
                      {paymentMethods?.paymentMethods?.creditCard?.displayName || 'Tarjeta de crédito'}
                    </span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setPaymentMethod('yappy');
                      if (state?.mobile) {
                        const cleaned = limpiarCelular(state.mobile);
                        setYappyPhone(cleaned);
                      }
                    }}
                    disabled={loadingPaymentMethods || !paymentMethods?.paymentMethods?.yappy?.enabled}
                    className={`p-2.5 border-2 rounded-lg flex flex-col items-center justify-center space-y-1 transition-colors ${
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
                    <Smartphone className="h-5 w-5" />
                    <span className="text-sm">
                      {paymentMethods?.paymentMethods?.yappy?.displayName || 'Yappy'}
                    </span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('paypal')}
                    disabled={loadingPaymentMethods || !paymentMethods?.paymentMethods?.paypal?.enabled}
                    className={`p-2.5 border-2 rounded-lg flex flex-col items-center justify-center space-y-1 transition-colors ${
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
                    <Wallet className="h-5 w-5" />
                    <span className="text-sm">
                      {paymentMethods?.paymentMethods?.paypal?.displayName || 'PayPal'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setPaymentMethod('ach');
                      setShowACHModal(true);
                    }}
                    disabled={loadingPaymentMethods || !paymentMethods?.paymentMethods?.ach?.enabled}
                    className={`p-2.5 border-2 rounded-lg flex flex-col items-center justify-center space-y-1 transition-colors ${
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
                    <Building2 className="h-5 w-5" />
                    <span className="text-sm">
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
                  <form onSubmit={e => { e.preventDefault(); handlePayment(); }}>
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
                            className="pr-10"
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
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
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
                              className="pr-10"
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
                              className="pr-10"
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
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="saveCard" 
                          checked={saveCard}
                          onCheckedChange={(checked) => setSaveCard(checked as boolean)}
                        />
                        <Label htmlFor="saveCard" className="text-sm cursor-pointer">
                          Guardar esta tarjeta para futuros pagos
                        </Label>
                      </div>
                      {/* Botón de pagar solo visible en método tarjeta */}
                      <div className="flex justify-center">
                        <Button
                          type="submit"
                          className="bg-gradient-to-r from-billpay-cyan to-blue-500 hover:from-billpay-cyan/90 hover:to-blue-500/90 px-6 md:px-10 py-4 md:py-7 rounded-full text-base md:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-[135%] sm:w-auto h-12 md:h-14 mt-4"
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
                          className="text-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Ingrese su número de celular sin espacios ni guiones
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <BtnYappy theme="orange" rounded="true" style={{ width: '50%' }} />
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm text-orange-800">
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
                      <p className="mt-1">Monto total: <strong>${state.totalAmount.toFixed(2)}</strong></p>
                    </div>
                  </div>
                )}
                
              </div>
            </Card>
            

          </div>
          
          <div>
            <Card className="p-6 shadow-sm border-gray-100">
              <h3 className="text-lg font-medium mb-4">Información del cliente</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Cliente:</p>
                  <p className="font-medium">{state.invoiceDataList[0].clientName}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Código de cliente:</p>
                  <p className="font-medium">{state.invoiceDataList[0].clientCode}</p>
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
                  <span>{state.invoiceDataList.length}</span>
                </div>
                
                <div className="flex justify-between py-1 border-t mt-2 pt-2">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-black">${state.totalAmount.toFixed(2)}</span>
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
        invoices={state.invoiceDataList}
        totalAmount={state.totalAmount}
        onConfirm={handleACHConfirm}
      />
    </div>
  );
};

export default InvoiceDetails;
