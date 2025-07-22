// Servicios centralizados para la aplicación Celero Self-Service
export { clienteService, type Cliente, type Factura, type ReciboData } from './clienteService';
export { pagoService, type DatosTarjeta, type DatosYappy, type OrdenYappyResponse } from './pagoService';
export { 
  emailService, 
  type EmailData, 
  type ConfirmacionPagoData, 
  type RecordatorioFacturaData, 
  type BienvenidaData 
} from './emailService';

// Re-exportar la configuración de API
export { API_CONFIG, apiClient, buildApiUrl } from '../config/api';

// Tipos de respuesta comunes
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode?: number;
}

// Helper para manejo de errores de API
export const handleApiError = (error: any): ErrorResponse => {
  console.error('API Error:', error);
  
  if (error instanceof Error) {
    return {
      success: false,
      error: error.name,
      message: error.message
    };
  }
  
  return {
    success: false,
    error: 'UnknownError',
    message: 'Ocurrió un error inesperado'
  };
};

// Helper para validaciones comunes
export const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  telefono: (telefono: string): boolean => {
    const telefonoRegex = /^\+?[\d\s\-\(\)]{8,15}$/;
    return telefonoRegex.test(telefono);
  },
  
  monto: (monto: number): boolean => {
    return monto > 0 && Number.isFinite(monto);
  },
  
  clienteCode: (code: string): boolean => {
    return /^CU-\d{5}$/.test(code);
  }
};
