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
import { CompanySelectionModal } from '@/components/CompanySelectionModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { clienteService, EmpresaProcesada } from '@/services';
import * as XLSX from 'xlsx';
import { formatDate, formatAmount } from '../lib/utils';
import { getCompanyLogo } from '@/utils/companyLogos';

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
  OrderNr?: string;
  CustOrdNr?: string;
  RefStr?: string;
}

interface LocationState {
  clientCode: string;
  clientName?: string;
  searchType: 'hogar';
  mobile?: string;
  clientData?: any;
  revisarEstadoCuenta?: boolean;
}

const InvoiceList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [clientData, setClientData] = useState<any>(null);
  const [persistedClientName, setPersistedClientName] = useState<string>('');
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null); // Estado para controlar descarga PDF
  const [empresasProcesadas, setEmpresasProcesadas] = useState<EmpresaProcesada[]>([]);
  const [empresasConResultados, setEmpresasConResultados] = useState<string[]>([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<string>('todas');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showDateRangeSearch, setShowDateRangeSearch] = useState(false);
  const [showCompanySelection, setShowCompanySelection] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const isMobile = useIsMobile();

  const state = location.state as LocationState;
  
  // Preservar y detectar estado de autenticación de manera más robusta
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Primero intentar desde state actual
    if (state?.revisarEstadoCuenta !== undefined) {
      return state.revisarEstadoCuenta;
    }
    // Luego desde sessionStorage como respaldo
    const savedAuth = sessionStorage.getItem('userAuthenticated');
    return savedAuth === 'true';
  });
  
  // Guardar estado inicial en sessionStorage solo una vez
  useEffect(() => {
    let isMounted = true;
    
    if (state?.revisarEstadoCuenta !== undefined && isMounted) {
      const authValue = state.revisarEstadoCuenta;
      setIsAuthenticated(authValue);
      sessionStorage.setItem('userAuthenticated', authValue.toString());
    }
    
    return () => {
      isMounted = false;
    };
  }, []); // Solo ejecutar una vez al montar el componente
  
  // Debug: Verificar estado de autenticación
  console.log('🔍 InvoiceList - Estado de autenticación:', {
    fromState: state?.revisarEstadoCuenta,
    fromStorage: sessionStorage.getItem('userAuthenticated'),
    computed: isAuthenticated
  });
  
  // Determinar el código de cliente: desde parámetros URL o desde state
  const clientCodeFromUrl = params.clientCode;
  const clientCodeFromState = state?.clientCode;
  const clientCode = clientCodeFromUrl || clientCodeFromState || '';
  
  // Default client name if not provided in location state
  const clientName = state?.clientName || clientData?.Name || persistedClientName || 'Cliente';

  // Persistir nombre del cliente cuando esté disponible
  useEffect(() => {
    let isMounted = true;
    
    if (clientCode && isMounted) {
      // Cargar nombre persistido
      const savedClientName = sessionStorage.getItem(`clientName_${clientCode}`);
      if (savedClientName && isMounted) {
        setPersistedClientName(savedClientName);
      }
      
      // Guardar nombre actual si está disponible
      const currentName = state?.clientName || clientData?.Name;
      if (currentName && currentName !== 'Cliente' && isMounted) {
        sessionStorage.setItem(`clientName_${clientCode}`, currentName);
        if (savedClientName !== currentName) {  // Solo actualizar si cambió
          setPersistedClientName(currentName);
        }
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [clientCode]); // Remover dependencias que pueden causar bucles

  // Cargar empresa seleccionada desde sessionStorage cuando clientCode esté disponible
  useEffect(() => {
    if (clientCode) {
      const savedCompany = sessionStorage.getItem(`selectedCompany_${clientCode}`);
      if (savedCompany) {
        setSelectedCompany(savedCompany);
      }
    }
  }, [clientCode]);

  useEffect(() => {
    let isMounted = true;
    
    // Si tenemos código de cliente desde URL pero no datos en state, cargar datos del cliente
    if (clientCodeFromUrl && !state?.clientData && isMounted) {
      const fetchClientData = async () => {
        try {
          if (!isMounted) return;
          setLoading(true);
          const response = await clienteService.getCliente(clientCodeFromUrl);
          if (!isMounted) return;
          
          if (response?.data?.CUVc && response.data.CUVc.length > 0) {
            const cliente = response.data.CUVc[0];
            if (isMounted) {
              setClientData(cliente);
              console.log('Datos del cliente cargados desde URL:', cliente);
            }
          } else {
            if (isMounted) {
              toast.error('Cliente no encontrado');
              navigate('/');
            }
            return;
          }
        } catch (error) {
          console.error('Error al cargar cliente:', error);
          if (isMounted) {
            toast.error('Error al cargar datos del cliente');
            navigate('/');
          }
          return;
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      }
      fetchClientData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [clientCodeFromUrl]); // Simplificar dependencias

  useEffect(() => {
    let isMounted = true;
    
    // Llamada real a la API para obtener facturas del cliente
    const fetchInvoices = async () => {
      if (!clientCode || !isMounted) return;
      
      setLoading(true);
      try {
        const response = await clienteService.getFacturasFiltradas(clientCode);
        if (!isMounted) return;
        
        // Manejar estructura de JsonResult de .NET (con 'value') o respuesta directa
        const responseData = response?.value?.data || response?.data || {};
        const facturas = responseData.facturas && Array.isArray(responseData.facturas) ? responseData.facturas : [];
        
        if (!isMounted) return;
        
        // Guardar la respuesta para uso en el render
        setApiResponse(responseData);
        
        // Verificar si hay errores en alguna empresa
        if (responseData.errores && responseData.errores.length > 0) {
          responseData.errores.forEach((error: any) => {
            toast.error(`Error en ${error.empresa}: No se pudieron cargar las facturas`);
          });
        }
        
        const mappedInvoices = facturas.map((f: any) => ({
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
        }));
        
        if (!isMounted) return;
        
        setAllInvoices(mappedInvoices);
        
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
        
        // Si hay múltiples empresas con facturas, mostrar modal de selección
        if (empresasConFacturas.length > 1 && !selectedCompany && isMounted) {
          setShowCompanySelection(true);
        } else if (empresasConFacturas.length === 1 && isMounted) {
          // Si solo hay una empresa, seleccionarla automáticamente
          const companyCode = empresasConFacturas[0].CompCode;
          setSelectedCompany(companyCode);
          setEmpresaSeleccionada(companyCode);
          // Guardar selección en sessionStorage para este cliente
          sessionStorage.setItem(`selectedCompany_${clientCode}`, companyCode);
          // Filtrar facturas de esa empresa
          setInvoices(mappedInvoices.filter(inv => inv.CompanyCode === companyCode));
        } else if (selectedCompany) {
          // Si ya hay una empresa seleccionada, filtrar por ella
          setInvoices(mappedInvoices.filter(inv => inv.CompanyCode === selectedCompany));
        }
        
      } catch (error) {
        console.error('Error fetching invoices:', error);
        if (isMounted) {
          toast.error('No se pudieron cargar las facturas');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    if (clientCode && isMounted) {
      fetchInvoices();
    }
    
    return () => {
      isMounted = false;
    };
  }, [clientCode]);

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
        status: 'pendiente',
        empresaCode: invoice.CompanyCode // Agregar el código de empresa
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
      revisarEstadoCuenta: isAuthenticated, // ¡CRÍTICO! Preservar estado de autenticación
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
          'Orden': invoice.OrderNr || '',
          'Orden Cliente': invoice.CustOrdNr || '',
          'Referencia': invoice.RefStr || '',
          'Términos de Pago': invoice.FormaPago,
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
      headers.push('Orden', 'Orden Cliente', 'Referencia', 'Términos de Pago', 'Fecha Emisión', 'Fecha Vto.', 'Importe', 'Estado');
      XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A4' });
      
      // Agregar datos de facturas empezando desde la fila 5
      const facturasArray = facturasData.map(factura => {
        const baseArray = [
          factura['#'],
          factura['Nro. Doc'],
          factura['Nro. CUFE']
        ];
        
        if (mostrarSelectorEmpresas && empresaSeleccionada === 'todas') {
          baseArray.push(factura['Empresa']);
        }
        
        return baseArray.concat([
          factura['Orden'],
          factura['Orden Cliente'],
          factura['Referencia'],
          factura['Términos de Pago'],
          factura['Fecha Emisión'],
          factura['Fecha Vto.'],
          factura['Importe'],
          factura['Estado']
        ]);
      });
      XLSX.utils.sheet_add_aoa(ws, facturasArray, { origin: 'A5' });

      // Configurar anchos de columnas
      let colWidths = [
        { wch: 5 },   // #
        { wch: 15 },  // Nro. Doc
        { wch: 20 },  // Nro. CUFE
      ];
      
      if (mostrarSelectorEmpresas && empresaSeleccionada === 'todas') {
        colWidths.push({ wch: 15 }); // Empresa
      }
      
      colWidths = colWidths.concat([
        { wch: 15 },  // Orden
        { wch: 20 },  // Orden Cliente
        { wch: 20 },  // Referencia
        { wch: 15 },  // Términos de Pago
        { wch: 15 },  // Fecha Emisión
        { wch: 15 },  // Fecha Vto.
        { wch: 15 },  // Importe
        { wch: 10 }   // Estado
      ]);
      ws['!cols'] = colWidths;

      // Combinar celdas para el título del cliente
      if (!ws['!merges']) ws['!merges'] = [];
      // Calcular el número de columnas según si se muestra empresa o no
      const totalColumns = mostrarSelectorEmpresas && empresaSeleccionada === 'todas' ? 10 : 9;
      ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: totalColumns } });

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
      // Para móvil, no renderizamos headers de tabla ya que usaremos cards
      return null;
    }
    return (
      <TableRow>
        <TableHead className="w-10"></TableHead>
        <TableHead>Nro. Doc</TableHead>
        <TableHead>Nro. CUFE</TableHead>
        {mostrarSelectorEmpresas && empresaSeleccionada === 'todas' && (
          <TableHead>Empresa</TableHead>
        )}
        <TableHead>Términos de Pago</TableHead>
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
      // Para móvil, no usamos celdas de tabla sino cards
      return null;
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
            disabled={
              // Deshabilitado si no hay autenticación O si no hay OfficialSerNr O si está descargando
              !isAuthenticated || 
              !invoice.OfficialSerNr || 
              invoice.OfficialSerNr.trim() === '' || 
              downloadingPdf === invoice.SerNr
            }
            className="h-8 w-8 p-0 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white disabled:opacity-50"
            title={
              downloadingPdf === invoice.SerNr 
                ? 'Descargando...' 
                : !isAuthenticated
                  ? 'Descarga PDF requiere autenticación'
                : !invoice.OfficialSerNr || invoice.OfficialSerNr.trim() === ''
                  ? 'PDF no disponible para esta factura'
                : 'Descargar PDF'
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
  
  // Función para manejar selección de facturas
  const handleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  // Función para descargar PDF
  const handleDownloadPdf = (e: React.MouseEvent, serNr: string, officialSerNr: string, companyCode: string) => {
    e.stopPropagation();
    downloadInvoicePdf(serNr, officialSerNr, companyCode);
  };

  // Componente para card móvil individual  
  const renderMobileInvoiceCard = (invoice: Invoice, idx: number) => {
    const isSelected = selectedInvoices.includes(invoice.id);
    const isOverdue = parseLocalDate(invoice.PayDate) < new Date();
    
    return (
      <Card 
        key={invoice.id || `${invoice.SerNr}-${idx}`}
        className={`p-4 cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'bg-billpay-lightblue border-billpay-blue shadow-md' 
            : 'hover:shadow-md hover:border-gray-300'
        } ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
        onClick={() => handleInvoiceSelection(invoice.id)}
      >
        {/* Checkbox oculto pero funcional para selección */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => handleInvoiceSelection(invoice.id)}
          className="hidden"
          onClick={(e) => e.stopPropagation()}
        />
        
        {/* Primera fila: Número de factura y código largo en una sola fila */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg text-gray-900">#{invoice.SerNr}</h3>
          <p className="text-sm text-gray-600 truncate ml-2">{invoice.OfficialSerNr}</p>
        </div>
        
        {/* Segunda fila: Term. Pago */}
        <div className="mb-3">
          <p className="text-gray-500 text-xs mb-1">Term. Pago</p>
          <p className="font-medium text-sm">{invoice.FormaPago}</p>
        </div>
        
        {/* Tercera fila: Emisión y Vencimiento */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-gray-500 text-xs mb-1">Emisión</p>
            <p className="font-medium text-sm">{formatDate(invoice.InvDate)}</p>
            {/* Monto debajo de la fecha de emisión */}
            <p className={`font-bold text-lg mt-2 ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
              {formatAmount(invoice.Sum4)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Vencimiento</p>
            <p className={`font-medium text-sm ${isOverdue ? 'text-red-600' : ''}`}>
              {formatDate(invoice.PayDate)}
            </p>
            {/* Indicador de vencida debajo de la fecha de vencimiento */}
            {isOverdue && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                  <AlertTriangle className="h-3 w-3" />
                  Vencida
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Cuarta fila: Botón de descarga */}
        <div className="flex justify-center pt-3 border-t border-gray-100">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => handleDownloadPdf(e, invoice.SerNr, invoice.OfficialSerNr, invoice.CompanyCode)}
            disabled={(() => {
              const isDisabled = !isAuthenticated || 
                                !invoice.OfficialSerNr || 
                                invoice.OfficialSerNr.trim() === '' || 
                                downloadingPdf === invoice.SerNr;
              
              // Debug para móvil - solo mostrar para la primera factura para evitar spam
              if (invoice.SerNr === invoices[0]?.SerNr) {
                console.log('📱 DEBUG MÓVIL - Botón PDF:', {
                  SerNr: invoice.SerNr,
                  revisarEstadoCuenta: isAuthenticated,
                  OfficialSerNr: invoice.OfficialSerNr,
                  downloadingPdf,
                  isDisabled,
                  razon: !isAuthenticated ? 'No autenticado' :
                         !invoice.OfficialSerNr || invoice.OfficialSerNr.trim() === '' ? 'Sin OfficialSerNr' :
                         downloadingPdf === invoice.SerNr ? 'Descargando' : 'Habilitado'
                });
              }
              
              return isDisabled;
            })()}
            className="flex items-center gap-2 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white disabled:opacity-50"
            title={
              downloadingPdf === invoice.SerNr 
                ? 'Descargando...' 
                : !isAuthenticated
                  ? 'Descarga PDF requiere autenticación'
                : !invoice.OfficialSerNr || invoice.OfficialSerNr.trim() === ''
                  ? 'PDF no disponible para esta factura'
                : 'Descargar PDF'
            }
          >
            {downloadingPdf === invoice.SerNr ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {downloadingPdf === invoice.SerNr ? 'Descargando...' : 'Descargar PDF'}
          </Button>
        </div>
        
        {/* Mostrar empresa si es necesario */}
        {mostrarSelectorEmpresas && empresaSeleccionada === 'todas' && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-gray-500 text-xs mb-1">Empresa</p>
            <p className="font-medium text-sm">{invoice.CompanyShortName || invoice.CompanyName}</p>
          </div>
        )}
      </Card>
    );
  };

  // Componente optimizado para móvil con cards
  const renderMobileInvoiceCards = () => {
    if (!isMobile) return null;
    
    return (
      <div className="space-y-3">
        {facturasFiltradas.map((invoice, idx) => renderMobileInvoiceCard(invoice, idx))}
      </div>
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
      // Verificar cuántas vencidas están actualmente seleccionadas
      const vencidasSeleccionadas = prev.filter(id => vencidasIds.includes(id));
      const todasLasVencidasEstanSeleccionadas = vencidasIds.every(id => prev.includes(id));
      
      // Si todas las vencidas están seleccionadas, deseleccionar SOLO las vencidas
      if (todasLasVencidasEstanSeleccionadas) {
        // Mantener solo las facturas NO vencidas que estaban seleccionadas
        return prev.filter(id => !vencidasIds.includes(id));
      } else {
        // Si no todas las vencidas están seleccionadas, seleccionar TODAS las vencidas
        // Mantener las no vencidas que ya estaban seleccionadas y agregar todas las vencidas
        const noVencidasSeleccionadas = prev.filter(id => !vencidasIds.includes(id));
        return [...noVencidasSeleccionadas, ...vencidasIds];
      }
    });
  };

  // Las facturas ya están filtradas por empresa seleccionada
  const facturasFiltradas = invoices;
  
  // No mostrar selector de empresas ya que se selecciona al inicio
  const mostrarSelectorEmpresas = false;
  
  // Función para manejar la selección de empresa
  const handleCompanySelection = (companyCode: string) => {
    setSelectedCompany(companyCode);
    setEmpresaSeleccionada(companyCode);
    // Guardar selección en sessionStorage para este cliente
    sessionStorage.setItem(`selectedCompany_${clientCode}`, companyCode);
    // Filtrar facturas por la empresa seleccionada
    setInvoices(allInvoices.filter(inv => inv.CompanyCode === companyCode));
    setSelectedInvoices([]); // Limpiar selecciones
  };
  
  // Calcular facturas por empresa para el modal
  const facturasPerEmpresa = empresasProcesadas.reduce((acc, empresa) => {
    acc[empresa.CompCode] = allInvoices.filter(inv => inv.CompanyCode === empresa.CompCode).length;
    return acc;
  }, {} as Record<string, number>);


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
          CompanyShortName: f.CompanyShortName || f.companyShortName,
          OrderNr: f.OrderNr || f.orderNr,
          CustOrdNr: f.CustOrdNr || f.custOrdNr,
          RefStr: f.RefStr || f.refStr
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
          CompanyShortName: f.CompanyShortName || f.companyShortName,
          OrderNr: f.OrderNr || f.orderNr,
          CustOrdNr: f.CustOrdNr || f.custOrdNr,
          RefStr: f.RefStr || f.refStr
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
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-black">Facturas Pendientes</h1>
          {selectedCompany && (
            <img 
              src={getCompanyLogo(selectedCompany)} 
              alt="Logo empresa" 
              className="h-12 w-auto object-contain"
            />
          )}
        </div>

        {/* Botón para seleccionar vencidas ahora en la barra de controles */}
        
        {loading ? (
          <Card className="p-6 flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-billpay-blue mx-auto mb-4"></div>
              <p>Cargando facturas...</p>
            </div>
          </Card>
        ) : invoices.length > 0 ? (
          <>
            <Card className="p-6 shadow-sm border-gray-100">
              <div className="mb-6">
                <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-between items-start'}`}>
                  <div>
                    <p className="text-black font-bold">{isMobile ? `${clientCode} - ${clientName}` : `Cliente: #${clientCode} - ${clientName}`}</p>
                    {!isMobile && <p className="text-sm text-gray-500 mt-2">Seleccione una o más facturas para pagar</p>}
                  </div>
                  
                  {/* Layout específico para móvil */}
                  {isMobile ? (
                    <div className="space-y-3">
                      {/* Primera fila: botones principales con grid adaptativo */}
                                            <div className={`grid gap-2 ${isAuthenticated ? 'grid-cols-3' : 'grid-cols-1'}`}>
                        {/* Solo mostrar botones de búsqueda si hay autenticación */}
                        {isAuthenticated && (
                          <>
                            <Button
                              onClick={() => setShowDateRangeSearch(true)}
                              variant="outline"
                              size="sm"
                              className="flex flex-col items-center gap-1 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white h-14 text-xs"
                            >
                              <Calendar className="h-4 w-4" />
                              Facturas
                            </Button>
                            <Button
                              onClick={() => setShowPaymentHistory(true)}
                              variant="outline"
                              size="sm"
                              className="flex flex-col items-center gap-1 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white h-14 text-xs"
                            >
                              <Receipt className="h-4 w-4" />
                              Recibos
                            </Button>
                          </>
                        )}
                        <Button
                          onClick={exportToExcel}
                          variant="outline"
                          size="sm"
                          className="flex flex-col items-center gap-1 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white h-14 text-xs"
                        >
                          <Download className="h-4 w-4" />
                          Excel
                        </Button>
                      </div>
                      
                      {/* Segunda fila: Botón de vencidas */}
                      {hayVencidas && (
                        <div className="flex justify-start">
                          <Button
                            onClick={handleSelectVencidas}
                            variant={todasVencidasSeleccionadas ? "default" : "outline"}
                            size="sm"
                            className={`flex items-center gap-2 transition-all duration-300 ${
                              todasVencidasSeleccionadas 
                                ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' 
                                : 'text-red-600 border-red-600 hover:bg-red-600 hover:text-white animate-pulse'
                            }`}
                            title={todasVencidasSeleccionadas ? 'Deseleccionar todas las vencidas' : 'Seleccionar todas las facturas vencidas para pagarlas rápidamente'}
                          >
                            <AlertTriangle className="h-4 w-4" />
                            Seleccionar todas las vencidas
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              todasVencidasSeleccionadas 
                                ? 'bg-red-800 text-white' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {vencidasIds.length}
                            </span>
                          </Button>
                        </div>
                      )}
                      
                      {/* Etiqueta instructiva solo para móvil */}
                      {isMobile && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 text-center bg-blue-50 p-2 rounded border border-blue-200">
                            Seleccione una o más facturas al tocar los recuadros listados:
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Layout para desktop - sin cambios */
                    <div className="flex gap-2">
                      {/* Solo mostrar estos botones si viene de "Revisar estado cuenta" */}
                      {isAuthenticated && (
                        <>
                          <Button
                            onClick={() => setShowDateRangeSearch(true)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white"
                          >
                            <Calendar className="h-4 w-4" />
                            Ver Facturas
                          </Button>
                          <Button
                            onClick={() => setShowPaymentHistory(true)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white"
                          >
                            <Receipt className="h-4 w-4" />
                            Ver Recibos
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={exportToExcel}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white"
                      >
                        <Download className="h-4 w-4" />
                        Exportar Excel
                      </Button>
                      {/* Botón para seleccionar facturas vencidas en desktop */}
                      {hayVencidas && (
                        <Button
                          onClick={handleSelectVencidas}
                          variant={todasVencidasSeleccionadas ? "default" : "outline"}
                          size="sm"
                          className={`flex items-center gap-2 transition-all duration-300 ${
                            todasVencidasSeleccionadas 
                              ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' 
                              : 'text-red-600 border-red-600 hover:bg-red-600 hover:text-white animate-pulse'
                          }`}
                          title={todasVencidasSeleccionadas ? 'Deseleccionar todas las vencidas' : 'Seleccionar todas las facturas vencidas para pagarlas rápidamente'}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          {todasVencidasSeleccionadas ? 'Deseleccionar vencidas' : 'Seleccionar todas las vencidas'}
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            todasVencidasSeleccionadas 
                              ? 'bg-red-800 text-white' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {vencidasIds.length}
                          </span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            
            {/* Renderizado móvil optimizado con cards */}
            {isMobile ? (
              <div className="mb-6">
                {renderMobileInvoiceCards()}
              </div>
            ) : (
              /* Renderizado desktop con tabla */
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
                        {renderTableCells(invoice)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
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
          </>
        ) : (
          <>
            <Card className="p-6 shadow-sm border-gray-100">
              <div className="mb-6">
                <div className={`${isMobile ? 'flex flex-col space-y-3 -ml-6' : 'flex justify-between items-start'}`}>
                  <div>
                    <p className="text-black font-bold">{isMobile ? `${clientCode} - ${clientName}` : `Cliente: #${clientCode} - ${clientName}`}</p>
                  </div>
                  <div className={`flex gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                    {/* Solo mostrar estos botones si viene de "Revisar estado cuenta" */}
                    {isAuthenticated && (
                      <>
                        <Button
                          onClick={() => setShowDateRangeSearch(true)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white"
                        >
                          <Calendar className="h-4 w-4" />
                          {isMobile ? 'Facturas' : 'Ver Facturas'}
                        </Button>
                        <Button
                          onClick={() => setShowPaymentHistory(true)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 text-billpay-blue border-billpay-blue hover:bg-billpay-blue hover:text-white"
                        >
                          <Receipt className="h-4 w-4" />
                          {isMobile ? 'Recibos' : 'Ver Recibos'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            
            <div className={`overflow-x-auto mb-6 ${isMobile ? '-ml-6' : ''}`}>
              <Table className="text-sm">
                <TableHeader>
                  {renderTableHeaders()}
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell 
                      colSpan={8} 
                      className="h-32 text-center text-gray-500"
                    >
                      No hay facturas para mostrar
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
          </>
        )}
      </main>

      {/* Modal de Ver Recibos */}
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
        clientCode={clientCode}
        clientName={clientName}
        empresasDisponibles={empresasProcesadas}
        empresaSeleccionada={empresaSeleccionada}
      />
      
      {/* Modal de Selección de Empresa */}
      <CompanySelectionModal
        isOpen={showCompanySelection}
        onClose={() => setShowCompanySelection(false)}
        onSelectCompany={handleCompanySelection}
        empresas={empresasProcesadas}
        facturasPerEmpresa={facturasPerEmpresa}
        clientName={clientName}
        clientCode={clientCode}
      />
    </div>
  );
};

export default InvoiceList;
