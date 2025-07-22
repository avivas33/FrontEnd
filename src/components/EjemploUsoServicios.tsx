import React, { useState } from 'react';
import { useCliente, useFacturas, usePago, useEmail } from '@/hooks/useApi';
import { pagoService, emailService, type DatosYappy } from '@/services';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Smartphone, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface EjemploUsoServiciosProps {
  codigoCliente: string;
}

const EjemploUsoServicios: React.FC<EjemploUsoServiciosProps> = ({ codigoCliente }) => {
  const [procesandoPago, setProcesandoPago] = useState(false);
  
  // Usar hooks para obtener datos automáticamente
  const { data: clienteData, loading: loadingCliente, error: errorCliente, retry } = useCliente(codigoCliente);
  const { data: facturasData, loading: loadingFacturas, error: errorFacturas } = useFacturas(codigoCliente, 'abiertas');
  
  // Hooks para acciones bajo demanda
  const { execute: ejecutarPago, loading: loadingPago } = usePago();
  const { execute: enviarEmail, loading: loadingEmail } = useEmail();

  // Extraer datos de las respuestas
  const cliente = clienteData?.data?.CUVc?.[0];
  const facturas = facturasData?.data?.facturas || [];
  const montoTotal = facturas.reduce((sum, factura) => sum + (factura.monto || 0), 0);

  const handlePagoYappy = async () => {
    if (!cliente || facturas.length === 0) return;
    
    setProcesandoPago(true);
    
    try {
      // Datos para Yappy
      const datosYappy: DatosYappy = {
        monto: montoTotal,
        clienteCode: cliente.Code,
        facturas: facturas.map(f => f.id),
        telefono: cliente.Mobile,
        descripcion: `Pago de ${facturas.length} factura(s) - ${cliente.Name}`
      };

      // Crear orden de pago Yappy
      const ordenYappy = await ejecutarPago(
        pagoService.crearOrdenYappyFrontend,
        datosYappy
      );

      if (ordenYappy?.ordenId) {
        toast.success('Orden de pago Yappy creada exitosamente');
        
        // Enviar confirmación por email
        if (cliente.eMail) {
          await enviarEmail(emailService.enviarConfirmacionPago, {
            clienteEmail: cliente.eMail,
            clienteNombre: cliente.Name,
            facturas: facturas.map(f => ({
              numero: f.numero,
              monto: f.monto
            })),
            montoTotal,
            metodoPago: 'Yappy',
            fechaPago: new Date().toISOString(),
            numeroRecibo: ordenYappy.ordenId
          });
          
          toast.success('Confirmación enviada por email');
        }
        
        // Aquí podrías redirigir al usuario o mostrar el QR
        console.log('Orden Yappy:', ordenYappy);
      }
      
    } catch (error) {
      console.error('Error en pago Yappy:', error);
      toast.error('Error al procesar el pago Yappy');
    } finally {
      setProcesandoPago(false);
    }
  };

  const handlePagoTarjeta = async () => {
    // Implementar lógica de pago con tarjeta
    toast.info('Función de pago con tarjeta por implementar');
  };

  const handleEnviarRecordatorio = async () => {
    if (!cliente || facturas.length === 0) return;
    
    try {
      await enviarEmail(emailService.enviarRecordatorioFactura, {
        clienteEmail: cliente.eMail,
        clienteNombre: cliente.Name,
        facturas: facturas.map(f => ({
          numero: f.numero,
          monto: f.monto,
          fechaVencimiento: f.fechaVencimiento
        })),
        montoTotal
      });
      
      toast.success('Recordatorio enviado por email');
    } catch (error) {
      console.error('Error enviando recordatorio:', error);
      toast.error('Error al enviar recordatorio');
    }
  };

  // Estados de carga
  if (loadingCliente || loadingFacturas) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Cargando información del cliente...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Manejo de errores
  if (errorCliente || errorFacturas) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error: {errorCliente || errorFacturas}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={retry}
          >
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Cliente no encontrado
  if (!cliente) {
    return (
      <Alert>
        <AlertDescription>
          Cliente no encontrado con código: {codigoCliente}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Información del Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Información del Cliente</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnviarRecordatorio}
              disabled={loadingEmail || facturas.length === 0}
              className="ml-auto"
            >
              {loadingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Enviar Recordatorio
            </Button>
          </CardTitle>
          <CardDescription>Código: {cliente.Code}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Nombre:</label>
              <p className="text-lg font-semibold">{cliente.Name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email:</label>
              <p className="text-lg">{cliente.eMail}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Móvil:</label>
              <p className="text-lg">{cliente.Mobile}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Facturas Pendientes */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas Pendientes</CardTitle>
          <CardDescription>
            {facturas.length} factura(s) por un total de ${montoTotal.toFixed(2)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {facturas.length > 0 ? (
            <div className="space-y-4">
              {/* Lista de Facturas */}
              <div className="space-y-2">
                {facturas.map((factura, index) => (
                  <div key={factura.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Factura #{factura.numero}</p>
                      <p className="text-sm text-gray-600">
                        {factura.fecha && `Fecha: ${factura.fecha}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${factura.monto?.toFixed(2) || '0.00'}</p>
                      <p className="text-sm text-gray-600">{factura.estado}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Botones de Pago */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                <Button 
                  onClick={handlePagoYappy}
                  disabled={procesandoPago || loadingPago}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {procesandoPago ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-2" />
                  )}
                  Pagar con Yappy
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handlePagoTarjeta}
                  disabled={procesandoPago || loadingPago}
                  className="flex-1"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar con Tarjeta
                </Button>
              </div>
              
              {/* Información del Total */}
              <div className="text-center text-lg font-bold text-green-600 pt-2">
                Total a pagar: ${montoTotal.toFixed(2)}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No hay facturas pendientes.</p>
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-lg font-semibold text-green-600">
                ¡Todas las facturas están al día!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información de Debug (solo en desarrollo) */}
      {import.meta.env.VITE_DEBUG === 'true' && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify({ cliente, facturas }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EjemploUsoServicios;
