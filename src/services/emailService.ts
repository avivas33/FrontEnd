import { apiClient } from '../config/api';

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface ConfirmacionPagoData {
  clienteEmail: string;
  clienteNombre: string;
  facturas: Array<{
    numero: string;
    monto: number;
  }>;
  montoTotal: number;
  metodoPago: string;
  fechaPago: string;
  numeroRecibo: string;
}

export interface RecordatorioFacturaData {
  clienteEmail: string;
  clienteNombre: string;
  facturas: Array<{
    numero: string;
    monto: number;
    fechaVencimiento: string;
  }>;
  montoTotal: number;
}

export interface BienvenidaData {
  clienteEmail: string;
  clienteNombre: string;
  clienteCode: string;
  credenciales?: {
    usuario: string;
    passwordTemporal: string;
  };
}

export class EmailService {
  
  /**
   * Enviar email genérico
   */
  async enviarEmail(data: EmailData): Promise<{ success: boolean; messageId?: string }> {
    try {
      return await apiClient.post('/api/clientes/email/send', data);
    } catch (error) {
      console.error('Error al enviar email:', error);
      throw new Error('No se pudo enviar el email');
    }
  }

  /**
   * Enviar confirmación de pago
   */
  async enviarConfirmacionPago(data: ConfirmacionPagoData): Promise<{ success: boolean; messageId?: string }> {
    try {
      return await apiClient.post('/api/clientes/email/payment-confirmation', data);
    } catch (error) {
      console.error('Error al enviar confirmación de pago:', error);
      throw new Error('No se pudo enviar la confirmación de pago');
    }
  }

  /**
   * Enviar recordatorio de factura
   */
  async enviarRecordatorioFactura(data: RecordatorioFacturaData): Promise<{ success: boolean; messageId?: string }> {
    try {
      return await apiClient.post('/api/clientes/email/invoice-reminder', data);
    } catch (error) {
      console.error('Error al enviar recordatorio de factura:', error);
      throw new Error('No se pudo enviar el recordatorio de factura');
    }
  }

  /**
   * Enviar email de bienvenida
   */
  async enviarEmailBienvenida(data: BienvenidaData): Promise<{ success: boolean; messageId?: string }> {
    try {
      return await apiClient.post('/api/clientes/email/welcome', data);
    } catch (error) {
      console.error('Error al enviar email de bienvenida:', error);
      throw new Error('No se pudo enviar el email de bienvenida');
    }
  }

  /**
   * Obtener plantillas de email disponibles
   */
  async getPlantillasEmail(): Promise<Array<{ id: string; nombre: string; descripcion: string }>> {
    try {
      return await apiClient.get('/api/clientes/email/plantillas');
    } catch (error) {
      console.error('Error al obtener plantillas de email:', error);
      // Retornar plantillas por defecto en caso de error
      return [
        { id: 'payment-confirmation', nombre: 'Confirmación de Pago', descripcion: 'Confirma el pago realizado' },
        { id: 'invoice-reminder', nombre: 'Recordatorio de Factura', descripcion: 'Recordatorio de facturas pendientes' },
        { id: 'welcome', nombre: 'Bienvenida', descripcion: 'Email de bienvenida para nuevos clientes' }
      ];
    }
  }

  /**
   * Validar formato de email
   */
  static validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Instancia exportada del servicio
export const emailService = new EmailService();
