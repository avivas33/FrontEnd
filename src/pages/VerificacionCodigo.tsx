import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import BillPayHeader from '@/components/BillPayHeader';
import { verificacionService } from '@/services/verificacionService';

interface LocationState {
  email: string;
  clienteCode: string;
  clienteName: string;
  tipoConsulta: 'facturas' | 'recibos';
  mobile?: string;
  clientData?: any;
  revisarEstadoCuenta?: boolean;
}

const VerificacionCodigo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [codigo, setCodigo] = useState(['', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutos
  const [isLoading, setIsLoading] = useState(false);

  // Validar que llegamos con la información necesaria
  useEffect(() => {
    if (!state?.email || !state?.clienteCode) {
      navigate('/');
    }
  }, [state, navigate]);

  // Temporizador
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Formatear email para mostrar parcialmente oculto
  const formatEmail = (email: string) => {
    if (!email) return '';
    const [user, domain] = email.split('@');
    if (user.length <= 3) {
      return `${user}***@${domain}`;
    }
    return `${user.substring(0, 3)}***@${domain}`;
  };

  const handleInputChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCodigo = [...codigo];
      newCodigo[index] = value;
      setCodigo(newCodigo);

      // Auto-focus siguiente campo con timeout para iOS compatibility
      if (value && index < 3) {
        setTimeout(() => {
          const nextInput = document.getElementById(`codigo-${index + 1}`) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
            // En iOS, asegurar que el cursor esté visible
            nextInput.setSelectionRange(0, 0);
          }
        }, 10);
      }

      // Auto-submit cuando se completen los 4 dígitos
      if (value && index === 3) {
        const codigoCompleto = newCodigo.join('');
        if (codigoCompleto.length === 4 && !isLoading && timeLeft > 0) {
          // Pequeña pausa para mejor UX, luego verificar automáticamente
          setTimeout(() => {
            if (!isLoading) {
              verificarCodigoAutomaticamente(codigoCompleto);
            }
          }, 300);
        }
      }
    }
  };

  const verificarCodigoAutomaticamente = async (codigoCompleto: string) => {
    setIsLoading(true);

    try {
      toast.loading('Verificando código automáticamente...', { id: 'verificacion' });
      
      await verificacionService.verificarCodigo({
        email: state.email,
        codigo: codigoCompleto,
        clienteCode: state.clienteCode,
        tipoConsulta: state.tipoConsulta
      });

      toast.success('✅ Código verificado correctamente', { id: 'verificacion' });
      
      setTimeout(() => {
        toast.loading('Redirigiendo a facturas...', { id: 'navegacion' });
        
        navigate('/invoice-list', { 
          state: { 
            clientCode: state.clienteCode,
            clientName: state.clienteName,
            searchType: 'hogar',
            mobile: state.mobile,
            clientData: state.clientData,
            tipoConsulta: state.tipoConsulta,
            verificado: true,
            revisarEstadoCuenta: state.revisarEstadoCuenta || true // Mantener el estado o asumir true por defecto
          },
          replace: true
        });
        
        setTimeout(() => {
          toast.dismiss('navegacion');
        }, 500);
      }, 800);
      
    } catch (error) {
      toast.error('❌ Código inválido o expirado', { id: 'verificacion' });
      setCodigo(['', '', '', '']);
      setTimeout(() => {
        const firstInput = document.getElementById('codigo-0');
        firstInput?.focus();
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      // En iOS, usar setTimeout para asegurar que el focus funcione correctamente
      setTimeout(() => {
        const prevInput = document.getElementById(`codigo-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
          // En iOS, asegurar que el cursor esté al final
          prevInput.setSelectionRange(1, 1);
        }
      }, 10);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const digits = paste.replace(/\D/g, '').slice(0, 4);
    
    if (digits.length === 4) {
      const newCodigo = digits.split('');
      setCodigo(newCodigo);
      
      // Focus en el último input
      setTimeout(() => {
        const lastInput = document.getElementById('codigo-3') as HTMLInputElement;
        if (lastInput) {
          lastInput.focus();
          lastInput.setSelectionRange(1, 1);
        }
      }, 10);
      
      // Auto-verificar después del pegado
      setTimeout(() => {
        if (!isLoading && timeLeft > 0) {
          verificarCodigoAutomaticamente(digits);
        }
      }, 300);
    }
  };

  const handleResendCode = async () => {
    if (timeLeft > 0) {
      toast.info(`Por favor espere ${timeLeft} segundos antes de solicitar un nuevo código`);
      return;
    }

    try {
      await verificacionService.solicitarCodigo({
        email: state.email,
        clienteCode: state.clienteCode,
        tipoConsulta: state.tipoConsulta
      });
      
      setTimeLeft(120); // 2 minutos
      setCodigo(['', '', '', '']);
      toast.success('Nuevo código enviado a su email');
    } catch (error) {
      toast.error('Error al reenviar código');
    }
  };

  const handleSubmit = async () => {
    const codigoCompleto = codigo.join('');
    
    if (codigoCompleto.length !== 4) {
      toast.error('Por favor ingrese el código completo de 4 dígitos');
      return;
    }

    setIsLoading(true);

    try {
      // Mostrar mensaje de verificación inmediato
      toast.loading('Verificando código...', { id: 'verificacion' });
      
      // Realizar verificación
      await verificacionService.verificarCodigo({
        email: state.email,
        codigo: codigoCompleto,
        clienteCode: state.clienteCode,
        tipoConsulta: state.tipoConsulta
      });

      // Éxito - mostrar mensaje y preparar navegación
      toast.success('✅ Código verificado correctamente', { id: 'verificacion' });
      
      // Pequeña pausa para que el usuario vea el mensaje de éxito
      setTimeout(() => {
        // Mostrar mensaje de redirección
        toast.loading('Redirigiendo a facturas...', { id: 'navegacion' });
        
        // Navegar inmediatamente después
        navigate('/invoice-list', { 
          state: { 
            clientCode: state.clienteCode,
            clientName: state.clienteName,
            searchType: 'hogar',
            mobile: state.mobile,
            clientData: state.clientData,
            tipoConsulta: state.tipoConsulta,
            verificado: true,
            revisarEstadoCuenta: state.revisarEstadoCuenta || true // Mantener el estado o asumir true por defecto
          },
          replace: true // Usar replace para evitar volver atrás
        });
        
        // Limpiar toast de navegación después de un momento
        setTimeout(() => {
          toast.dismiss('navegacion');
        }, 500);
      }, 800); // Pausa breve para mostrar el éxito
      
    } catch (error) {
      toast.error('❌ Código inválido o expirado', { id: 'verificacion' });
      // Limpiar el código para que el usuario pueda intentar de nuevo
      setCodigo(['', '', '', '']);
      // Focus en el primer campo
      setTimeout(() => {
        const firstInput = document.getElementById('codigo-0');
        firstInput?.focus();
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header con BillPayHeader para mantener el tema */}
      <BillPayHeader />

      {/* Contenido principal */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
          {/* Título de verificación */}
          <div className="text-center mb-8">
            
            {/* Cuenta regresiva animada con círculos */}
            {timeLeft > 0 && (
              <div className="flex justify-center items-center space-x-8 mb-6">
                {/* Círculo de minutos */}
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 32 32">
                    {/* Círculo de fondo */}
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-gray-200"
                    />
                    {/* Círculo de progreso para minutos */}
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 14}`}
                      strokeDashoffset={`${2 * Math.PI * 14 * (1 - (Math.floor(timeLeft / 60) / 2))}`}
                      className="text-[#6433dc] transition-all duration-1000 ease-linear"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xl font-bold text-[#6433dc]">
                        {Math.floor(timeLeft / 60)}
                      </div>
                      <div className="text-xs text-gray-500">min</div>
                    </div>
                  </div>
                </div>

                {/* Separador */}
                <div className="text-2xl font-bold text-gray-400">:</div>

                {/* Círculo de segundos */}
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 32 32">
                    {/* Círculo de fondo */}
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-gray-200"
                    />
                    {/* Círculo de progreso para segundos */}
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 14}`}
                      strokeDashoffset={`${2 * Math.PI * 14 * (1 - ((timeLeft % 60) / 60))}`}
                      className={`transition-all duration-1000 ease-linear ${
                        timeLeft <= 10 ? 'text-red-500' : 'text-blue-500'
                      }`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className={`text-xl font-bold ${
                        timeLeft <= 10 ? 'text-red-500' : 'text-blue-500'
                      }`}>
                        {String(timeLeft % 60).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-500">seg</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje cuando el tiempo se agota */}
            {timeLeft === 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 font-medium">¡Tiempo agotado!</p>
                <p className="text-sm text-red-500">Solicite un nuevo código para continuar</p>
              </div>
            )}
          </div>

          {/* Texto secundario: "Se ha enviado un código de verificación a fea***@weenableit.com" */}
          <p className="text-center text-gray-600 mb-6 text-sm">
            Se ha enviado un código de verificación a{' '}
            <span className="font-medium text-gray-800">{formatEmail(state?.email || '')}</span>
          </p>

          {/* Campo para ingresar un código dividido en cuatro casillas */}
          <div className="mb-6">
            <div className="flex justify-center space-x-3">
              {codigo.map((digit, index) => (
                <Input
                  key={index}
                  id={`codigo-${index}`}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-12 text-center text-lg font-bold border-2 border-gray-300 focus:border-[#6433dc] focus:ring-[#6433dc]"
                  disabled={timeLeft === 0}
                  autoComplete="one-time-code"
                />
              ))}
            </div>
          </div>

          {/* Texto con enlace "Políticas de seguridad CELERO" acompañado de un icono de información */}
          <div className="flex items-center justify-center text-sm text-[#6433dc] mb-8">
            <Info className="w-4 h-4 mr-2" />
            <a href="#" className="hover:underline font-medium">
              Políticas de seguridad CELERO
            </a>
          </div>

          {/* Botón principal azul con el texto "Confirmar" */}
          <Button 
            onClick={handleSubmit}
            disabled={isLoading || timeLeft === 0 || codigo.join('').length !== 4}
            className={`w-full py-3 text-lg font-medium rounded-lg transition-all duration-300 ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : codigo.join('').length === 4 
                  ? 'bg-[#6433dc] hover:bg-[#6433dc]/90 hover:scale-105 shadow-lg' 
                  : 'bg-gray-300 cursor-not-allowed'
            } text-white mb-6`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verificando...
              </div>
            ) : codigo.join('').length === 4 ? (
              <div className="flex items-center justify-center gap-2">
                <span>Confirmar</span>
                <span className="text-xl">✓</span>
              </div>
            ) : (
              'Ingrese el código completo'
            )}
          </Button>

          {/* Texto de ayuda: "¿No recibiste ningún código? Reenviar código" donde "Reenviar código" es un enlace */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              ¿No recibiste ningún código?{' '}
              <button 
                onClick={handleResendCode}
                className={`text-[#6433dc] hover:underline font-medium ${
                  timeLeft > 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={timeLeft > 0}
              >
                Reenviar código
              </button>
            </p>
            {timeLeft > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Podrás solicitar un nuevo código en {formatTime(timeLeft)}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerificacionCodigo;