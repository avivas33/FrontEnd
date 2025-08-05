import { useState, useEffect } from 'react';
import { Calendar, Search, Building2, FileDown, Loader2, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { clienteService, EmpresaProcesada } from '@/services';
import { formatDate, formatAmount } from '@/lib/utils';

interface Invoice {
  id: string;
  SerNr: string;
  OfficialSerNr: string;
  PayDeal: string;
  FormaPago: string;
  InvDate: string;
  PayDate: string;
  Sum4: string;
  CompanyCode: string;
  CompanyName: string;
  CompanyShortName: string;
  OrderNr?: string;
  CustOrdNr?: string;
  RefStr?: string;
}

interface DateRangeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientCode: string;
  clientName: string;
  empresasDisponibles?: EmpresaProcesada[];
  empresaSeleccionada?: string;
}

export const DateRangeSearchModal = ({
  isOpen,
  onClose,
  clientCode,
  clientName,
  empresasDisponibles = [],
  empresaSeleccionada: empresaActual
}: DateRangeSearchModalProps) => {
  // Inicializar fechas: primer día del año actual y fecha actual
  const getInitialDates = () => {
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    
    // Formatear fechas para input date (YYYY-MM-DD)
    const formatDateForInput = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      start: formatDateForInput(firstDayOfYear),
      end: formatDateForInput(now)
    };
  };

  const initialDates = getInitialDates();
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  
  // Determinar la empresa inicial: usar la empresa actual si está disponible y es válida
  const getInitialEmpresa = () => {
    if (empresaActual && empresaActual !== 'todas' && empresasDisponibles.some(e => e.CompCode === empresaActual)) {
      return empresaActual;
    }
    return empresasDisponibles.length > 0 ? empresasDisponibles[0].CompCode : '';
  };
  
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>(getInitialEmpresa());
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Invoice[]>([]);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    column: 'InvDate' | 'SerNr';
    order: 'asc' | 'desc';
  }>({ column: 'InvDate', order: 'desc' }); // desc = más reciente primero
  
  // Actualizar la empresa seleccionada cuando cambie la empresa actual o se abra el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedEmpresa(getInitialEmpresa());
    }
  }, [isOpen, empresaActual, empresasDisponibles]);

  // Función para ordenar facturas
  const sortInvoices = (invoices: Invoice[], column: 'InvDate' | 'SerNr', order: 'asc' | 'desc') => {
    return [...invoices].sort((a, b) => {
      let valueA: string | number;
      let valueB: string | number;
      
      if (column === 'InvDate') {
        valueA = new Date(a.InvDate).getTime();
        valueB = new Date(b.InvDate).getTime();
      } else if (column === 'SerNr') {
        // Para números de documento, convertir a número para ordenamiento correcto
        valueA = parseInt(a.SerNr) || 0;
        valueB = parseInt(b.SerNr) || 0;
      }
      
      if (order === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
  };

  // Función para cambiar el orden
  const handleSort = (column: 'InvDate' | 'SerNr') => {
    const newOrder = sortConfig.column === column && sortConfig.order === 'desc' ? 'asc' : 'desc';
    const newConfig = { column, order: newOrder };
    
    setSortConfig(newConfig);
    setSearchResults(prev => sortInvoices(prev, column, newOrder));
  };

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      toast.error('Por favor seleccione ambas fechas');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('La fecha inicial no puede ser mayor que la fecha final');
      return;
    }

    setLoading(true);
    
    try {
      let response;
      
      // Siempre hacer la búsqueda para la empresa seleccionada
      response = await clienteService.getFacturasPorEmpresa(selectedEmpresa, {
        range: `${startDate}:${endDate}`,
        sort: 'InvDate',
        filterCustCode: clientCode
      });
      
      // Manejar diferentes estructuras de respuesta
      console.log('Response completa:', response);
      
      // Primero intentar acceder a la estructura completa
      let responseData = response;
      
      // Si la respuesta está envuelta en un objeto con 'data'
      if (response && response.data) {
        responseData = response.data;
      }
      
      // Si hay otro nivel 'data' dentro
      if (responseData && responseData.data) {
        responseData = responseData.data;
      }
      
      console.log('ResponseData procesada:', responseData);
      
      // Buscar facturas en diferentes posibles ubicaciones
      let facturas = [];
      if (responseData && responseData.ivVc && Array.isArray(responseData.ivVc)) {
        // Formato del nuevo endpoint camelCase
        facturas = responseData.ivVc;
        console.log('Facturas encontradas en ivVc:', facturas.length);
      } else if (responseData && responseData.IVVc && Array.isArray(responseData.IVVc)) {
        // Formato directo de la API de Hansa
        facturas = responseData.IVVc;
        console.log('Facturas encontradas en IVVc:', facturas.length);
      } else if (responseData && responseData.facturas && Array.isArray(responseData.facturas)) {
        // Formato procesado del backend
        facturas = responseData.facturas;
        console.log('Facturas encontradas en facturas:', facturas.length);
      } else if (Array.isArray(responseData)) {
        // Si la respuesta es directamente un array
        facturas = responseData;
        console.log('ResponseData es un array:', facturas.length);
      } else {
        console.log('No se encontraron facturas en la estructura esperada');
        console.log('Estructura de responseData:', JSON.stringify(responseData, null, 2));
      }
      
      const invoices: Invoice[] = facturas.map((f: any) => {
        // Log para verificar el valor de FormaPago
        console.log('Factura data:', { 
          SerNr: f.SerNr || f.serNr, 
          FormaPago: f.FormaPago || f.formaPago,
          PayDeal: f.PayDeal || f.payDeal,
          PDType: f.PDType || f.pdType
        });
        
        return {
          id: (f.SerNr || f.serNr) + '-' + (f.PayDate || f.payDate),
          SerNr: f.SerNr || f.serNr,
          OfficialSerNr: f.OfficialSerNr || f.officialSerNr || '',
          PayDeal: f.PayDeal || f.payDeal || '',
          FormaPago: f.FormaPago || f.formaPago || f.PayDeal || f.payDeal || '',
          InvDate: f.InvDate || f.invDate,
          PayDate: f.PayDate || f.payDate,
          Sum4: f.Sum4 || f.sum4,
          CompanyCode: f.CompanyCode || f.companyCode || selectedEmpresa,
          CompanyName: f.CompanyName || f.companyName || empresasDisponibles.find(e => e.CompCode === selectedEmpresa)?.CompName || '',
          CompanyShortName: f.CompanyShortName || f.companyShortName || empresasDisponibles.find(e => e.CompCode === selectedEmpresa)?.ShortName || '',
          OrderNr: f.OrderNr || f.orderNr || '',
          CustOrdNr: f.CustOrdNr || f.custOrdNr || '',
          RefStr: f.RefStr || f.refStr || ''
        };
      });
      
      // Aplicar ordenamiento inicial
      const sortedInvoices = sortInvoices(invoices, sortConfig.column, sortConfig.order);
      setSearchResults(sortedInvoices);
      
      if (invoices.length === 0) {
        toast.info('No se encontraron facturas en el rango seleccionado');
      } else {
        toast.success(`Se encontraron ${invoices.length} facturas`);
      }
      
    } catch (error) {
      console.error('Error al buscar facturas:', error);
      toast.error('No se pudieron cargar las facturas');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoicePdf = async (noFactura: string, noCUFE: string, empresa: string) => {
    if (!noCUFE || noCUFE.trim() === '') {
      toast.error('Esta factura no tiene CUFE disponible para descarga');
      return;
    }
    
    if (downloadingPdf === noFactura) {
      return;
    }
    
    try {
      setDownloadingPdf(noFactura);
      console.log(`Descargando PDF para factura: ${noFactura}`);
      
      const blob = await clienteService.downloadPdf(noFactura, empresa);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Factura_${noFactura}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success(`PDF de factura ${noFactura} descargado exitosamente`);
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      toast.error(`Error al descargar el PDF de la factura ${noFactura}`);
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleClose = () => {
    const dates = getInitialDates();
    setStartDate(dates.start);
    setEndDate(dates.end);
    setSelectedEmpresa(getInitialEmpresa());
    setSearchResults([]);
    setSortConfig({ column: 'InvDate', order: 'desc' }); // Reset to default sort config
    onClose();
  };

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      const excelData = searchResults.map((invoice, index) => ({
        '#': index + 1,
        'Nro. Doc': invoice.SerNr,
        'Nro. CUFE': invoice.OfficialSerNr,
        'Orden': invoice.OrderNr || '',
        'Orden Cliente': invoice.CustOrdNr || '',
        'Referencia': invoice.RefStr || '',
        'Tipo': invoice.FormaPago,
        'Fecha Emisión': formatDate(invoice.InvDate),
        'Importe': invoice.FormaPago === 'Nota de Crédito' ? `-${formatAmount(invoice.Sum4)}` : formatAmount(invoice.Sum4),
        'Estado': (() => {
          const [year, month, day] = invoice.PayDate.split('-').map(Number);
          const payDate = new Date(year, month - 1, day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return payDate < today ? 'Vencida' : 'Vigente';
        })()
      }));

      const ws = XLSX.utils.aoa_to_sheet([]);
      
      XLSX.utils.sheet_add_aoa(ws, [[]], { origin: 'A1' });
      
      const clientInfo = `CLIENTE: ${clientCode} - ${clientName}`;
      XLSX.utils.sheet_add_aoa(ws, [[clientInfo]], { origin: 'A2' });
      
      XLSX.utils.sheet_add_aoa(ws, [[]], { origin: 'A3' });
      
      const headers = Object.keys(excelData[0] || {});
      XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A4' });
      
      const dataArray = excelData.map(row => headers.map(header => row[header]));
      XLSX.utils.sheet_add_aoa(ws, dataArray, { origin: 'A5' });

      const colWidths = [
        { wch: 5 },   // #
        { wch: 15 },  // Nro. Doc
        { wch: 20 },  // Nro. CUFE
        { wch: 15 },  // Orden
        { wch: 20 },  // Orden Cliente
        { wch: 20 },  // Referencia
        { wch: 15 },  // Tipo
        { wch: 15 },  // Fecha Emisión
        { wch: 15 },  // Importe
        { wch: 10 }   // Estado
      ];
      ws['!cols'] = colWidths;

      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } });

      XLSX.utils.book_append_sheet(wb, ws, 'Facturas Históricas');

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const fileName = `Facturas_Historicas_${clientCode}_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);
      
      toast.success('Archivo Excel descargado exitosamente');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      toast.error('Error al generar el archivo Excel');
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-billpay-blue" />
            Facturas históricas
          </DialogTitle>
          <DialogDescription>
            {`Buscar facturas del cliente ${clientCode} - ${clientName}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Controles de búsqueda */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">
                  Fecha Inicial
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="endDate">
                  Fecha Final
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              
              {empresasDisponibles.length > 0 && (
                <div>
                  <Label htmlFor="empresa">
                    <Building2 className="inline h-4 w-4 mr-1" />
                    Empresa
                  </Label>
                  <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccione una empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresasDisponibles.map((empresa) => (
                        <SelectItem key={empresa.CompCode} value={empresa.CompCode}>
                          {empresa.CompName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                disabled={loading || !startDate || !endDate}
                className="flex-1 bg-billpay-blue hover:bg-billpay-blue/90 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar Facturas
                  </>
                )}
              </Button>
              
              {searchResults.length > 0 && (
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  className="flex items-center gap-2 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </Button>
              )}
            </div>
          </div>

          {/* Resultados */}
          <div>
            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('SerNr')}
                        className="h-8 p-2 font-medium hover:bg-gray-100 flex items-center gap-1"
                      >
                        Nro. Doc
                        {sortConfig.column === 'SerNr' && (
                          sortConfig.order === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Nro. CUFE</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('InvDate')}
                        className="h-8 p-2 font-medium hover:bg-gray-100 flex items-center gap-1"
                      >
                        Fecha Emisión
                        {sortConfig.column === 'InvDate' && (
                          sortConfig.order === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead className="text-center">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No se encontraron facturas
                      </TableCell>
                    </TableRow>
                  ) : (
                    searchResults.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.SerNr}</TableCell>
                        <TableCell>{invoice.OfficialSerNr}</TableCell>
                        <TableCell>
                          {invoice.FormaPago}
                        </TableCell>
                        <TableCell>{formatDate(invoice.InvDate)}</TableCell>
                        <TableCell className={`font-medium ${invoice.FormaPago === 'Nota de Crédito' ? 'text-red-600' : ''}`}>
                          {invoice.FormaPago === 'Nota de Crédito' ? `-${formatAmount(invoice.Sum4)}` : formatAmount(invoice.Sum4)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadInvoicePdf(invoice.SerNr, invoice.OfficialSerNr, invoice.CompanyCode);
                            }}
                            disabled={!invoice.OfficialSerNr || invoice.OfficialSerNr.trim() === '' || downloadingPdf === invoice.SerNr}
                            className="h-8 w-8 p-0 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white disabled:opacity-50"
                            title={
                              downloadingPdf === invoice.SerNr 
                                ? 'Descargando...' 
                                : invoice.OfficialSerNr && invoice.OfficialSerNr.trim() !== '' 
                                  ? 'Descargar PDF' 
                                  : 'PDF no disponible'
                            }
                          >
                            {downloadingPdf === invoice.SerNr ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};