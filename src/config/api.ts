// Configuración centralizada de la API
export const API_CONFIG = {
  BASE_URL: import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://api.celero.network'),
  TIMEOUT: 30000, // 30 segundos
  RECAPTCHA_SITE_KEY: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6Lfj1mArAAAAAIkj3BJGhSMpIdUT6qnCa1aUMrRN',
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Helper para construir URLs de API
export const buildApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_CONFIG.BASE_URL}${cleanEndpoint}`;
};

// Cliente HTTP básico usando fetch
export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: HeadersInit;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.defaultHeaders = API_CONFIG.DEFAULT_HEADERS;
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.defaultHeaders,
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async get(endpoint: string, params?: Record<string, string>): Promise<any> {
    const apiUrl = buildApiUrl(endpoint);
    
    // Si es una URL relativa (para proxy), usar URLSearchParams
    let finalUrl = apiUrl;
    if (params) {
      const searchParams = new URLSearchParams(params);
      finalUrl += `?${searchParams.toString()}`;
    }

    const response = await this.fetchWithTimeout(finalUrl);
    return response.json();
  }

  async post(endpoint: string, data?: any): Promise<any> {
    const response = await this.fetchWithTimeout(buildApiUrl(endpoint), {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
    return response.json();
  }

  async put(endpoint: string, data?: any): Promise<any> {
    const response = await this.fetchWithTimeout(buildApiUrl(endpoint), {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
    return response.json();
  }

  async delete(endpoint: string): Promise<any> {
    const response = await this.fetchWithTimeout(buildApiUrl(endpoint), {
      method: 'DELETE'
    });
    return response.json();
  }
}

// Instancia global del cliente API
export const apiClient = new ApiClient();
