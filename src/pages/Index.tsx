import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BillPayHeader from '@/components/BillPayHeader';
import ReCaptcha from '@/components/ReCaptcha';
import { clienteService, validators } from '@/services';

const Index = () => {
  const [clientCode, setClientCode] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleReCaptchaVerify = (token: string, isValid: boolean) => {
    setRecaptchaToken(token);
    setCaptchaVerified(isValid);
    if (!isValid && token) {
      toast.error('No se pudo verificar el reCAPTCHA');
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
        
        // Navegar a la lista de facturas con el código del cliente
        navigate('/invoice-list', { 
          state: { 
            clientCode: cliente.Code,
            clientName: cliente.Name,
            searchType: 'hogar',
            mobile,
            clientData: cliente
          } 
        });
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
          <h2 className="text-xl text-black font-medium mb-6">Paga en línea</h2>
          
          
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
            
            <div className="text-sm text-gray-500 mb-6">
              Al presionar CONTINUAR estás aceptando los <a href="#" className="text-billpay-cyan">términos y condiciones</a>
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
    </div>
  );
};

export default Index;
