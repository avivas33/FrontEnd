import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ApiStatusIndicatorProps {
  checkIntervalMs?: number;
}

const ApiStatusIndicator = ({ checkIntervalMs }: ApiStatusIndicatorProps) => {
  const [status, setStatus] = useState<'loading' | 'healthy' | 'unhealthy'>('loading');
  const [apiService, setApiService] = useState('');

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${apiBaseUrl}/api/clientes/health`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'healthy') {
            setStatus('healthy');
            setApiService(data.service || 'API');
          } else {
            setStatus('unhealthy');
            setApiService(data.service || 'API');
          }
        } else {
          setStatus('unhealthy');
          setApiService('API');
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setStatus('unhealthy');
        setApiService('API');
      }
    };

    // Solo ejecutar una vez al cargar
    checkApiHealth();

    // Solo configurar intervalo si se especifica checkIntervalMs
    if (checkIntervalMs) {
      const intervalId = setInterval(checkApiHealth, checkIntervalMs);
      return () => clearInterval(intervalId);
    }
  }, [checkIntervalMs]);

  const getStatusInfo = () => {
    switch (status) {
      case 'healthy':
        return {
          color: 'bg-green-500',
          text: `${apiService} Operacional`,
        };
      case 'unhealthy':
        return {
          color: 'bg-red-500',
          text: `Problemas con ${apiService}`,
        };
      default:
        return {
          color: 'bg-gray-400 animate-pulse',
          text: 'Verificando estado...',
        };
    }
  };

  const { color, text } = getStatusInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer">
            <span className={`relative flex h-3 w-3`}>
              <span className={`absolute inline-flex h-full w-full rounded-full ${color} ${status !== 'loading' ? 'animate-ping' : ''} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`}></span>
            </span>
            <span className="text-sm text-gray-400 hidden sm:inline">
              {status === 'healthy' ? 'Servicio Conectado' : status === 'unhealthy' ? 'Servicio Desconectado' : 'Conectando...'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ApiStatusIndicator;
