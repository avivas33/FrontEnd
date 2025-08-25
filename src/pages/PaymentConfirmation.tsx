
import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ArrowLeft, FileText, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import BillPayHeader from '@/components/BillPayHeader';
import { pagoService } from '@/services';
import { type PayPalCaptureRequest } from '@/services/pagoService';
import { toast } from 'sonner';

const PaymentConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentData, setPaymentData] = useState(location.state);
  const [isCapturingPayPal, setIsCapturingPayPal] = useState(false);
  
  const capturePayPalPayment = useCallback(async (orderId: string) => {
    setIsCapturingPayPal(true);
    
    try {
      // Retrieve payment data from sessionStorage
      const storedData = sessionStorage.getItem('paypalPaymentData');
      if (!storedData) {
        toast.error('Error: No se encontraron los datos del pago');
        navigate('/');
        return;
      }
      
      const paypalData = JSON.parse(storedData);
      
      // Capture payment
      const captureRequest: PayPalCaptureRequest = {
        orderId: orderId,
        clienteCode: paypalData.clientCode,
        numeroFactura: paypalData.invoiceNumbers,
        emailCliente: paypalData.emailCliente || '',
        invoiceDetails: paypalData.invoiceDataList?.map((inv: any) => ({
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount
        }))
      };
      
      const captureResult = await pagoService.capturarPagoPayPal(captureRequest);
      
      if (captureResult.success) {
        // Set payment data for display with receipt number from backend
        setPaymentData({
          clientName: paypalData.clientName,
          clientCode: paypalData.clientCode,
          invoiceNumbers: paypalData.invoiceNumbers,
          amount: paypalData.totalAmount,
          paymentMethod: 'PAYPAL',
          transactionId: captureResult.data?.transactionId || orderId,
          receiptNumber: captureResult.data?.receiptNumber, // Número de recibo del ERP
          invoiceData: paypalData.invoiceDataList.map((inv: any) => ({
            ...inv,
            status: 'pagado'
          }))
        });
        
        // Clear sessionStorage
        sessionStorage.removeItem('paypalPaymentData');
        
        // Crear mensaje detallado con facturas
        const facturesDetail = paypalData.invoiceDataList.map((inv: any) => 
          `${inv.invoiceNumber}: $${inv.amount.toFixed(2)}`
        ).join(', ');
        
        toast.success('¡Pago PayPal completado exitosamente!', {
          description: `Facturas pagadas: ${facturesDetail}. Total: $${paypalData.totalAmount.toFixed(2)}`,
          duration: 5000,
        });
      } else {
        toast.error(captureResult.message || 'Error al capturar el pago PayPal');
        navigate('/');
      }
    } catch (error) {
      console.error('Error capturing PayPal payment:', error);
      toast.error('Error al procesar el pago PayPal');
      navigate('/');
    } finally {
      setIsCapturingPayPal(false);
    }
  }, [navigate, setPaymentData]);
  
  useEffect(() => {
    // Check if returning from PayPal
    const isPayPalReturn = searchParams.get('paypal') === 'true';
    const token = searchParams.get('token');
    const payerId = searchParams.get('PayerID');
    
    if (isPayPalReturn && token && payerId && !paymentData) {
      capturePayPalPayment(token);
    }
  }, [searchParams, paymentData, capturePayPalPayment]);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <BillPayHeader />
      
      <main className="flex-1 container max-w-2xl py-6 px-4">
        <div className="mb-6">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center text-billpay-blue hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            REGRESAR AL INICIO
          </button>
        </div>
        
        {isCapturingPayPal ? (
          <Card className="p-6 shadow-sm border-gray-100 text-center">
            <div className="mb-6 flex flex-col items-center">
              <div className="animate-spin inline-block w-12 h-12 border-4 border-gray-300 border-t-billpay-blue rounded-full mb-4"></div>
              <h1 className="text-2xl font-bold text-black">Procesando pago PayPal...</h1>
              <p className="text-gray-500 mt-2">Por favor espere mientras confirmamos su pago</p>
            </div>
          </Card>
        ) : (
        <Card className="p-6 shadow-sm border-gray-100 text-center">
          <div className="mb-6 flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-black">¡Pago realizado con éxito!</h1>
          </div>
          
          <div className="border-t border-b border-gray-200 py-6 mb-6 text-left">
            <div className="grid grid-cols-2 gap-8">
              {/* Columna izquierda: Cliente, Código de cliente, Método de pago */}
              <div className="space-y-4">
                <div>
                  <p className="text-gray-500 text-sm">Cliente:</p>
                  <p className="font-medium">{paymentData?.clientName || 'GIANCARLO STANZIOLA'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Código de cliente:</p>
                  <p className="font-medium">{paymentData?.clientCode || 'CU-20037'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Método de pago:</p>
                  <p className="font-medium flex items-center">
                    <CreditCard className="h-4 w-4 mr-1" />
                    {paymentData?.paymentMethod === 'card' || paymentData?.paymentMethod === 'TARJETA'
                      ? 'Tarjeta de crédito' 
                      : paymentData?.paymentMethod === 'PAYPAL'
                      ? 'PayPal'
                      : paymentData?.paymentMethod === 'YAPPY'
                      ? 'Yappy'
                      : paymentData?.paymentMethod === 'ACH'
                      ? 'Transferencia ACH'
                      : 'Billetera digital'}
                  </p>
                </div>
              </div>
              {/* Columna derecha: Fecha de pago, ID de transacción, Monto pagado */}
              <div className="space-y-4">
                <div>
                  <p className="text-gray-500 text-sm">Fecha de pago:</p>
                  <p className="font-medium">{new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">
                    {paymentData?.paymentMethod === 'TARJETA' ? 'Número de autorización:' : 'ID de transacción:'}
                  </p>
                  <p className="font-medium font-mono text-sm">{paymentData?.transactionId || '09583760JU377161N'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Monto pagado:</p>
                  <p className="font-bold text-billpay-blue">${paymentData?.amount?.toFixed(2) || '1.00'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Grid de facturas pagadas */}
          {paymentData?.invoiceData && paymentData.invoiceData.length > 0 && (
            <div className="mb-6">
              <div className="space-y-2">
                {paymentData.invoiceData.map((invoice: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</span>
                      {invoice.cufe && (
                        <span className="text-xs text-gray-500">{invoice.cufe}</span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      ${invoice.amount?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex flex-col items-center">
            <p className="text-gray-500 mb-4">
              Se ha enviado un comprobante de pago a su correo electrónico registrado.
            </p>
            <button 
              className="text-black hover:underline flex items-center mb-6"
              onClick={() => window.print()}
            >
              <FileText className="h-4 w-4 mr-2" />
              Descargar comprobante
            </button>
            <Button 
              onClick={() => navigate('/')}
              className="bg-billpay-cyan hover:bg-billpay-cyan/90 text-white px-8 rounded-full"
            >
              FINALIZAR
            </Button>
          </div>
        </Card>
        )}
      </main>
    </div>
  );
};

export default PaymentConfirmation;
