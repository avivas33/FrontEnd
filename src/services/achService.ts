import { API_CONFIG } from '@/config/api';

export interface ACHInstructions {
  title: string;
  steps: string[];
  bankDetails: {
    title: string;
    bank: string;
    accountNumber: string;
    beneficiary: string;
  };
}

export const achService = {
  /**
   * Obtiene las instrucciones de pago ACH desde la API
   */
  async getACHInstructions(): Promise<ACHInstructions> {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/clientes/ach-instructions`);
      
      if (!response.ok) {
        throw new Error('Error al obtener instrucciones ACH');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      // Si no hay datos, retornar valores por defecto
      return {
        title: "Instrucciones para pago ACH:",
        steps: [
          "Realice la transferencia ACH a la cuenta bancaria de Celero",
          "Tome una captura o foto del comprobante de transferencia",
          "Complete los datos de la transacción arriba",
          "Suba el comprobante usando el botón de arriba",
          "Confirme el pago para completar el proceso"
        ],
        bankDetails: {
          title: "Datos bancarios:",
          bank: "Banco General",
          accountNumber: "03-01-01-123456-7",
          beneficiary: "CELERO S.A."
        }
      };
    } catch (error) {
      console.error('Error al obtener instrucciones ACH:', error);
      // Retornar valores por defecto en caso de error
      return {
        title: "Instrucciones para pago ACH:",
        steps: [
          "Realice la transferencia ACH a la cuenta bancaria de Celero",
          "Tome una captura o foto del comprobante de transferencia",
          "Complete los datos de la transacción arriba",
          "Suba el comprobante usando el botón de arriba",
          "Confirme el pago para completar el proceso"
        ],
        bankDetails: {
          title: "Datos bancarios:",
          bank: "Banco General",
          accountNumber: "03-01-01-123456-7",
          beneficiary: "CELERO S.A."
        }
      };
    }
  }
};