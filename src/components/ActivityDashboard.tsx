import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Activity,
  Users,
  CreditCard,
  Clock,
  Shield,
  DollarSign,
  Eye,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Globe,
  Smartphone,
  MapPin,
  Zap,
  Target,
  BarChart3,
  PieChart
} from 'lucide-react';

interface DashboardData {
  general: {
    totalEvents: number;
    uniqueClients: number;
    uniqueSessions: number;
    totalRequests: number;
    averageResponseTime: number;
    bounceRate: number;
    avgSessionDuration: number;
    peakHour: string;
  };
  security: {
    suspiciousIPs: number;
    sharedFingerprints: number;
    multipleTimeZoneClients: number;
    rapidFireAttempts: number;
    failedPayments: number;
    threatScore: number;
    blockedAttempts: number;
    vpnDetections: number;
  };
  paymentStats: {
    totalAttempts: number;
    successfulPayments: number;
    failedPayments: number;
    totalAmount: number;
    successAmount: number;
    successRate: number;
    avgTransactionValue: number;
    paymentMethodBreakdown: Record<string, number>;
    errorCodeBreakdown: Record<string, number>;
    hourlyStats: Array<{ hour: number; attempts: number; success: number; }>;
  };
  geography: {
    topCountries: Array<{ country: string; count: number; successRate: number; }>;
    suspiciousRegions: Array<{ region: string; riskScore: number; }>;
  };
  devices: {
    browserBreakdown: Record<string, number>;
    osBreakdown: Record<string, number>;
    mobileVsDesktop: { mobile: number; desktop: number; };
  };
  topFailedIPs: Array<{
    identifier: string;
    count: number;
    lastSeen: string;
    relatedClients: string[];
    riskLevel: string;
    location?: string;
  }>;
  recentSuspiciousActivity: Array<{
    timestamp: string;
    eventType: string;
    clientId: string;
    ipAddress: string;
    description: string;
    severity: string;
    location?: string;
    device?: string;
  }>;
}

