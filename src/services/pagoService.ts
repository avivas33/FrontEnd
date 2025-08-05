import { apiClient } from '../config/api';

export interface DatosTarjeta {
  currency_code: string;
  amount: string;
  pan: string;
  exp_date: string;
  cvv2: string;
  card_holder: string;
  tax: string;
  tip: string;
  // Campos adicionales para notificaciones (NO se envían a Cobalt)
  customer_email?: string;
  customer_name?: string;
  order_id?: string;
  description?: string;
  contract_number?: string;
  company_code?: string; // Código de empresa para determinar credenciales Cobalt
}

export interface DatosYappy {
  orderId: string;
  domain: string;
  paymentDate: number;
  aliasYappy: string;
  ipnUrl: string;
  discount: string;
  taxes: string;
  subtotal: string;
  total: string;
}

export interface ReciboData {
  serNr: string;
  transDate: string;
  payMode: string;
  person: string;
  cuCode: string;
  refStr: string;
  detalles: Array<{
    invoiceNr: string;
    sum: string;
    objects: string;
    stp: string;
  }>;
}

export interface PayPalCreateOrderRequest {
  clienteCode: string;
  numeroFactura: string;
  amount: number;
  currency?: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
  emailCliente?: string;
  nombreCliente?: string;
}

export interface PayPalCreateOrderResponse {
  success: boolean;
  message: string;
  data?: {
    orderId: string;
    approvalUrl: string;
    status: string;
  };
}

export interface PayPalCaptureRequest {
  orderId: string;
  clienteCode: string;
  numeroFactura: string;
}

export class PagoService {
  
  /**
   * Procesar venta con tarjeta (Cobalt)
   */
  async ventaTarjeta(data: DatosTarjeta): Promise<any> {
    try {
      return await apiClient.post('/api/clientes/venta-tarjeta', data);
    } catch (error) {
      console.error('Error al procesar venta con tarjeta:', error);
      throw new Error('No se pudo procesar el pago con tarjeta');
    }
  }

  /**
   * Crear orden de pago Yappy
   */
  async crearOrdenYappy(data: DatosYappy): Promise<any> {
    try {
      return await apiClient.post('/api/clientes/yappy/crear-orden', data);
    } catch (error) {
      console.error('Error al crear orden Yappy:', error);
      throw new Error('No se pudo crear la orden de pago Yappy');
    }
  }

  /**
   * Crear recibo de caja
   */
  async crearRecibo(data: ReciboData): Promise<any> {
    try {
      return await apiClient.post('/api/clientes/recibos', data);
    } catch (error) {
      console.error('Error al crear recibo:', error);
      throw new Error('No se pudo crear el recibo de caja');
    }
  }

  /**
   * Obtener métodos de pago disponibles
   */
  async getMetodosPago(): Promise<{ tarjeta: boolean; yappy: boolean; transferencia: boolean }> {
    try {
      return await apiClient.get('/api/clientes/metodos-pago');
    } catch (error) {
      console.error('Error al obtener métodos de pago:', error);
      // Retornar valores por defecto en caso de error
      return {
        tarjeta: true,
        yappy: true,
        transferencia: false
      };
    }
  }

  /**
   * Crear orden de pago con PayPal
   */
  async crearOrdenPayPal(data: PayPalCreateOrderRequest): Promise<PayPalCreateOrderResponse> {
    try {
      return await apiClient.post('/api/clientes/paypal/create-order', data);
    } catch (error) {
      console.error('Error al crear orden PayPal:', error);
      throw new Error('No se pudo crear la orden de pago PayPal');
    }
  }

  /**
   * Capturar pago de PayPal
   */
  async capturarPagoPayPal(data: PayPalCaptureRequest): Promise<any> {
    try {
      return await apiClient.post('/api/clientes/paypal/capture-payment', data);
    } catch (error) {
      console.error('Error al capturar pago PayPal:', error);
      throw new Error('No se pudo capturar el pago PayPal');
    }
  }
}

// Instancia exportada del servicio
export const pagoService = new PagoService();
