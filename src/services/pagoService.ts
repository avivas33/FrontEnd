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
  InvoiceDetails?: Array<{
    InvoiceNumber: string;
    Amount: number;
  }>;
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

export interface YappyFrontendRequest {
  yappyPhone: string;
  clienteCode: string;
  emailCliente: string;
  invoiceDetails: Array<{
    invoiceNumber: string;
    amount: number;
  }>;
}

export interface ReciboData {
  serNr: string;
  transDate: string;
  payMode: string;
  person: string;
  cuCode: string;
  refStr: string;
  email?: string; // Campo opcional para el email del cliente
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
  invoiceDetails?: Array<{
    invoiceNumber: string;
    amount: number;
  }>;
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
  emailCliente?: string;
  invoiceDetails?: Array<{
    invoiceNumber: string;
    amount: number;
  }>;
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
   * Crear orden de pago Yappy con detalles de facturas (frontend)
   */
  async crearOrdenYappyFrontend(data: YappyFrontendRequest): Promise<any> {
    try {
      return await apiClient.post('/api/clientes/yappy/crear-orden-frontend', data);
    } catch (error) {
      console.error('Error al crear orden Yappy frontend:', error);
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
    } catch (error: any) {
      console.error('Error al capturar pago PayPal:', error);
      
      // Verificar si el error es porque la orden ya fue capturada
      if (error.response?.data?.errorCode === 'UNPROCESSABLE_ENTITY' && 
          error.response?.data?.message?.includes('Order already captured')) {
        console.log('PayPal order already captured, treating as success');
        
        // Tratar como éxito pero indicar que ya estaba capturada
        return {
          success: true,
          message: 'Pago PayPal ya procesado exitosamente',
          data: {
            transactionId: data.orderId,
            receiptNumber: 'PENDING', // Se asignará después del registro en ERP
            alreadyCaptured: true
          }
        };
      }
      
      throw new Error('No se pudo capturar el pago PayPal');
    }
  }
}

// Instancia exportada del servicio
export const pagoService = new PagoService();
