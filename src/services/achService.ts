import { API_CONFIG } from '@/config/api';

export interface BankInfo {
  beneficiary: string;
  bank: string;
  accountNumber: string;
  accountType: string;
}

export interface ACHInstructions {
  title: string;
  steps: string[];
  bankDetails: {
    title: string;
    banks: BankInfo[];
  };
}

export const achService = {
  /**
   * Obtiene las instrucciones de pago ACH desde la API para una empresa específica
   * @param companyCode - Código de la empresa (2 para Networks, 3 para Quantum)
   */
  async getACHInstructions(companyCode?: string): Promise<ACHInstructions> {
    try {
      // Si no se especifica empresa, usar empresa 2 por defecto
      const endpoint = companyCode 
        ? `${API_CONFIG.BASE_URL}/api/clientes/ach-instructions/${companyCode}`
        : `${API_CONFIG.BASE_URL}/api/clientes/ach-instructions`;
      
      console.log('Solicitando instrucciones ACH desde:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Respuesta ACH - Status:', response.status, 'Status Text:', response.statusText);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        console.log('Content-Type de respuesta:', contentType);
        
        if (contentType && contentType.includes('text/html')) {
          // Si recibimos HTML, es probable que sea una página de error
          const htmlText = await response.text();
          console.error('Respuesta HTML recibida (probablemente error 404/500):', htmlText.substring(0, 200));
          throw new Error(`Error HTTP ${response.status}: El endpoint ACH no está disponible`);
        }
        
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Respuesta no es JSON:', text.substring(0, 200));
        throw new Error('El servidor no devolvió datos JSON válidos');
      }
      
      const data = await response.json();
      console.log('Datos ACH recibidos:', data);
      
      if (data.success && data.data) {
        return data.data;
      }
      
      // Si no hay datos, retornar valores por defecto
      console.warn('No se recibieron datos ACH, usando valores por defecto');
      return this.getDefaultACHInstructions();
      
    } catch (error) {
      console.error('Error al obtener instrucciones ACH:', error);
      // Retornar valores por defecto en caso de error
      return this.getDefaultACHInstructions();
    }
  },

  /**
   * Retorna las instrucciones ACH por defecto
   */
  getDefaultACHInstructions(): ACHInstructions {
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
        banks: [
          {
            beneficiary: "CELERO S.A.",
            bank: "Banco General",
            accountNumber: "03-01-01-123456-7",
            accountType: "Cuenta Corriente"
          }
        ]
      }
    };
  }
};