interface LiveMetric {
  metricType: string;
  label: string;
  value: number;
  previousValue: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export const ActivityDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamConnected, setStreamConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  useEffect(() => {
    let isMounted = true;
    
    if (isMounted) {
      loadDashboard();
    }
    
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && isMounted) {
      interval = setInterval(() => {
        if (isMounted) {
          loadDashboard();
        }
      }, refreshInterval);
    }
    
    // Conectar al stream de métricas en tiempo real solo una vez
    if (isMounted) {
      connectToMetricsStream();
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, []); // Ejecutar solo una vez al montar

  // useEffect separado para cambios en selectedTimeRange
  useEffect(() => {
    let isMounted = true;
    
    if (isMounted) {
      loadDashboard();
    }
    
    return () => {
      isMounted = false;
    };
  }, [selectedTimeRange]);

  const loadDashboard = async () => {
    try {
      // En desarrollo usar proxy, en producción usar URL directa
      const baseUrl = import.meta.env.DEV ? '' : 'https://api.celero.network';
      const response = await fetch(`${baseUrl}/api/activitylog/dashboard?timeRange=${selectedTimeRange}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar métricas del dashboard');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const baseUrl = import.meta.env.DEV ? '' : 'https://api.celero.network';
      const response = await fetch(`${baseUrl}/api/activitylog/export?timeRange=${selectedTimeRange}&format=csv`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity_report_${selectedTimeRange}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const connectToMetricsStream = () => {
    // En desarrollo usar proxy, en producción usar URL directa
    const baseUrl = import.meta.env.DEV ? '' : 'https://api.celero.network';
    const eventSource = new EventSource(`${baseUrl}/api/activitylog/metrics/stream`);
    
    eventSource.onopen = () => {
      setStreamConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.metrics) {
          setLiveMetrics(data.metrics);
        }
      } catch (err) {
        console.error('Error parsing stream data:', err);
      }
    };

    eventSource.onerror = () => {
      setStreamConnected(false);
      eventSource.close();
      // Reintentar conexión después de 5 segundos
      setTimeout(connectToMetricsStream, 5000);
    };

    return () => {
      eventSource.close();
    };
  };

  const getThreatLevelColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getThreatLevelText = (score: number) => {
    if (score >= 70) return 'Crítico';
    if (score >= 40) return 'Moderado';
    return 'Bajo';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-PA').format(num);
  };

  const getRiskBadgeVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityBadgeVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'Critical': return 'destructive';
      case 'Warning': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="animate-spin h-8 w-8" />
        <span className="ml-2">Cargando dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!dashboard) return null;

    return (
      <div className="p-4 space-y-6">
        {/* Header mejorado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Dashboard de Monitoreo de Actividad
            </h1>
            <p className="text-gray-600 mt-1">Análisis en tiempo real de seguridad y pagos</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Indicador de conexión mejorado */}
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
              <div className={`h-2 w-2 rounded-full ${streamConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-sm font-medium">
                {streamConnected ? 'En Vivo' : 'Desconectado'}
              </span>
            </div>
            
            {/* Controles de tiempo */}
            <select 
              value={selectedTimeRange} 
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="1h">Última hora</option>
              <option value="6h">Últimas 6 horas</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
            </select>
            
            {/* Botones de acción */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50 text-green-700' : ''}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto
            </Button>
            
            <Button variant="outline" size="sm" onClick={loadDashboard}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
            
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </div>
        </div>      {/* Métricas en tiempo real mejoradas */}
      {liveMetrics.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Métricas en Tiempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {liveMetrics.map((metric) => (
                <div key={metric.metricType} className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      {metric.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {metric.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                      {metric.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                      <span className={`text-xs font-medium ${metric.changePercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {metric.value.toFixed(metric.metricType.includes('rate') ? 1 : 0)}
                    {metric.metricType.includes('rate') && '%'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs principales mejorados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total de Eventos</CardTitle>
            <Activity className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboard.general.totalEvents)}</div>
            <p className="text-xs opacity-75 mt-1">Eventos registrados</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Clientes Únicos</CardTitle>
            <Users className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboard.general.uniqueClients)}</div>
            <p className="text-xs opacity-75 mt-1">Usuarios activos</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Tasa de Éxito</CardTitle>
            <Target className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.paymentStats.successRate.toFixed(1)}%</div>
            <Progress value={dashboard.paymentStats.successRate} className="mt-2 bg-purple-400" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(dashboard.paymentStats.successAmount)}</div>
            <p className="text-xs opacity-75 mt-1">Pagos exitosos</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${dashboard.security.threatScore >= 70 ? 'from-red-500 to-red-600' : dashboard.security.threatScore >= 40 ? 'from-yellow-500 to-yellow-600' : 'from-green-500 to-green-600'} text-white`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Nivel de Amenaza</CardTitle>
            <Shield className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.security.threatScore.toFixed(0)}/100</div>
            <p className="text-xs opacity-75 mt-1">{getThreatLevelText(dashboard.security.threatScore)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard principal con pestañas */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="geography" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Geografía
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Dispositivos
          </TabsTrigger>
        </TabsList>

        {/* Pestaña de Resumen */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Métricas de rendimiento adicionales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Métricas de Rendimiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tiempo de Respuesta</span>
                    <span className="font-semibold">{dashboard.general.averageResponseTime.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sesiones Únicas</span>
                    <span className="font-semibold">{formatNumber(dashboard.general.uniqueSessions)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Duración Promedio de Sesión</span>
                    <span className="font-semibold">{dashboard.general.avgSessionDuration ? Math.round(dashboard.general.avgSessionDuration / 60) : 0}m</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tasa de Rebote</span>
                    <span className="font-semibold">{dashboard.general.bounceRate ? dashboard.general.bounceRate.toFixed(1) : 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Hora Pico</span>
                    <span className="font-semibold">{dashboard.general.peakHour || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumen de transacciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Resumen de Transacciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total de Intentos</span>
                    <span className="font-semibold">{formatNumber(dashboard.paymentStats.totalAttempts)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pagos Exitosos</span>
                    <span className="font-semibold text-green-600">{formatNumber(dashboard.paymentStats.successfulPayments)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pagos Fallidos</span>
                    <span className="font-semibold text-red-600">{formatNumber(dashboard.paymentStats.failedPayments)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Valor Promedio</span>
                    <span className="font-semibold">{formatCurrency(dashboard.paymentStats.avgTransactionValue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monto Total</span>
                    <span className="font-semibold">{formatCurrency(dashboard.paymentStats.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        {/* Pestaña de Seguridad */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Métricas de seguridad mejoradas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Análisis de Amenazas
                </CardTitle>
                <CardDescription>
                  Nivel de Amenaza: <span className={`font-bold px-2 py-1 rounded ${getThreatLevelColor(dashboard.security.threatScore)}`}>
                    {getThreatLevelText(dashboard.security.threatScore)} ({dashboard.security.threatScore.toFixed(0)}/100)
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{dashboard.security.suspiciousIPs}</p>
                    <p className="text-sm text-gray-600">IPs Sospechosas</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{dashboard.security.sharedFingerprints}</p>
                    <p className="text-sm text-gray-600">Huellas Compartidas</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{dashboard.security.multipleTimeZoneClients}</p>
                    <p className="text-sm text-gray-600">Clientes Multi-Zona</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{dashboard.security.rapidFireAttempts}</p>
                    <p className="text-sm text-gray-600">Intentos Rápidos</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{dashboard.security.blockedAttempts || 0}</p>
                    <p className="text-sm text-gray-600">Intentos Bloqueados</p>
                  </div>
                  <div className="text-center p-3 bg-indigo-50 rounded-lg">
                    <p className="text-2xl font-bold text-indigo-600">{dashboard.security.vpnDetections || 0}</p>
                    <p className="text-sm text-gray-600">Detecciones VPN</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top IPs fallidas mejorado */}
            <Card>
              <CardHeader>
                <CardTitle>Top de IPs con Riesgo</CardTitle>
                <CardDescription>IPs con actividad sospechosa o múltiples fallos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.topFailedIPs.slice(0, 5).map((ip, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{ip.identifier}</span>
                          <Badge variant={getRiskBadgeVariant(ip.riskLevel)} className="text-xs">
                            {ip.riskLevel === 'High' ? 'Alto' : ip.riskLevel === 'Medium' ? 'Medio' : 'Bajo'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-600">{ip.count} fallos</span>
                          <span className="text-xs text-gray-600">{ip.relatedClients.length} clientes</span>
                          {ip.location && (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ip.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(ip.lastSeen).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actividad sospechosa reciente mejorada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Actividad Sospechosa Reciente
              </CardTitle>
              <CardDescription>Últimos eventos de seguridad que requieren atención</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard.recentSuspiciousActivity.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getSeverityBadgeVariant(activity.severity)} className="text-xs">
                          {activity.severity === 'Critical' ? 'Crítico' : activity.severity === 'Warning' ? 'Advertencia' : activity.severity}
                        </Badge>
                        <span className="text-sm font-medium">{activity.eventType}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{activity.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Cliente: {activity.clientId}</span>
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {activity.ipAddress}
                        </span>
                        {activity.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {activity.location}
                          </span>
                        )}
                        {activity.device && (
                          <span className="flex items-center gap-1">
                            <Smartphone className="h-3 w-3" />
                            {activity.device}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 ml-4">
                      {new Date(activity.timestamp).toLocaleString('es-ES')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      {/* Top IPs fallidas */}
      <Card>
        <CardHeader>
          <CardTitle>Top de IPs con Pagos Fallidos</CardTitle>
          <CardDescription>IPs con múltiples intentos de pago fallidos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dashboard.topFailedIPs.map((ip, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <p className="font-mono text-sm">{ip.identifier}</p>
                  <p className="text-xs text-gray-600">
                    {ip.count} fallos • {ip.relatedClients.length} clientes
                  </p>
                </div>
                <Badge variant={getRiskBadgeVariant(ip.riskLevel)}>
                  {ip.riskLevel === 'High' ? 'Alto' : ip.riskLevel === 'Medium' ? 'Medio' : 'Bajo'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actividad sospechosa reciente */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Sospechosa Reciente</CardTitle>
          <CardDescription>Últimos eventos de seguridad que requieren atención</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dashboard.recentSuspiciousActivity.slice(0, 10).map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityBadgeVariant(activity.severity)}>
                      {activity.severity === 'Critical' ? 'Crítico' : activity.severity === 'Warning' ? 'Advertencia' : activity.severity}
                    </Badge>
                    <span className="text-sm font-medium">{activity.eventType}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    Cliente: {activity.clientId} • IP: {activity.ipAddress}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString('es-ES')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Pestaña de Pagos */}
        <TabsContent value="payments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Métodos de pago */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Distribución por Método de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboard.paymentStats.paymentMethodBreakdown || {}).map(([method, count]) => (
                    <div key={method} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{method}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(count / dashboard.paymentStats.totalAttempts) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Códigos de error */}
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Errores</CardTitle>
                <CardDescription>Códigos de error más frecuentes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboard.paymentStats.errorCodeBreakdown || {}).slice(0, 5).map(([code, count]) => (
                    <div key={code} className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span className="text-sm font-mono">{code}</span>
                      <span className="text-sm font-semibold text-red-600">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pestaña de Geografía */}
        <TabsContent value="geography" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top países */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Top Países por Actividad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.geography?.topCountries?.slice(0, 8).map((country, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{country.country}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">{country.count} eventos</span>
                        <span className={`text-sm font-semibold ${country.successRate >= 80 ? 'text-green-600' : country.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {country.successRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )) || <p className="text-gray-500">No hay datos geográficos disponibles</p>}
                </div>
              </CardContent>
            </Card>

            {/* Regiones sospechosas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Regiones de Alto Riesgo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.geography?.suspiciousRegions?.map((region, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <span className="text-sm font-medium">{region.region}</span>
                      <Badge variant="destructive">
                        Riesgo: {region.riskScore}/100
                      </Badge>
                    </div>
                  )) || <p className="text-gray-500">No hay regiones de riesgo identificadas</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pestaña de Dispositivos */}
        <TabsContent value="devices" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Navegadores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Navegadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(dashboard.devices?.browserBreakdown || {}).slice(0, 5).map(([browser, count]) => (
                    <div key={browser} className="flex items-center justify-between text-sm">
                      <span>{browser}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sistemas operativos */}
            <Card>
              <CardHeader>
                <CardTitle>Sistemas Operativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(dashboard.devices?.osBreakdown || {}).slice(0, 5).map(([os, count]) => (
                    <div key={os} className="flex items-center justify-between text-sm">
                      <span>{os}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Móvil vs Desktop */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Dispositivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Móvil</span>
                    <span className="font-semibold">{dashboard.devices?.mobileVsDesktop?.mobile || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Desktop</span>
                    <span className="font-semibold">{dashboard.devices?.mobileVsDesktop?.desktop || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${((dashboard.devices?.mobileVsDesktop?.mobile || 0) / ((dashboard.devices?.mobileVsDesktop?.mobile || 0) + (dashboard.devices?.mobileVsDesktop?.desktop || 0))) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};