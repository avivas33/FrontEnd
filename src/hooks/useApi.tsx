import { useState, useEffect, useCallback } from 'react';
import { handleApiError, type ApiResponse, type ErrorResponse } from '../services';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Hook personalizado para manejar llamadas a la API
 */
export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const executeCall = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      const errorResponse = handleApiError(err);
      setError(errorResponse.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiCall, ...dependencies]);

  useEffect(() => {
    executeCall();
  }, [executeCall]);

  const retry = useCallback(() => {
    executeCall();
  }, [executeCall]);

  return { data, loading, error, retry };
}

/**
 * Hook para ejecutar llamadas a la API bajo demanda
 */
export function useApiMutation<T, P = any>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (apiCall: (params: P) => Promise<T>, params: P): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall(params);
      setData(result);
      return result;
    } catch (err) {
      const errorResponse = handleApiError(err);
      setError(errorResponse.message);
      setData(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

/**
 * Hook específico para datos de cliente
 */
export function useCliente(codigoCliente: string) {
  return useApi(
    () => import('../services').then(({ clienteService }) => 
      clienteService.getCliente(codigoCliente)
    ),
    [codigoCliente]
  );
}

/**
 * Hook específico para facturas de cliente
 */
export function useFacturas(codigoCliente: string, tipo: 'todas' | 'abiertas' | 'filtradas' = 'abiertas') {
  return useApi(
    () => import('../services').then(({ clienteService }) => {
      switch (tipo) {
        case 'todas':
          return clienteService.getFacturas(codigoCliente);
        case 'filtradas':
          return clienteService.getFacturasFiltradas(codigoCliente);
        default:
          return clienteService.getFacturasAbiertas(codigoCliente);
      }
    }),
    [codigoCliente, tipo]
  );
}

/**
 * Hook para manejar pagos
 */
export function usePago() {
  return useApiMutation();
}

/**
 * Hook para manejar emails
 */
export function useEmail() {
  return useApiMutation();
}

/**
 * Hook para verificar reCAPTCHA
 */
export function useRecaptcha() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verificar = useCallback(async (token: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const { clienteService } = await import('../services');
      const result = await clienteService.verificarRecaptcha(token);
      
      return result.success;
    } catch (err) {
      const errorResponse = handleApiError(err);
      setError(errorResponse.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { verificar, loading, error };
}
