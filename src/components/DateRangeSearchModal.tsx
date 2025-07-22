import { useState } from 'react';
import { Calendar, Search, Building2, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
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
}

interface DateRangeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInvoices: (invoices: Invoice[]) => void;
  clientCode: string;
  clientName: string;
  empresasDisponibles?: EmpresaProcesada[];
}

export const DateRangeSearchModal = ({
  isOpen,
  onClose,
  onSelectInvoices,
  clientCode,
  clientName,
  empresasDisponibles = []
}: DateRangeSearchModalProps) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('todas');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

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
    setSelectedInvoices([]);
    
    try {
      let response;
      
      // Si se especifica una empresa, hacer la búsqueda solo para esa empresa
      if (selectedEmpresa !== 'todas') {
        response = await clienteService.getFacturasPorRangoFecha({
          range: `${startDate}:${endDate}`,
          fields: 'SerNr,OfficialSerNr,PayDeal,InvDate,PayDate,Sum4,FormaPago,CompanyCode,CompanyName,CompanyShortName',
          sort: 'InvDate',
          filterCustCode: clientCode,
          companyCode: selectedEmpresa
        });
      } else {
        // Si no se especifica empresa, usar el método de búsqueda filtrada
        response = await clienteService.getFacturasFiltradas(clientCode, {
          fechaInicio: startDate,
          fechaFin: endDate
        });
      }
      
      // Manejar estructura de JsonResult de .NET (con 'value') o respuesta directa
      const responseData = response?.value?.data || response?.data || {};
      const facturas = responseData.facturas && Array.isArray(responseData.facturas) ? responseData.facturas : [];
      
      const invoices: Invoice[] = facturas.map((f: any) => ({
        id: (f.SerNr || f.serNr) + '-' + (f.PayDate || f.payDate),
        SerNr: f.SerNr || f.serNr,
        OfficialSerNr: f.OfficialSerNr || f.officialSerNr,
        PayDeal: f.PayDeal || f.payDeal,
        FormaPago: f.FormaPago || f.formaPago,
        InvDate: f.InvDate || f.invDate,
        PayDate: f.PayDate || f.payDate,
        Sum4: f.Sum4 || f.sum4,
        CompanyCode: f.CompanyCode || f.companyCode,
        CompanyName: f.CompanyName || f.companyName,
        CompanyShortName: f.CompanyShortName || f.companyShortName
      }));
      
      setSearchResults(invoices);
      setShowResults(true);
      
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

  const handleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === searchResults.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(searchResults.map(inv => inv.id));
    }
  };

  const handleContinue = () => {
    const selectedInvoicesList = searchResults.filter(inv => selectedInvoices.includes(inv.id));
    
    if (selectedInvoicesList.length === 0) {
      toast.error('Por favor seleccione al menos una factura');
      return;
    }
    
    // Verificar que todas las facturas seleccionadas sean de la misma empresa
    const empresasSeleccionadas = [...new Set(selectedInvoicesList.map(inv => inv.CompanyCode))];
    
    if (empresasSeleccionadas.length > 1) {
      toast.error('Solo puede seleccionar facturas de una empresa a la vez');
      return;
    }
    
    onSelectInvoices(selectedInvoicesList);
    handleClose();
  };

  const handleClose = () => {
    setStartDate('');
    setEndDate('');
    setSelectedEmpresa('todas');
    setSearchResults([]);
    setSelectedInvoices([]);
    setShowResults(false);
    onClose();
  };

  const totalSeleccionado = searchResults
    .filter(inv => selectedInvoices.includes(inv.id))
    .reduce((sum, inv) => sum + parseFloat(inv.Sum4 || '0'), 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={showResults ? "sm:max-w-[900px]" : "sm:max-w-[500px]"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-billpay-blue" />
            Buscar Facturas por Fecha y Empresa
          </DialogTitle>
          <DialogDescription>
            {!showResults 
              ? `Seleccione el rango de fechas y la empresa para buscar las facturas del cliente ${clientCode} - ${clientName}`
              : `Resultados de búsqueda: ${searchResults.length} facturas encontradas`
            }
          </DialogDescription>
        </DialogHeader>
        
        {!showResults ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Fecha Inicial
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                Fecha Final
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            {empresasDisponibles.length > 0 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="empresa" className="text-right">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  Empresa
                </Label>
                <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccione una empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las empresas</SelectItem>
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
        ) : (
          <div className="py-4">
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <div className="flex justify-between items-center text-sm">
                <span>
                  <strong>Período:</strong> {formatDate(startDate)} - {formatDate(endDate)}
                </span>
                <span>
                  <strong>Empresa:</strong> {selectedEmpresa === 'todas' ? 'Todas' : empresasDisponibles.find(e => e.CompCode === selectedEmpresa)?.CompName || selectedEmpresa}
                </span>
              </div>
            </div>
            
            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedInvoices.length === searchResults.length && searchResults.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nro. Doc</TableHead>
                    <TableHead>Nro. CUFE</TableHead>
                    {selectedEmpresa === 'todas' && <TableHead>Empresa</TableHead>}
                    <TableHead>Forma Pago</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>Fecha Vto.</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={selectedEmpresa === 'todas' ? 8 : 7} className="text-center">
                        No se encontraron facturas
                      </TableCell>
                    </TableRow>
                  ) : (
                    searchResults.map((invoice) => (
                      <TableRow 
                        key={invoice.id}
                        className={`cursor-pointer ${selectedInvoices.includes(invoice.id) ? 'bg-billpay-lightblue' : ''}`}
                        onClick={() => handleInvoiceSelection(invoice.id)}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={selectedInvoices.includes(invoice.id)}
                            onCheckedChange={() => handleInvoiceSelection(invoice.id)}
                          />
                        </TableCell>
                        <TableCell>{invoice.SerNr}</TableCell>
                        <TableCell>{invoice.OfficialSerNr}</TableCell>
                        {selectedEmpresa === 'todas' && (
                          <TableCell className="text-sm">{invoice.CompanyShortName || invoice.CompanyName}</TableCell>
                        )}
                        <TableCell>{invoice.FormaPago}</TableCell>
                        <TableCell>{formatDate(invoice.InvDate)}</TableCell>
                        <TableCell className={new Date(invoice.PayDate) < new Date() ? 'text-red-600' : ''}>
                          {formatDate(invoice.PayDate)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatAmount(invoice.Sum4)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
            
            {selectedInvoices.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md flex justify-between items-center">
                <span className="text-sm">
                  <strong>Facturas seleccionadas:</strong> {selectedInvoices.length}
                </span>
                <span className="text-sm">
                  <strong>Total a pagar:</strong> {formatAmount(totalSeleccionado.toString())}
                </span>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter>
          {!showResults ? (
            <>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="mr-2"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSearch}
                disabled={loading || !startDate || !endDate}
                className="bg-billpay-blue hover:bg-billpay-blue/90 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowResults(false);
                  setSearchResults([]);
                  setSelectedInvoices([]);
                }}
                className="mr-2"
              >
                Nueva Búsqueda
              </Button>
              <Button
                type="button"
                onClick={handleContinue}
                disabled={selectedInvoices.length === 0}
                className="bg-billpay-cyan hover:bg-billpay-cyan/90 text-white"
              >
                Continuar con Seleccionadas
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};