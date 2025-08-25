import { apiClient } from '@/config/api';

export interface SolicitudCodigoVerificacion {
  email: string;
  clienteCode: string;
  tipoConsulta: 'facturas' | 'recibos';
}

export interface VerificarCodigoRequest {
  email: string;
  codigo: string;
  clienteCode: string;
  tipoConsulta: 'facturas' | 'recibos';
}

export interface ResponseVerificacion {
  mensaje: string;
  email?: string;
  tipoConsulta?: 'facturas' | 'recibos';
  clienteCode?: string;
}

export const verificacionService = {
  solicitarCodigo: async (request: SolicitudCodigoVerificacion): Promise<ResponseVerificacion> => {
    try {
      const response = await apiClient.post('/api/verificacion/solicitar-codigo', request);
      return response.data;
    } catch (error) {
      console.error('Error en solicitar código - detalles:', {
        error,
        request,
        endpoint: '/api/verificacion/solicitar-codigo'
      });
      
      // Fallback temporal mientras se soluciona el backend
      if (error instanceof Error && error.message.includes('500')) {
        throw new Error(`El servicio de verificación no está disponible temporalmente. 
        
Datos enviados: ${JSON.stringify(request, null, 2)}

Por favor contacta al equipo de backend para verificar:
1. Que el endpoint /api/verificacion/solicitar-codigo esté implementado
2. Los logs del servidor para ver el error específico
3. La estructura de datos esperada`);
      }
      
      throw error;
    }
  },

  verificarCodigo: async (request: VerificarCodigoRequest): Promise<ResponseVerificacion> => {
    try {
      const response = await apiClient.post('/api/verificacion/verificar-codigo', request);
      return response.data;
    } catch (error) {
      console.error('Error en verificar código:', error);
      throw error;
    }
  }
};