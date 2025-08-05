import { apiClient, API_CONFIG } from '../config/api';

export interface Cliente {
  Code: string;
  Name: string;
  eMail: string;
  Mobile: string;
  [key: string]: any;
}

export interface Factura {
  SerNr: string;
  OfficialSerNr: string;
  InvDate: string;
  PayDate: string;
  Sum4: string;
  PayDeal: string;
  FormaPago: string;
  Installment?: string | null;
  ITBMS: string;
  CompanyCode: string;
  CompanyName: string;
  CompanyShortName: string;
  [key: string]: any;
}

export interface EmpresaProcesada {
  CompCode: string;
  CompName: string;
  ShortName: string;
  ActiveStatus: string;
}

export interface FacturasFiltradasResponse {
  value?: {
    data: {
      facturas: Factura[];
      totalFacturas: number;
      empresasProcesadas: EmpresaProcesada[];
      errores: any;
      performance: {
        procesamientoParalelo: boolean;
        empresasEnParalelo: number;
        consultasSimultaneas: number;
        timestamp: string;
      };
    };
  };
  data?: {
    facturas: Factura[];
    totalFacturas: number;
    empresasProcesadas: EmpresaProcesada[];
    errores: any;
    performance: {
      procesamientoParalelo: boolean;
      empresasEnParalelo: number;
      consultasSimultaneas: number;
      timestamp: string;
    };
  };
}

export interface ReciboData {
  clienteCode: string;
  facturas: string[];
  monto: number;
  metodoPago: string;
  [key: string]: any;
}

export interface DetalleRecibo {
  id: string;
  invoiceNr: string;
  recVal: string;
  recValNum: number;
  payDate: string;
  stp: string;
  custCode: string;
}

export interface ReciboCaja {
  id: string;
  serNr: string;
  transDate: string;
  transDateFormatted: string;
  curPayVal: string;
  curPayValNum: number;
  person: string;
  refStr: string;
  comment: string;
  custCode: string;
  payMode: string;
  detalles: DetalleRecibo[];
  totalDetalles: number;
}

export interface RecibosCajaResponse {
  success: boolean;
  message: string;
  data: ReciboCaja[];
  meta: {
    total: number;
    totalRecaudado: number;
    totalRecaudadoFormatted: string;
    empresa: {
      compCode: string;
      compName: string;
      shortName: string;
    };
    filtros: {
      fechaInicio: string;
      fechaFin: string;
      custCode: string;
      companyCode: string;
    };
    timestamp: string;
    apiUrl: string;
  };
}

export class ClienteService {
  
  /**
   * Obtener información de cliente
   */
  async getCliente(range: string = 'CU-20037'): Promise<{ data: { CUVc: Cliente[] } }> {
    try {
      return await apiClient.get('/api/clientes', { range });
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      throw new Error('No se pudo obtener la información del cliente');
    }
  }

  /**
   * Obtener facturas de cliente
   */
  async getFacturas(range: string = 'CU-21541'): Promise<{ data: { facturas: Factura[] } }> {
    try {
      return await apiClient.get('/api/clientes/facturas', { range });
    } catch (error) {
      console.error('Error al obtener facturas:', error);
      throw new Error('No se pudieron obtener las facturas');
    }
  }

  /**
   * Obtener facturas abiertas
   */
  async getFacturasAbiertas(range: string = 'CU-21541'): Promise<{ data: { facturas: Factura[] } }> {
    try {
      return await apiClient.get('/api/clientes/facturas-abiertas', { range });
    } catch (error) {
      console.error('Error al obtener facturas abiertas:', error);
      throw new Error('No se pudieron obtener las facturas abiertas');
    }
  }

  /**
   * Obtener facturas filtradas
   */
  async getFacturasFiltradas(range: string = 'CU-21541', filtros?: Record<string, string>): Promise<FacturasFiltradasResponse> {
    try {
      const params = { range, ...filtros };
      return await apiClient.get('/api/clientes/facturas-filtradas', params);
    } catch (error) {
      console.error('Error al obtener facturas filtradas:', error);
      throw new Error('No se pudieron obtener las facturas filtradas');
    }
  }

  /**
   * Obtener facturas por empresa específica
   */
  async getFacturasPorEmpresa(empresaCode: string, params: {
    range: string;
    fields?: string;
    sort?: string;
    filterCustCode: string;
  }): Promise<{ data: { IVVc: any[]; totalCount: number } }> {
    try {
      const queryParams: Record<string, string> = {
        range: params.range,
        'filter.CustCode': params.filterCustCode
      };
      
      if (params.fields) queryParams.fields = params.fields;
      if (params.sort) queryParams.sort = params.sort;
      
      return await apiClient.get(`/api/clientes/facturas/${empresaCode}`, queryParams);
    } catch (error) {
      console.error('Error al obtener facturas por empresa:', error);
      throw new Error('No se pudieron obtener las facturas de la empresa');
    }
  }

  /**
   * Obtener recibos de caja
   */
  async getRecibosCaja(params: {
    fechaInicio: string;
    fechaFin: string;
    custCode: string;
    companyCode?: string;
  }): Promise<RecibosCajaResponse> {
    try {
      return await apiClient.get('/api/clientes/recibos-caja', params);
    } catch (error) {
      console.error('Error al obtener recibos de caja:', error);
      throw new Error('No se pudieron obtener los recibos de caja');
    }
  }

