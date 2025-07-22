import React, { useState, useEffect } from 'react';
import { clienteService, pagoService, emailService, type Cliente, type Factura } from '../services';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface ClienteInfoProps {
  codigoCliente: string;
}

export const ClienteInfo: React.FC<ClienteInfoProps> = ({ codigoCliente }) => {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesandoPago, setProcesandoPago] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener información del cliente
        const clienteResponse = await clienteService.getCliente(codigoCliente);
        if (clienteResponse.data?.CUVc?.length > 0) {
          setCliente(clienteResponse.data.CUVc[0]);
        }

        // Obtener facturas abiertas
        const facturasResponse = await clienteService.getFacturasAbiertas(codigoCliente);
        if (facturasResponse.data?.facturas) {
          setFacturas(facturasResponse.data.facturas);
        }

      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar información del cliente');
      } finally {
        setLoading(false);
      }
    };

    if (codigoCliente) {
      fetchDatos();
    }
  }, [codigoCliente]);

  const handlePagoYappy = async (facturasSeleccionadas: string[], montoTotal: number) => {
    try {
      setProcesandoPago(true);
      
      // Crear orden de pago Yappy
      const ordenResponse = await pagoService.crearOrdenYappyFrontend({
        monto: montoTotal,
        clienteCode: codigoCliente,
        facturas: facturasSeleccionadas,
        descripcion: `Pago de facturas - Cliente ${cliente?.Name}`
      });

      if (ordenResponse.ordenId) {
        // Redirigir al usuario o mostrar QR
        console.log('Orden Yappy creada:', ordenResponse);
        
        // Enviar confirmación por email
        if (cliente?.eMail) {
          await emailService.enviarConfirmacionPago({
            clienteEmail: cliente.eMail,
            clienteNombre: cliente.Name,
            facturas: facturas
              .filter(f => facturasSeleccionadas.includes(f.id))
              .map(f => ({ numero: f.numero, monto: f.monto })),
            montoTotal,
            metodoPago: 'Yappy',
            fechaPago: new Date().toISOString(),
            numeroRecibo: ordenResponse.ordenId
          });
        }
        
        alert('Orden de pago Yappy creada exitosamente');
      }
      
    } catch (err) {
      console.error('Error al procesar pago Yappy:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar el pago');
    } finally {
      setProcesandoPago(false);
    }
  };

  const handlePagoTarjeta = async (datosTarjeta: any, facturasSeleccionadas: string[], montoTotal: number) => {
    try {
      setProcesandoPago(true);
      
      const pagoResponse = await pagoService.ventaTarjeta({
        ...datosTarjeta,
        monto: montoTotal,
        clienteCode: codigoCliente,
        facturas: facturasSeleccionadas
      });

      if (pagoResponse.success) {
        // Enviar confirmación por email
        if (cliente?.eMail) {
          await emailService.enviarConfirmacionPago({
            clienteEmail: cliente.eMail,
            clienteNombre: cliente.Name,
            facturas: facturas
              .filter(f => facturasSeleccionadas.includes(f.id))
              .map(f => ({ numero: f.numero, monto: f.monto })),
            montoTotal,
            metodoPago: 'Tarjeta de Crédito',
            fechaPago: new Date().toISOString(),
            numeroRecibo: pagoResponse.numeroRecibo
          });
        }
        
        alert('Pago procesado exitosamente');
      }
      
    } catch (err) {
      console.error('Error al procesar pago con tarjeta:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar el pago');
    } finally {
      setProcesandoPago(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Cargando información del cliente...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!cliente) {
    return (
      <Alert>
        <AlertDescription>
          Cliente no encontrado con código: {codigoCliente}
        </AlertDescription>
      </Alert>
    );
  }

  const montoTotal = facturas.reduce((sum, factura) => sum + factura.monto, 0);

  return (
    <div className="space-y-6">
      {/* Información del Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
          <CardDescription>Código: {cliente.Code}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nombre:</label>
              <p className="text-lg">{cliente.Name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Email:</label>
              <p className="text-lg">{cliente.eMail}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Móvil:</label>
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
            {facturas.length} factura(s) pendiente(s) por un total de ${montoTotal.toFixed(2)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {facturas.length > 0 ? (
            <div className="space-y-4">
              {facturas.map((factura) => (
                <div key={factura.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Factura #{factura.numero}</p>
                    <p className="text-sm text-gray-600">Fecha: {factura.fecha}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${factura.monto.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">{factura.estado}</p>
                  </div>
                </div>
              ))}
              
              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={() => handlePagoYappy(facturas.map(f => f.id), montoTotal)}
                  disabled={procesandoPago}
                  className="flex-1"
                >
                  {procesandoPago ? 'Procesando...' : 'Pagar con Yappy'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Aquí abrirías un modal para capturar datos de tarjeta
                    console.log('Abrir formulario de tarjeta');
                  }}
                  disabled={procesandoPago}
                  className="flex-1"
                >
                  Pagar con Tarjeta
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No hay facturas pendientes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClienteInfo;
