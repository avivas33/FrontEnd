import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import BillPayHeader from '@/components/BillPayHeader';
import ReCaptcha from '@/components/ReCaptcha';
import EstadoCuentaModal from '@/components/EstadoCuentaModal';
import { clienteService, validators } from '@/services';
import { verificacionService } from '@/services/verificacionService';

const Index = () => {
  const [clientCode, setClientCode] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [revisarEstadoCuenta, setRevisarEstadoCuenta] = useState('con-autenticacion'); // 'con-autenticacion' o 'sin-autenticacion'
  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null);
  const [showEstadoCuentaModal, setShowEstadoCuentaModal] = useState(false);
  const [tipoConsultaSeleccionada, setTipoConsultaSeleccionada] = useState<'facturas' | 'recibos'>('facturas');
  const navigate = useNavigate();

  // Detectar si el usuario llegó aquí desde una cancelación de PayPal
  useEffect(() => {
    let isMounted = true; // Flag para evitar setState en componente desmontado
    
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    // Buscar indicios de cancelación de PayPal en URL o sessionStorage
    const isPayPalCancel = urlParams.get('paypal_cancel') === 'true' || 
                           hash.includes('paypal_cancel') ||
                           urlParams.get('token') || // PayPal token en URL
                           sessionStorage.getItem('paypalCancelReturnState');
    
    if (isPayPalCancel && isMounted) {
      console.log('🔍 Detectada posible cancelación de PayPal en página de inicio');
      
      // Intentar restaurar estado desde sessionStorage
      const savedState = sessionStorage.getItem('paypalCancelReturnState');
      if (savedState && isMounted) {
        try {
          const parsedState = JSON.parse(savedState);
          console.log('🔄 Redirigiendo a invoice-details desde página de inicio');
          
          // Limpiar URL y redirigir a invoice-details
          window.history.replaceState({}, '', '/');
          sessionStorage.removeItem('paypalCancelReturnState');
          
          // Usar setTimeout para asegurar que la navegación ocurra después del render
          setTimeout(() => {
            if (isMounted) {
              navigate('/invoice-details', { 
                state: parsedState,
                replace: true 
              });
              toast.info('Pago con PayPal cancelado. Has sido redirigido de vuelta.');
            }
          }, 100);
          return;
        } catch (error) {
          console.error('Error al restaurar estado desde página de inicio:', error);
        }
      } else if (isMounted) {
        // Si no hay estado guardado, mostrar mensaje
        toast.info('Pago cancelado. Por favor, busca tu cliente nuevamente.');
      }
      
      // Limpiar URL
      if (isMounted) {
        window.history.replaceState({}, '', '/');
      }
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [navigate]); // Incluir navigate en dependencias

  const handleReCaptchaVerify = (token: string, isValid: boolean) => {
    setRecaptchaToken(token);
    setCaptchaVerified(isValid);
    if (!isValid && token) {
      toast.error('No se pudo verificar el reCAPTCHA');
    }
  };

  const handleEstadoCuentaOption = async (option: 'facturas' | 'recibos') => {
    setTipoConsultaSeleccionada(option);
    setShowEstadoCuentaModal(false);

    if (!clienteEncontrado?.eMail) {
      toast.error('El cliente no tiene un email registrado');
      return;
    }

    try {
      await verificacionService.solicitarCodigo({
        email: clienteEncontrado.eMail,
        clienteCode: clienteEncontrado.Code,
        tipoConsulta: option
      });

      toast.success('Código de verificación enviado a su email');
      
      // Extraer y limpiar el número de celular si existe
      let mobile = '';
      if (clienteEncontrado.Mobile) {
        const soloNumeros = clienteEncontrado.Mobile.replace(/[^0-9]/g, '');
        if (soloNumeros.length >= 8) {
          mobile = soloNumeros.slice(-8);
        }
      }

      // Navegar a la página de verificación
      navigate('/verificacion-codigo', {
        state: {
          email: clienteEncontrado.eMail,
          clienteCode: clienteEncontrado.Code,
          clienteName: clienteEncontrado.Name,
          tipoConsulta: option,
          mobile,
          clientData: clienteEncontrado
        }
      });
    } catch (error) {
      toast.error('Error al enviar código de verificación');
      console.error('Error:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null); // Limpiar error previo
    
    if (!clientCode.trim()) {
      setErrorMsg('Por favor ingrese su número de cliente');
      toast.error('Por favor ingrese su número de cliente');
      return;
    }
    
    if (!captchaVerified) {
      setErrorMsg('Por favor complete la verificación reCAPTCHA');
      toast.error('Por favor complete la verificación reCAPTCHA');
      return;
    }

    setLoadingClient(true);
    
    try {
      // Enviar el código tal como lo ingresó el usuario, sin restricciones
      const code = clientCode.trim();

      // Buscar cliente usando nuestro servicio
      const response = await clienteService.getCliente(code);
      
      if (response.data?.CUVc && response.data.CUVc.length > 0) {
        const cliente = response.data.CUVc[0];
        toast.success(`Cliente encontrado: ${cliente.Name}`);
        
        // Extraer y limpiar el número de celular si existe
        let mobile = '';
        if (cliente.Mobile) {
          // Quitar todo lo que no sea dígito y tomar los últimos 8 dígitos
          const soloNumeros = cliente.Mobile.replace(/[^0-9]/g, '');
          if (soloNumeros.length >= 8) {
            mobile = soloNumeros.slice(-8);
          }
        }
        
        setClienteEncontrado(cliente);
        
        if (revisarEstadoCuenta === 'con-autenticacion') {
          // Si está seleccionado "con autenticación", ir directo a verificación
          if (!cliente.eMail) {
            toast.error('El cliente no tiene un email registrado');
            return;
          }

          try {
            await verificacionService.solicitarCodigo({
              email: cliente.eMail,
              clienteCode: cliente.Code,
              tipoConsulta: 'facturas' // Por defecto facturas para revisar estado cuenta
            });

            toast.success('Código de verificación enviado a su email');
            
            // Navegar directo a la página de verificación
            navigate('/verificacion-codigo', {
              state: {
                email: cliente.eMail,
                clienteCode: cliente.Code,
                clienteName: cliente.Name,
                tipoConsulta: 'facturas',
                mobile,
                clientData: cliente,
                revisarEstadoCuenta: true // Indicar que viene de revisar estado cuenta
              }
            });
          } catch (error) {
            toast.error('Error al enviar código de verificación');
            console.error('Error:', error);
          }
        } else {
          // Navegar directo a la lista de facturas como antes
          navigate('/invoice-list', { 
            state: { 
              clientCode: cliente.Code,
              clientName: cliente.Name,
              searchType: 'hogar',
              mobile,
              clientData: cliente,
              revisarEstadoCuenta: false // Indicar que NO viene de revisar estado cuenta
            } 
          });
        }
        setErrorMsg(null); // Limpiar error si todo sale bien
      } else {
        setErrorMsg('Busque por N° de cliente, Por Celular y ruc/cedula');
      }
    } catch (error) {
      console.error('Error al buscar cliente:', error);
      setErrorMsg('Busque por N° de cliente, Por Celular y ruc/cedula');
    } finally {
      setLoadingClient(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <BillPayHeader />
      
      <main className="flex-1 container max-w-3xl py-6 px-4">
        
        <h1 className="text-2xl font-bold text-black mb-6">Consulta de Saldo, Facturas y Pagos</h1>
        
        <Card className="p-6 shadow-sm border-gray-100">
          <h2 className="text-xl text-black font-medium mb-6">Acceso al Portal:</h2>
          
          
          <form onSubmit={handleSearch}>
            <div className="mb-6">
              <Input
                placeholder="N° de cliente, Celular o RUC/Cédula"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                className="w-full p-4"
                disabled={loadingClient}
              />
              {errorMsg && (
                <div className="text-red-600 text-sm mt-2">{errorMsg}</div>
              )}
            </div>
            
            <div className="mb-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">Seleccione una opción:</h3>
                <RadioGroup 
                  value={revisarEstadoCuenta} 
                  onValueChange={setRevisarEstadoCuenta}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="con-autenticacion" 
                      id="con-autenticacion"
                      className="border-gray-300 text-[#6433dc] focus:ring-[#6433dc] data-[state=checked]:border-black data-[state=checked]:bg-[#6433dc]"
                    />
                    <Label htmlFor="con-autenticacion" className="text-sm">
                      Acceso a todas las transacciones (requiere autenticar)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="sin-autenticacion" 
                      id="sin-autenticacion"
                      className="border-gray-300 text-[#6433dc] focus:ring-[#6433dc] data-[state=checked]:border-black data-[state=checked]:bg-[#6433dc]"
                    />
                    <Label htmlFor="sin-autenticacion" className="text-sm">
                      Listar y pagar facturas con saldo (no requiere autenticar)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 mb-6">
              Al presionar CONTINUAR estás aceptando los <a href="https://celero.net/docs/tyc-portal" target="_blank" rel="noopener noreferrer" className="text-[#6433dc]">términos y condiciones</a>
            </div>
            
            <div className="mb-6">
              <ReCaptcha onVerify={handleReCaptchaVerify} />
            </div>
            
            <div className="flex justify-center">
              <Button 
                type="submit"
                className="bg-billpay-cyan hover:bg-billpay-cyan/90 text-white px-8 rounded-full"
                size="lg"
                disabled={loadingClient || !captchaVerified}
              >
                {loadingClient ? 'Consultando...' : 'CONTINUAR'}
              </Button>
            </div>
          </form>
        </Card>
      </main>

      {/* Modal de opciones */}
      <EstadoCuentaModal
        isOpen={showEstadoCuentaModal}
        onClose={() => setShowEstadoCuentaModal(false)}
        onSelectOption={handleEstadoCuentaOption}
        clientName={clienteEncontrado?.Name || ''}
      />
    </div>
  );
};

export default Index;