  /**
   * Crear recibo de pago
   */
  async crearRecibo(data: ReciboData): Promise<any> {
    try {
      return await apiClient.post('/api/clientes/recibos', data);
    } catch (error) {
      console.error('Error al crear recibo:', error);
      throw new Error('No se pudo crear el recibo de pago');
    }
  }

  /**
   * Verificar Google reCAPTCHA
   */
  async verificarRecaptcha(token: string): Promise<{ success: boolean }> {
    try {
      return await apiClient.post('/api/clientes/verificar-recaptcha', { token });
    } catch (error) {
      console.error('Error al verificar reCAPTCHA:', error);
      throw new Error('No se pudo verificar el reCAPTCHA');
    }
  }

  /**
   * Registrar pago ACH con foto de comprobante
   */
  async registrarPagoACH(data: {
    clienteCode: string;
    numeroFactura: string;
    empresaCode: string;
    numeroTransaccion: string;
    montoTransaccion: number;
    fechaTransaccion: Date;
    observaciones?: string;
    usuarioRegistro?: string;
    fotoComprobante: File;
  }): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('ClienteCode', data.clienteCode);
      formData.append('NumeroFactura', data.numeroFactura);
      formData.append('EmpresaCode', data.empresaCode);
      formData.append('NumeroTransaccion', data.numeroTransaccion);
      formData.append('MontoTransaccion', data.montoTransaccion.toString());
      formData.append('FechaTransaccion', data.fechaTransaccion.toISOString());
      formData.append('FotoComprobante', data.fotoComprobante);
      
      if (data.observaciones) {
        formData.append('Observaciones', data.observaciones);
      }
      if (data.usuarioRegistro) {
        formData.append('UsuarioRegistro', data.usuarioRegistro);
      }

      const url = `${API_CONFIG.BASE_URL}/api/clientes/pago-ach`;
      console.log(`Registrando pago ACH: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        console.error(`Error HTTP: ${response.status} - ${response.statusText}`);
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`Pago ACH registrado exitosamente:`, result);
      return result;
    } catch (error) {
      console.error(`Error al registrar pago ACH:`, error);
      throw new Error(`No se pudo registrar el pago ACH`);
    }
  }

  /**
   * Consultar pagos ACH
   */
  async consultarPagosACH(filtros?: {
    clienteCode?: string;
    empresaCode?: string;
    estado?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.clienteCode) params.append('clienteCode', filtros.clienteCode);
      if (filtros?.empresaCode) params.append('empresaCode', filtros.empresaCode);
      if (filtros?.estado) params.append('estado', filtros.estado);
      if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde.toISOString());
      if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta.toISOString());

      const url = `${API_CONFIG.BASE_URL}/api/clientes/pago-ach?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error al consultar pagos ACH:', error);
      throw new Error('No se pudieron consultar los pagos ACH');
    }
  }

  /**
   * Obtener facturas por rango de fecha
   */
  async getFacturasPorRangoFecha(params: {
    range: string;
    fields?: string;
    sort?: string;
    filterCustCode: string;
    companyCode?: string;
  }): Promise<{ data: { facturas: Factura[] } }> {
    try {
      const queryParams = new URLSearchParams();
      
      // Agregar parámetros a la URL
      if (params.range) queryParams.append('range', params.range);
      if (params.fields) queryParams.append('fields', params.fields);
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.filterCustCode) queryParams.append('filter.CustCode', params.filterCustCode);
      
      // Si se especifica una empresa, agregar el filtro
      if (params.companyCode) {
        queryParams.append('companyCode', params.companyCode);
      }
      
      const url = `/api/clientes/facturas?${queryParams.toString()}`;
      
      return await apiClient.get(url);
    } catch (error) {
      console.error('Error al obtener facturas por rango de fecha:', error);
      throw new Error('No se pudieron obtener las facturas por rango de fecha');
    }
  }

  /**
   * Obtener métodos de pago disponibles por empresa
   */
  async getPaymentMethodsByCompany(empresaCode: string): Promise<{
    success: boolean;
    data?: {
      paymentMethods: {
        creditCard: { enabled: boolean };
        yappy: { enabled: boolean };
        paypal?: { enabled: boolean };
        ach: { enabled: boolean };
      };
    };
    message?: string;
  }> {
    try {
      const response = await apiClient.get(`/api/clientes/payment-methods/${empresaCode}`);
      return response;
    } catch (error) {
      console.error('Error al obtener métodos de pago por empresa:', error);
      
      // Retornar métodos de pago por defecto si falla la API
      return {
        success: true,
        data: {
          paymentMethods: {
            creditCard: { enabled: true },
            yappy: { enabled: true },
            paypal: { enabled: true },
            ach: { enabled: true }
          }
        }
      };
    }
  }

  /**
   * Descargar PDF de factura
   */
  async downloadPdf(noFactura: string, empresa: string): Promise<Blob> {
    try {
      // Usar la ruta correcta del endpoint con empresa
      const url = `${API_CONFIG.BASE_URL}/api/clientes/download-pdf/${empresa}/${noFactura}`;
      console.log(`Intentando descargar PDF desde: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        console.error(`Error HTTP: ${response.status} - ${response.statusText}`);
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log(`PDF descargado exitosamente para factura: ${noFactura}, tamaño: ${blob.size} bytes`);
      return blob;
    } catch (error) {
      console.error(`Error al descargar PDF para factura ${noFactura}:`, error);
      throw new Error(`No se pudo descargar el PDF de la factura ${noFactura}`);
    }
  }
}

// Instancia exportada del servicio
export const clienteService = new ClienteService();
