import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Shield, Users, Globe, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface DashboardMetrics {
  totalRequests: number;
  activeUsers: number;
  securityScore: number;
  threatLevel: 'low' | 'medium' | 'high';
  systemHealth: number;
  responseTime: number;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'payment' | 'login' | 'security' | 'system';
  message: string;
  status: 'success' | 'warning' | 'error';
}

export const SimpleActivityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRequests: 0,
    activeUsers: 0,
    securityScore: 0,
    threatLevel: 'low',
    systemHealth: 0,
    responseTime: 0
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simular datos en tiempo real
  useEffect(() => {
    const generateMockData = () => {
      return {
        totalRequests: Math.floor(Math.random() * 1000) + 500,
        activeUsers: Math.floor(Math.random() * 50) + 10,
        securityScore: Math.floor(Math.random() * 30) + 70,
        threatLevel: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
        systemHealth: Math.floor(Math.random() * 20) + 80,
        responseTime: Math.floor(Math.random() * 100) + 50
      };
    };

    const generateMockLogs = (): ActivityLog[] => {
      const types: ActivityLog['type'][] = ['payment', 'login', 'security', 'system'];
      const statuses: ActivityLog['status'][] = ['success', 'warning', 'error'];
      const messages = [
        'Pago procesado exitosamente',
        'Usuario autenticado',
        'Intento de acceso sospechoso detectado',
        'Sistema actualizado',
        'Nueva factura generada',
        'Respaldo de base de datos completado',
        'Conexión SSL verificada',
        'Monitoreo de seguridad activo'
      ];

      return Array.from({ length: 5 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: new Date(Date.now() - i * 60000).toLocaleTimeString(),
        type: types[Math.floor(Math.random() * types.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)]
      }));
    };

    // Cargar datos iniciales
    setMetrics(generateMockData());
    setActivityLogs(generateMockLogs());
    setIsLoading(false);

    // Actualizar datos cada 5 segundos
    const interval = setInterval(() => {
      setMetrics(generateMockData());
      setActivityLogs(generateMockLogs());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ActivityLog['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Actividad</h1>
        </div>
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Actividad</h1>
        </div>
        <Badge variant="outline" className="text-sm">
          Última actualización: {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes Total</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +12% desde ayer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +5% desde la última hora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntuación de Seguridad</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.securityScore}%</div>
            <Progress value={metrics.securityScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo de Respuesta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responseTime}ms</div>
            <p className="text-xs text-muted-foreground">Promedio últimos 5 min</p>
          </CardContent>
        </Card>
      </div>

      {/* Estado del sistema y amenazas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Estado de Seguridad</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nivel de Amenaza</span>
              <Badge className={getThreatLevelColor(metrics.threatLevel)}>
                {metrics.threatLevel.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Salud del Sistema</span>
              <div className="flex items-center space-x-2">
                <Progress value={metrics.systemHealth} className="w-20" />
                <span className="text-sm">{metrics.systemHealth}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Actividad Reciente</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityLogs.map((log) => (
                <div key={log.id} className="flex items-center space-x-3 text-sm">
                  {getStatusIcon(log.status)}
                  <span className="flex-1">{log.message}</span>
                  <span className="text-muted-foreground">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado en tiempo real */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Monitoreo en Tiempo Real</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse">
              <Activity className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <p className="text-lg font-medium">Sistema Activo</p>
              <p className="text-sm text-muted-foreground">
                Monitoreando actividad y métricas de seguridad
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
