import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Download, FileDown, Loader2, Receipt, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BillPayHeader from '@/components/BillPayHeader';
import { PaymentHistoryModal } from '@/components/PaymentHistoryModal';
import { DateRangeSearchModal } from '@/components/DateRangeSearchModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { clienteService, EmpresaProcesada } from '@/services';
import * as XLSX from 'xlsx';
import { formatDate, formatAmount } from '../lib/utils';

interface Invoice {
  id: string;
  SerNr: string;
  OfficialSerNr: string;
  PayDeal: string;
  FormaPago: string; // nuevo campo
  InvDate: string;
  PayDate: string;
  Sum4: string; // Cambiado a string para consistencia con la API
  CompanyCode: string;
  CompanyName: string;
  CompanyShortName: string;
}

interface LocationState {
  clientCode: string;
  clientName?: string;
  searchType: 'hogar';
  mobile?: string;
  clientData?: any;
}

const InvoiceList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [clientData, setClientData] = useState<any>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null); // Estado para controlar descarga PDF
  const [empresasProcesadas, setEmpresasProcesadas] = useState<EmpresaProcesada[]>([]);
  const [empresasConResultados, setEmpresasConResultados] = useState<string[]>([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<string>('todas');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showDateRangeSearch, setShowDateRangeSearch] = useState(false);
  const isMobile = useIsMobile();

  const state = location.state as LocationState;
  
  // Determinar el código de cliente: desde parámetros URL o desde state
  const clientCodeFromUrl = params.clientCode;
  const clientCodeFromState = state?.clientCode;
  const clientCode = clientCodeFromUrl || clientCodeFromState || '';
  
  // Default client name if not provided in location state
  const clientName = state?.clientName || clientData?.Name || 'Cliente';

  useEffect(() => {
    // Si tenemos código de cliente desde URL pero no datos en state, cargar datos del cliente
    if (clientCodeFromUrl && !state?.clientData) {
      const fetchClientData = async () => {
        try {
          setLoading(true);
          const response = await clienteService.getCliente(clientCodeFromUrl);
          if (response?.data?.CUVc && response.data.CUVc.length > 0) {
            const cliente = response.data.CUVc[0];
            setClientData(cliente);
            console.log('Datos del cliente cargados desde URL:', cliente);
          } else {
            toast.error('Cliente no encontrado');
            navigate('/');
            return;
          }
        } catch (error) {
          console.error('Error al cargar cliente:', error);
          toast.error('Error al cargar datos del cliente');
          navigate('/');
          return;
        }
      }
      fetchClientData();
    }
  }, [clientCodeFromUrl, state?.clientData, navigate]);

  useEffect(() => {
    // Llamada real a la API para obtener facturas del cliente
    const fetchInvoices = async () => {
      if (!clientCode) return;
      
      setLoading(true);
      try {
        const response = await clienteService.getFacturasFiltradas(clientCode);
        
        // Manejar estructura de JsonResult de .NET (con 'value') o respuesta directa
        const responseData = response?.value?.data || response?.data || {};
        const facturas = responseData.facturas && Array.isArray(responseData.facturas) ? responseData.facturas : [];
        
        // Guardar la respuesta para uso en el render
        setApiResponse(responseData);
        
        // Verificar si hay errores en alguna empresa
        if (responseData.errores && responseData.errores.length > 0) {
          responseData.errores.forEach((error: any) => {
            toast.error(`Error en ${error.empresa}: No se pudieron cargar las facturas`);
          });
        }
        
        setInvoices(facturas.map((f: any) => ({
          id: (f.SerNr || f.serNr) + '-' + (f.PayDate || f.payDate),
          SerNr: f.SerNr || f.serNr,
          OfficialSerNr: f.OfficialSerNr || f.officialSerNr,
          PayDeal: f.PayDeal || f.payDeal,
          FormaPago: f.FormaPago || f.formaPago,
          InvDate: f.InvDate || f.invDate,
          PayDate: f.PayDate || f.payDate,
          Sum4: f.Sum4 || f.sum4, // Se mantiene como string
          CompanyCode: f.CompanyCode || f.companyCode,
          CompanyName: f.CompanyName || f.companyName,
          CompanyShortName: f.CompanyShortName || f.companyShortName
        })));
        
        // Obtener empresas con resultados de la API
        const empresasConResultadosAPI = responseData.empresasConResultados || [];
        setEmpresasConResultados(empresasConResultadosAPI);
        
        // Filtrar solo las empresas que tienen resultados
        const todasLasEmpresas = (responseData.empresasProcesadas || []).map((emp: any) => ({
          CompCode: emp.CompCode || emp.compCode,
          CompName: emp.CompName || emp.compName,
          ShortName: emp.ShortName || emp.shortName,
          ActiveStatus: emp.ActiveStatus || emp.activeStatus
        }));
        
        // Mostrar solo empresas con resultados
        const empresasConFacturas = todasLasEmpresas.filter((emp: EmpresaProcesada) => 
          empresasConResultadosAPI.includes(emp.CompCode)
        );
        
        setEmpresasProcesadas(empresasConFacturas);
        
        // Si solo hay una empresa con facturas, seleccionarla automáticamente
        if (empresasConFacturas.length === 1) {
          setEmpresaSeleccionada(empresasConFacturas[0].CompCode);
        } else {
          setEmpresaSeleccionada('todas');
        }
        
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast.error('No se pudieron cargar las facturas');
      } finally {
        setLoading(false);
      }
    };
    
    if (clientCode) {
      fetchInvoices();
    }
  }, [clientCode]);

  const handleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };
  
  const handleContinue = () => {
    if (selectedInvoices.length === 0) {
      toast.error('Por favor seleccione al menos una factura');
      return;
    }
    
    // Verificar que todas las facturas seleccionadas sean de la misma empresa
    const selectedInvoicesList = invoices.filter(inv => selectedInvoices.includes(inv.id));
    const empresasSeleccionadas = [...new Set(selectedInvoicesList.map(inv => inv.CompanyCode))];
    
    if (empresasSeleccionadas.length > 1) {
      toast.error('Solo puede pagar facturas de una empresa a la vez');
      return;
    }
    
    const selectedInvoiceData = selectedInvoicesList
      .map(invoice => ({
        clientName: clientName,
        clientCode: clientCode,
        serviceType: 'hogar',
        invoiceNumber: invoice.SerNr,
        officialSerNr: invoice.OfficialSerNr,
        payDeal: invoice.PayDeal,
        invDate: invoice.InvDate,
        dueDate: invoice.PayDate,
        amount: parseFloat(invoice.Sum4 || '0'),
        status: 'pendiente'
      }));
    
    // En lugar de usar una función asíncrona, usaremos un valor predeterminado directamente
    // y navegar inmediatamente para evitar problemas con la navegación asíncrona
    
    const totalAmount = selectedInvoiceData.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0);
    
    // Usar número predeterminado directo en lugar de esperar una respuesta de API
    // En un escenario real, deberías obtener este valor de un sistema de gestión de usuarios o perfil
    const mobilePhone = '+507 69387770'; // Número predeterminado para pruebas
    
    // Determinar el email del cliente desde state o clientData cargado
    const customerEmail = state?.clientData?.eMail || clientData?.eMail || '';
    
    const navigationState = { 
      clientCode: clientCode,
      clientName: clientName,
      searchType: 'hogar',
      mobile: state?.mobile || mobilePhone, // Usar el móvil del state si existe
      eMail: customerEmail, // Pasar el email del cliente desde state o clientData
      invoiceDataList: selectedInvoiceData,
      totalAmount: totalAmount,
      // Agregar información adicional para debug
      empresaSeleccionada: empresaSeleccionada,
      timestamp: new Date().toISOString()
    };
    
    
    // Navigate directamente con los datos que tenemos
    navigate('/invoice-details', { 
      state: navigationState
    });
  };

  // Utilidad para parsear fechas locales (evita desfase por zona horaria)
  function parseLocalDate(dateStr: string | undefined | null): Date {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) {
      return new Date('Invalid Date'); // Devuelve una fecha inválida si el string no es válido
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    // Valida que los componentes de la fecha sean números válidos
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return new Date('Invalid Date');
    }
    return new Date(year, month - 1, day);
  }
  
  // Función para descargar PDF de una factura individual
  const downloadInvoicePdf = async (noFactura: string, noCUFE: string, empresa: string) => {
    // Si no hay CUFE, no hacer nada
    if (!noCUFE || noCUFE.trim() === '') {
      toast.error('Esta factura no tiene CUFE disponible para descarga');
      return;
    }
    
    // Si ya se está descargando esta factura, no hacer nada
    if (downloadingPdf === noFactura) {
      return;
    }
    
    try {
      setDownloadingPdf(noFactura); // Marcar como descargando
      console.log(`Descargando PDF para factura: ${noFactura}`);
      
      // Usar el servicio para descargar el PDF con el código de empresa
      const blob = await clienteService.downloadPdf(noFactura, empresa);
      
      // Crear URL temporal para descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Factura_${noFactura}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success(`PDF de factura ${noFactura} descargado exitosamente`);
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      toast.error(`Error al descargar el PDF de la factura ${noFactura}`);
    } finally {
      setDownloadingPdf(null); // Limpiar estado de descarga
    }
  };
  
  // Función para exportar facturas a Excel
  const exportToExcel = () => {
    try {
      // Crear workbook
      const wb = XLSX.utils.book_new();
      
      // Preparar datos de facturas
      const facturasData = facturasFiltradas.map((invoice, index) => {
        const baseData = {
          '#': index + 1,
          'Nro. Doc': invoice.SerNr,
          'Nro. CUFE': invoice.OfficialSerNr,
        };
        
        // Agregar empresa si se están mostrando todas
        if (mostrarSelectorEmpresas && empresaSeleccionada === 'todas') {
          baseData['Empresa'] = invoice.CompanyShortName || invoice.CompanyName;
        }
        
        return {
          ...baseData,
          'Forma de Pago': invoice.FormaPago,
          'Fecha Emisión': formatDate(invoice.InvDate),
          'Fecha Vto.': formatDate(invoice.PayDate),
          'Importe': formatAmount(invoice.Sum4),
          'Estado': parseLocalDate(invoice.PayDate) < new Date() ? 'Vencida' : 'Vigente'
        };
      });

      // Crear worksheet manualmente para tener control sobre el formato
      const ws = XLSX.utils.aoa_to_sheet([]);
      
      // Agregar fila vacía
      XLSX.utils.sheet_add_aoa(ws, [[]], { origin: 'A1' });
      
      // Agregar información del cliente centrada
      const clientInfo = `CLIENTE: ${clientCode} - ${clientName}`;
      XLSX.utils.sheet_add_aoa(ws, [[clientInfo]], { origin: 'A2' });
      
      // Agregar otra fila vacía
      XLSX.utils.sheet_add_aoa(ws, [[]], { origin: 'A3' });
      
      // Agregar encabezados de las facturas en la fila 4
      const headers = ['#', 'Nro. Doc', 'Nro. CUFE'];
      if (mostrarSelectorEmpresas && empresaSeleccionada === 'todas') {
        headers.push('Empresa');
      }
      headers.push('Forma de Pago', 'Fecha Emisión', 'Fecha Vto.', 'Importe', 'Estado', 'PDF');
      XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A4' });
      
      // Agregar datos de facturas empezando desde la fila 5
      const facturasArray = facturasData.map(factura => [
        factura['#'],
        factura['Nro. Doc'],
        factura['Nro. CUFE'],
        factura['Forma de Pago'],
        factura['Fecha Emisión'],
        factura['Fecha Vto.'],
        factura['Importe'],
        factura['Estado'],
        factura['Nro. CUFE'] && factura['Nro. CUFE'].toString().trim() !== '' ? 'Disponible' : 'No disponible'
      ]);
      XLSX.utils.sheet_add_aoa(ws, facturasArray, { origin: 'A5' });

      // Configurar anchos de columnas
      const colWidths = [
        { wch: 5 },   // #
        { wch: 15 },  // Nro. Doc
        { wch: 20 },  // Nro. CUFE
        { wch: 15 },  // Forma de Pago
        { wch: 15 },  // Fecha Emisión
        { wch: 15 },  // Fecha Vto.
        { wch: 15 },  // Importe
        { wch: 10 },  // Estado
        { wch: 12 }   // PDF
      ];
      ws['!cols'] = colWidths;

      // Combinar celdas para el título del cliente (A2:I2)
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } });

      // Aplicar estilos al título del cliente (centrado y negrita)
      if (ws['A2']) {
        ws['A2'].s = {
          alignment: { horizontal: 'center', vertical: 'center' },
          font: { bold: true, sz: 14 }
        };
      }

      // Aplicar estilos a los encabezados (negrita y fondo azul)
      headers.forEach((header, index) => {
        const cellRef = XLSX.utils.encode_cell({ r: 3, c: index });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { 
              bold: true, 
              color: { rgb: "FFFFFF" },
              sz: 11
            },
            alignment: { 
              horizontal: 'center',
              vertical: 'center'
            },
            fill: { 
              patternType: 'solid',
              fgColor: { rgb: "2E5BB8" }
            },
            border: {
              top: { style: 'thin', color: { rgb: "000000" } },
              bottom: { style: 'thin', color: { rgb: "000000" } },
              left: { style: 'thin', color: { rgb: "000000" } },
              right: { style: 'thin', color: { rgb: "000000" } }
            }
          };
        }
      });

      // Aplicar estilos a las celdas de datos
      invoices.forEach((invoice, rowIndex) => {
        const actualRow = rowIndex + 4; // Fila 5 en adelante (0-indexed, porque los encabezados están en fila 4)
        headers.forEach((header, colIndex) => {
          const cellRef = XLSX.utils.encode_cell({ r: actualRow, c: colIndex });
          if (ws[cellRef]) {
            ws[cellRef].s = {
              alignment: { 
                horizontal: colIndex === 6 ? 'right' : (colIndex === 4 || colIndex === 5) ? 'center' : colIndex === 8 ? 'center' : 'left', // Derecha para importe, centro para fechas y PDF
                vertical: 'center'
              },
              border: {
                top: { style: 'thin', color: { rgb: "CCCCCC" } },
                bottom: { style: 'thin', color: { rgb: "CCCCCC" } },
                left: { style: 'thin', color: { rgb: "CCCCCC" } },
                right: { style: 'thin', color: { rgb: "CCCCCC" } }
              },
              font: { sz: 10 }
            };
          }
        });
      });

      // Agregar worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Facturas');

      // Generar nombre del archivo con fecha actual
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const fileName = `Facturas_${clientCode}_${dateStr}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(wb, fileName);
      
      toast.success('Archivo Excel descargado exitosamente');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      toast.error('Error al generar el archivo Excel');
    }
  };
  
  // Render different table headers based on screen size
  const renderTableHeaders = () => {
    if (isMobile) {
      return (
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead>Nro. Doc</TableHead>
          <TableHead>Nro. CUFE</TableHead>
          <TableHead>Importe</TableHead>
          <TableHead>Forma de Pago</TableHead>
          <TableHead>Fecha Emisión</TableHead>
          <TableHead>Fecha Vto.</TableHead>
          <TableHead className="text-center"></TableHead>
        </TableRow>
      );
    }
    return (
      <TableRow>
        <TableHead className="w-10"></TableHead>
        <TableHead>Nro. Doc</TableHead>
        <TableHead>Nro. CUFE</TableHead>
        <TableHead>Forma de Pago</TableHead>
        <TableHead>Fecha Emisión</TableHead>
        <TableHead>Fecha Vto.</TableHead>
        <TableHead>Importe</TableHead>
        <TableHead className="text-center"></TableHead>
      </TableRow>
    );
  };
  
  // Render different table cells based on screen size
  const renderTableCells = (invoice: Invoice) => {
    if (isMobile) {
      return (
        <>
          <TableCell className="p-2">
            <Checkbox 
              checked={selectedInvoices.includes(invoice.id)}
              onCheckedChange={() => handleInvoiceSelection(invoice.id)}
              className="text-billpay-blue"
            />
          </TableCell>
          <TableCell>{invoice.SerNr}</TableCell>
          <TableCell>{invoice.OfficialSerNr}</TableCell>
          <TableCell className={`font-medium text-right ${
            parseLocalDate(invoice.PayDate) < new Date()
              ? 'text-red-600' : ''
          }`}>
            {formatAmount(invoice.Sum4)}
          </TableCell>
          <TableCell>{invoice.FormaPago}</TableCell>
          <TableCell>{formatDate(invoice.InvDate)}</TableCell>
          <TableCell>{formatDate(invoice.PayDate)}</TableCell>
          <TableCell className="text-center">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation(); // Evitar que se seleccione la fila
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
        </>
      );
    }
    return (
      <>
        <TableCell className="p-2">
          <Checkbox 
            checked={selectedInvoices.includes(invoice.id)}
            onCheckedChange={() => handleInvoiceSelection(invoice.id)}
            className="text-billpay-blue"
          />
        </TableCell>
        <TableCell className="p-2">{invoice.SerNr}</TableCell>
        <TableCell className="whitespace-nowrap p-2">{invoice.OfficialSerNr}</TableCell>
        {mostrarSelectorEmpresas && empresaSeleccionada === 'todas' && (
          <TableCell className="whitespace-nowrap p-2 text-sm">{invoice.CompanyShortName || invoice.CompanyName}</TableCell>
        )}
        <TableCell className="whitespace-nowrap p-2">{invoice.FormaPago}</TableCell>
        <TableCell className="p-2">{formatDate(invoice.InvDate)}</TableCell>
        <TableCell className={
          `p-2 ${
            parseLocalDate(invoice.PayDate) < new Date()
              ? 'text-red-600' : ''
          }`
        }>
          {formatDate(invoice.PayDate)}
        </TableCell>
        <TableCell className="font-medium text-right p-2">{formatAmount(invoice.Sum4)}</TableCell>
        <TableCell className="text-center p-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation(); // Evitar que se seleccione la fila
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
      </>
    );
  };
  
  // Obtener todas las facturas vencidas (todas las cuotas vencidas)
  function getTodasVencidasIds(invoices: Invoice[]): string[] {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    return invoices.filter(inv => {
      const fecha = parseLocalDate(inv.PayDate);
      return fecha.getMonth() !== mesActual || fecha.getFullYear() !== anioActual;
    }).map(inv => inv.id);
  }

  const vencidasIds = getTodasVencidasIds(invoices);
  const hayVencidas = vencidasIds.length > 0;
  const todasVencidasSeleccionadas = vencidasIds.every(id => selectedInvoices.includes(id)) && vencidasIds.length > 0;

  const handleSelectVencidas = () => {
    if (!hayVencidas) return;
    setSelectedInvoices(prev => {
      // Si ya están todas seleccionadas, deselecciona solo las vencidas
      if (todasVencidasSeleccionadas) {
        return prev.filter(id => !vencidasIds.includes(id));
      }
      // Selecciona todas las vencidas (sin duplicar)
      return Array.from(new Set([...prev, ...vencidasIds]));
    });
  };

  // Filtrar facturas por empresa seleccionada
  const facturasFiltradas = empresaSeleccionada === 'todas'
    ? invoices
    : invoices.filter(f => f.CompanyCode === empresaSeleccionada);
  
  // Determinar si hay que mostrar selector de empresas
  const mostrarSelectorEmpresas = empresasProcesadas.length > 1;
  
  // Limpiar selecciones cuando se cambia de empresa
  useEffect(() => {
    setSelectedInvoices([]);
  }, [empresaSeleccionada]);

  // Función para manejar facturas seleccionadas desde el modal de búsqueda
  const handleInvoicesFromSearch = (selectedInvoicesList: Invoice[]) => {
    // Agregar las facturas seleccionadas a la lista principal
    setInvoices(prevInvoices => {
      // Combinar facturas existentes con las nuevas, evitando duplicados
      const existingIds = new Set(prevInvoices.map(inv => inv.id));
      const newInvoices = selectedInvoicesList.filter(inv => !existingIds.has(inv.id));
      return [...prevInvoices, ...newInvoices];
    });
    
    // Seleccionar automáticamente las facturas que vienen del modal
    setSelectedInvoices(prevSelected => {
      const newSelected = selectedInvoicesList.map(inv => inv.id);
      return [...new Set([...prevSelected, ...newSelected])];
    });
    
    // Actualizar la empresa seleccionada si todas son de la misma empresa
    const empresasEncontradas = [...new Set(selectedInvoicesList.map(inv => inv.CompanyCode))];
    if (empresasEncontradas.length === 1) {
      setEmpresaSeleccionada(empresasEncontradas[0]);
    }
    
    toast.success(`Se agregaron ${selectedInvoicesList.length} facturas a la selección`);
  };

  // Función para manejar la búsqueda por rango de fechas (no usada ahora porque el modal maneja todo)
  const handleDateRangeSearch = async (startDate: string, endDate: string, empresaCode?: string) => {
    setLoading(true);
    try {
      // Si se especifica una empresa, hacer la búsqueda solo para esa empresa
      if (empresaCode) {
        const response = await clienteService.getFacturasPorRangoFecha({
          range: `${startDate}:${endDate}`,
          fields: 'SerNr,OfficialSerNr,PayDeal,InvDate,PayDate,Sum4,FormaPago,CompanyCode,CompanyName,CompanyShortName',
          sort: 'InvDate',
          filterCustCode: clientCode,
          companyCode: empresaCode
        });
        
        // Manejar estructura de JsonResult de .NET (con 'value') o respuesta directa
        const responseData = response?.value?.data || response?.data || {};
        const facturas = responseData.facturas && Array.isArray(responseData.facturas) ? responseData.facturas : [];
        
        setInvoices(facturas.map((f: any) => ({
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
        })));
        
        // Actualizar la empresa seleccionada en el tab
        setEmpresaSeleccionada(empresaCode);
        
        toast.success(`Se encontraron ${facturas.length} facturas en ${empresasProcesadas.find(e => e.CompCode === empresaCode)?.CompName || empresaCode}`);
      } else {
        // Si no se especifica empresa, usar el método de búsqueda filtrada que consulta todas las empresas
        const response = await clienteService.getFacturasFiltradas(clientCode, {
          fechaInicio: startDate,
          fechaFin: endDate
        });
        
        // Manejar estructura de JsonResult de .NET (con 'value') o respuesta directa
        const responseData = response?.value?.data || response?.data || {};
        const facturas = responseData.facturas && Array.isArray(responseData.facturas) ? responseData.facturas : [];
        
        // Guardar la respuesta para uso en el render
        setApiResponse(responseData);
        
        setInvoices(facturas.map((f: any) => ({
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
        })));
        
        // Mantener "todas" las empresas seleccionadas
        setEmpresaSeleccionada('todas');
        
        toast.success(`Se encontraron ${facturas.length} facturas en todas las empresas`);
      }
      
    } catch (error) {
      console.error('Error al buscar facturas por fecha:', error);
      toast.error('No se pudieron cargar las facturas por rango de fecha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <BillPayHeader />
      
      <main className="flex-1 container max-w-6xl py-6 px-4">
        <div className="mb-6">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center text-billpay-blue hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            REGRESAR
          </button>
        </div>
        
        <h1 className="text-2xl font-bold text-black mb-6">Seleccionar Facturas</h1>

        {/* Botón flotante para seleccionar vencidas */}
        <div className="relative">
          {hayVencidas && (
            <button
              type="button"
              onClick={handleSelectVencidas}
              className={`fixed z-30 right-8 top-32 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg border-2 border-red-200 bg-white text-red-600 font-bold transition-all duration-300
                ${!todasVencidasSeleccionadas ? 'animate-pulse' : ''}
                ${todasVencidasSeleccionadas ? 'bg-red-600 text-white border-red-600' : ''}
                drop-shadow-lg
              `}
              title={todasVencidasSeleccionadas ? 'Deseleccionar todas las vencidas' : 'Seleccionar todas las facturas vencidas para pagarlas rápidamente'}
              disabled={!hayVencidas}
            >
              <AlertTriangle className="w-5 h-5 mr-1" />
              {todasVencidasSeleccionadas ? 'Deseleccionar vencidas' : 'Seleccionar vencidas'}
              <span className="ml-2 bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs font-bold">
                {vencidasIds.length}
              </span>
            </button>
          )}
        </div>
        
        {loading ? (
          <Card className="p-6 flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-billpay-blue mx-auto mb-4"></div>
              <p>Cargando facturas...</p>
            </div>
          </Card>
        ) : invoices.length > 0 ? (
          <Card className="p-6 shadow-sm border-gray-100">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl text-black font-bold">Facturas pendientes</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowDateRangeSearch(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white"
                  >
                    <Calendar className="h-4 w-4" />
                    Buscar por Fecha
                  </Button>
                  <Button
                    onClick={() => setShowPaymentHistory(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white"
                  >
                    <Receipt className="h-4 w-4" />
                    Historial de Pagos
                  </Button>
                  <Button
                    onClick={exportToExcel}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white"
                  >
                    <Download className="h-4 w-4" />
                    Exportar Excel
                  </Button>
                </div>
              </div>
              <p className="text-black font-bold">Cliente: #{clientCode} - {clientName}</p>
              <p className="text-sm text-gray-500 mt-2">Seleccione una o más facturas para pagar</p>
              
              {/* Selector de empresas - Solo se muestra si hay más de una empresa con resultados */}
              {mostrarSelectorEmpresas && (
                <div className="mt-4">
                  <Tabs value={empresaSeleccionada} onValueChange={setEmpresaSeleccionada}>
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${empresasProcesadas.length + 1}, 1fr)` }}>
                      <TabsTrigger value="todas">Todas</TabsTrigger>
                      {empresasProcesadas.map((empresa) => {
                        const hasError = apiResponse?.errores?.some((error: any) => error.compCode === empresa.CompCode);
                        const facturaCount = invoices.filter(f => f.CompanyCode === empresa.CompCode).length;
                        return (
                          <TabsTrigger key={empresa.CompCode} value={empresa.CompCode} className={hasError ? 'text-red-600' : ''}>
                            {empresa.CompName} ({facturaCount})
                            {hasError && ' ⚠️'}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </Tabs>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto mb-6">
              <Table className="text-sm">
                <TableHeader>
                  {renderTableHeaders()}
                </TableHeader>
                <TableBody>
                  {facturasFiltradas.map((invoice, idx) => (
                    <TableRow 
                      key={(invoice.id || `${invoice.SerNr || 'NOID'}-${invoice.PayDate || 'NOPAYDATE'}-${idx}`)}
                      className={`cursor-pointer ${selectedInvoices.includes(invoice.id) ? 'bg-billpay-lightblue' : ''}`}
                      onClick={() => handleInvoiceSelection(invoice.id)}
                    >
                      {isMobile
                        ? renderTableCells(invoice)
                        : <>
                            <TableCell className="p-2">
                              <Checkbox 
                                checked={selectedInvoices.includes(invoice.id)}
                                onCheckedChange={() => handleInvoiceSelection(invoice.id)}
                                className="text-billpay-blue"
                              />
                            </TableCell>
                            <TableCell className="p-2">{invoice.SerNr}</TableCell>
                            <TableCell className="whitespace-nowrap p-2">{invoice.OfficialSerNr}</TableCell>
                            {mostrarSelectorEmpresas && empresaSeleccionada === 'todas' && (
                              <TableCell className="whitespace-nowrap p-2 text-sm">{invoice.CompanyShortName || invoice.CompanyName}</TableCell>
                            )}
                            <TableCell className="whitespace-nowrap p-2">{invoice.FormaPago}</TableCell>
                            <TableCell className="p-2">{formatDate(invoice.InvDate)}</TableCell>
                            <TableCell className={
                              `p-2 ${
                                parseLocalDate(invoice.PayDate) < new Date()
                                  ? 'text-red-600' : ''
                              }`
                            }>
                              {formatDate(invoice.PayDate)}
                            </TableCell>
                            <TableCell className="font-medium text-right p-2">{formatAmount(invoice.Sum4)}</TableCell>
                            <TableCell className="text-center p-2">
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
                          </>
                      }
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {selectedInvoices.length > 0 && (
              <div className="flex justify-between items-center mb-6 py-3 px-4 bg-gray-50 rounded-md">
                <div>
                  <span className="text-gray-500 mr-2">A Pagar:</span>
                  <span className="font-bold text-black">
                    {formatAmount(invoices
                      .filter(inv => selectedInvoices.includes(inv.id))
                      .reduce((sum, inv) => sum + parseFloat(inv.Sum4 || '0'), 0).toString())}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 mr-2"># Facturas</span>
                  <span className="font-medium">{selectedInvoices.length}</span>
                </div>
              </div>
            )}
            
            <div className="flex justify-center">
              <Button 
                onClick={handleContinue}
                className="bg-billpay-cyan hover:bg-billpay-cyan/90 text-white px-8 rounded-full"
                size="lg"
              >
                CONTINUAR
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <p>No se encontraron facturas pendientes para este cliente.</p>
            <Button 
              onClick={() => navigate('/')}
              className="mt-4 bg-billpay-blue"
            >
              Volver a buscar
            </Button>
          </Card>
        )}
      </main>

      {/* Modal de Historial de Pagos */}
      <PaymentHistoryModal
        isOpen={showPaymentHistory}
        onClose={() => setShowPaymentHistory(false)}
        clientCode={clientCode}
        empresasDisponibles={empresasProcesadas}
      />
      
      {/* Modal de Búsqueda por Rango de Fecha */}
      <DateRangeSearchModal
        isOpen={showDateRangeSearch}
        onClose={() => setShowDateRangeSearch(false)}
        onSelectInvoices={handleInvoicesFromSearch}
        clientCode={clientCode}
        clientName={clientName}
        empresasDisponibles={empresasProcesadas}
      />
    </div>
  );
};

export default InvoiceList;
