import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronDown, 
  ChevronRight, 
  Receipt, 
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  Search,
  RefreshCw
} from 'lucide-react';
import { clienteService, ReciboCaja, EmpresaProcesada } from '@/services/clienteService';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientCode: string;
  empresasDisponibles: EmpresaProcesada[];
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  clientCode,
  empresasDisponibles
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recibos, setRecibos] = useState<ReciboCaja[]>([]);
  const [expandedRecibos, setExpandedRecibos] = useState<Set<string>>(new Set());
  const [totalRecaudado, setTotalRecaudado] = useState(0);
  const [totalRecaudadoFormatted, setTotalRecaudadoFormatted] = useState('');
  
  // Estados para filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<string>('');
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);

  useEffect(() => {
    if (isOpen && clientCode) {
      // Inicializar fechas por defecto (últimos 3 meses)
      const fechaFinDefault = new Date();
      const fechaInicioDefault = new Date();
      fechaInicioDefault.setMonth(fechaInicioDefault.getMonth() - 3);
      
      setFechaInicio(format(fechaInicioDefault, 'yyyy-MM-dd'));
      setFechaFin(format(fechaFinDefault, 'yyyy-MM-dd'));
      
      // Establecer empresa por defecto si hay empresas disponibles
      if (empresasDisponibles.length > 0) {
        setEmpresaSeleccionada(empresasDisponibles[0].CompCode);
      }
      
      // Limpiar datos anteriores
      setRecibos([]);
      setTotalRecaudado(0);
      setTotalRecaudadoFormatted('');
      setFiltrosAplicados(false);
    }
  }, [isOpen, clientCode, empresasDisponibles]);

  const fetchPaymentHistory = async () => {
    if (!fechaInicio || !fechaFin) {
      toast({
        title: "Error",
        description: "Por favor seleccione las fechas de inicio y fin",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const params = {
        fechaInicio,
        fechaFin,
        custCode: clientCode,
        ...(empresaSeleccionada && { companyCode: empresaSeleccionada })
      };

      const response = await clienteService.getRecibosCaja(params);

      if (response.success) {
        setRecibos(response.data);
        setTotalRecaudado(response.meta.totalRecaudado);
        setTotalRecaudadoFormatted(response.meta.totalRecaudadoFormatted);
        setFiltrosAplicados(true);
      } else {
        toast({
          title: "Error",
          description: response.message || "No se pudieron cargar los recibos",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error al cargar historial de pagos:', error);
      toast({
        title: "Error",
        description: "Error al cargar el historial de pagos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (reciboId: string) => {
    const newExpanded = new Set(expandedRecibos);
    if (newExpanded.has(reciboId)) {
      newExpanded.delete(reciboId);
    } else {
      newExpanded.add(reciboId);
    }
    setExpandedRecibos(newExpanded);
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(numValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Historial de Pagos
          </DialogTitle>
          <DialogDescription>
            Consulta recibos de caja por período y empresa
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        <Card className="p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fechaInicio">Fecha Inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="fechaFin">Fecha Fin</Label>
              <Input
                id="fechaFin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="empresa">Empresa</Label>
              <Select value={empresaSeleccionada} onValueChange={setEmpresaSeleccionada}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccione empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresasDisponibles.map((empresa) => (
                    <SelectItem key={empresa.CompCode} value={empresa.CompCode}>
                      {empresa.ShortName} - {empresa.CompName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button
              onClick={fetchPaymentHistory}
              disabled={loading || !fechaInicio || !fechaFin}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar Recibos
            </Button>
          </div>
        </Card>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-billpay-blue" />
            </div>
          ) : !filtrosAplicados ? (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Seleccione las fechas y empresa, luego haga clic en "Buscar Recibos"</p>
            </div>
          ) : recibos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No se encontraron recibos en el período seleccionado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumen Total */}
              <Card className="p-4 bg-billpay-blue/5 border-billpay-blue/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Total Pagado en el Período:</span>
                  <span className="text-xl font-bold text-billpay-blue">
                    {totalRecaudadoFormatted}
                  </span>
                </div>
              </Card>

              {/* Lista de Recibos */}
              {recibos.map((recibo) => {
                const isExpanded = expandedRecibos.has(recibo.id);
                
                return (
                  <Card key={recibo.id} className="overflow-hidden">
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleExpanded(recibo.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <button className="p-1">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                            <div>
                              <p className="text-xs text-gray-500">Recibo #</p>
                              <p className="font-semibold">{recibo.serNr}</p>
                            </div>
                            
                            <div>
                              <p className="text-xs text-gray-500">Fecha</p>
                              <p className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {recibo.transDateFormatted}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-xs text-gray-500">Forma de Pago</p>
                              <Badge variant="outline" className="mt-1">
                                {recibo.payMode || 'N/A'}
                              </Badge>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Monto</p>
                              <p className="font-bold text-billpay-blue flex items-center justify-end gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(recibo.curPayValNum)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detalles expandibles */}
                      {isExpanded && recibo.detalles.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Facturas aplicadas ({recibo.totalDetalles})
                          </p>
                          
                          <div className="space-y-2 ml-6">
                            {recibo.detalles.map((detalle) => (
                              <div 
                                key={detalle.id} 
                                className="flex justify-between items-center p-2 bg-gray-50 rounded"
                              >
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-medium">
                                    Factura #{detalle.invoiceNr}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {format(new Date(detalle.payDate), 'dd/MM/yyyy', { locale: es })}
                                  </span>
                                </div>
                                <span className="text-sm font-semibold">
                                  {formatCurrency(detalle.recValNum)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {recibo.comment && (
                            <div className="mt-3 p-2 bg-amber-50 rounded">
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Observaciones:</span> {recibo.comment}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};