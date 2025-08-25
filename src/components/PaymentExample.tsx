import React, { useState } from 'react';
import { useActivityTracking } from '../hooks/useActivityTracking';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';

interface PaymentExampleProps {
  clientId: string;
  amount: number;
  currency?: string;
}

export const PaymentExample: React.FC<PaymentExampleProps> = ({ 
  clientId, 
  amount, 
  currency = 'USD' 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { 
    trackCheckoutStart, 
    trackPaymentAttempt, 
    trackPaymentSuccess, 
    trackPaymentFailed,
    trackPageView 
  } = useActivityTracking(clientId);

  // Track cuando el componente se monta
  React.useEffect(() => {
    trackPageView('payment_form', { amount, currency });
  }, []);

  const handlePaymentStart = async (paymentMethod: string) => {
    try {
      // Registrar inicio del checkout
      await trackCheckoutStart(paymentMethod, amount, currency);
      
      // Simular inicio del proceso de pago
      toast.info(`Iniciando pago con ${paymentMethod}`);
    } catch (error) {
      console.error('Error al iniciar checkout:', error);
    }
  };

  const handlePayment = async (paymentMethod: string) => {
    setIsProcessing(true);
    
    try {
      // Registrar intento de pago
      await trackPaymentAttempt(paymentMethod, amount, currency);
      
      // Simular procesamiento de pago
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular resultado aleatorio
      const isSuccess = Math.random() > 0.3;
      
      if (isSuccess) {
        const transactionId = `TXN-${Date.now()}`;
        await trackPaymentSuccess(paymentMethod, amount, currency, transactionId);
        toast.success('¡Pago completado exitosamente!');
      } else {
        const errorCode = 'INSUFFICIENT_FUNDS';
        await trackPaymentFailed(paymentMethod, amount, currency, errorCode, 'Fondos insuficientes');
        toast.error('Pago rechazado: Fondos insuficientes');
      }
    } catch (error) {
      await trackPaymentFailed(paymentMethod, amount, currency, 'SYSTEM_ERROR', error.message);
      toast.error('Error al procesar el pago');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Ejemplo de Pago con Tracking</h2>
      
      <div className="mb-4">
        <p className="text-gray-600">Cliente ID: {clientId}</p>
        <p className="text-gray-600">Monto: {currency} {amount.toFixed(2)}</p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => handlePaymentStart('credit_card')}
          disabled={isProcessing}
          variant="outline"
          className="w-full"
        >
          Preparar pago con Tarjeta de Crédito
        </Button>

        <Button
          onClick={() => handlePayment('credit_card')}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Procesando...' : 'Pagar con Tarjeta de Crédito'}
        </Button>

        <Button
          onClick={() => handlePayment('paypal')}
          disabled={isProcessing}
          variant="secondary"
          className="w-full"
        >
          {isProcessing ? 'Procesando...' : 'Pagar con PayPal'}
        </Button>

        <Button
          onClick={() => handlePayment('bank_transfer')}
          disabled={isProcessing}
          variant="secondary"
          className="w-full"
        >
          {isProcessing ? 'Procesando...' : 'Pagar con Transferencia'}
        </Button>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>Este ejemplo demuestra cómo se registran los eventos de pago:</p>
        <ul className="list-disc list-inside mt-2">
          <li>Inicio del checkout</li>
          <li>Intento de pago</li>
          <li>Pago exitoso o fallido</li>
          <li>Información del dispositivo y navegador</li>
        </ul>
      </div>
    </Card>
  );
};