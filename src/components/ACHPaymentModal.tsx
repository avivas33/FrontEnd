import { useState, useEffect } from 'react';
import { X, Upload, FileText, Image, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { formatDate, formatAmount } from '../lib/utils';
import { achService, ACHInstructions } from '../services/achService';
import { useIsMobile } from '@/hooks/use-mobile';
import { useActivityTracking } from '@/hooks/useActivityTracking';

interface ACHFile {
  id: string;
  file: File;
  preview?: string;
  invoiceId?: string; // Si es individual, asociar a una factura específica
  isGlobal?: boolean; // Si es un comprobante global
  numeroTransaccion?: string;
  fechaTransaccion?: Date;
  observaciones?: string;
}

interface InvoiceData {
  clientName: string;
  clientCode: string;
  serviceType: string;
  invoiceNumber: string;
  officialSerNr: string;
  payDeal: string;
  invDate: string;
  dueDate: string;
  amount: number;
  status: string;
  empresaCode?: string;
}

interface ACHPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: InvoiceData[];
  totalAmount: number;
  onConfirm: (files: ACHFile[]) => void;
}

export function ACHPaymentModal({ isOpen, onClose, invoices, totalAmount, onConfirm }: ACHPaymentModalProps) {
  const isMobile = useIsMobile();
  const { trackPaymentAttempt, trackPaymentSuccess, trackPaymentFailed } = useActivityTracking();
  
  // Siempre usar modo global (removida opción individual)
  const uploadMode = 'global';
  const [files, setFiles] = useState<ACHFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [achInstructions, setAchInstructions] = useState<ACHInstructions | null>(null);
  
  // Estados para secciones colapsables en móvil
  const [sectionsExpanded, setSectionsExpanded] = useState({
    instructions: !isMobile,
    files: true,
    invoices: !isMobile,
  });
  
  // Campos adicionales para el pago ACH
  const [numeroTransaccion, setNumeroTransaccion] = useState('');
  const [fechaTransaccion, setFechaTransaccion] = useState(new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState('');

  // Cargar instrucciones ACH al abrir el modal
  useEffect(() => {
    if (isOpen) {
      // Obtener el código de empresa de las facturas (todas deberían tener el mismo)
      const companyCode = invoices[0]?.empresaCode || '2'; // Por defecto empresa 2
      achService.getACHInstructions(companyCode).then(instructions => {
        setAchInstructions(instructions);
      });
    }
  }, [isOpen, invoices]);

  // Actualizar secciones expandidas cuando cambie el modo móvil
  useEffect(() => {
    setSectionsExpanded({
      instructions: !isMobile,
      files: true,
      invoices: !isMobile,
    });
  }, [isMobile]);

  // Limpiar al cerrar
  const handleClose = () => {
    setFiles([]);
    setNumeroTransaccion('');
    setFechaTransaccion(new Date().toISOString().slice(0, 10));
    setObservaciones('');
    onClose();
  };

  // Manejar subida de archivos
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, invoiceId?: string) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    Array.from(uploadedFiles).forEach(file => {
      // Validar tipo de archivo
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error(`El archivo ${file.name} no es válido. Solo se permiten PDF, PNG, JPG.`);
        return;
      }

      // Validar tamaño (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`El archivo ${file.name} es muy grande. Máximo 10MB.`);
        return;
      }

      const newFile: ACHFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        invoiceId: undefined,
        isGlobal: true
      };

      // Crear preview para imágenes
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newFile.preview = reader.result as string;
          setFiles(prev => [...prev, newFile]);
        };
        reader.readAsDataURL(file);
      } else {
        setFiles(prev => [...prev, newFile]);
      }
    });

    // Limpiar input
    event.target.value = '';
  };

  // Eliminar archivo
  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Verificar si hay comprobante global
  const hasComprobante = () => {
    return files.some(f => f.isGlobal);
  };

  // Procesar pago
  const handleConfirm = async () => {
    // Validar que haya al menos un archivo
    if (files.length === 0) {
      toast.error('Debe subir al menos un comprobante');
      return;
    }

    // Validar número de transacción
    if (!numeroTransaccion.trim()) {
      toast.error('El número de transacción es requerido');
      return;
    }

    // Validar fecha de transacción
    if (!fechaTransaccion) {
      toast.error('La fecha de transacción es requerida');
      return;
    }


    setIsProcessing(true);
    
    // Track payment attempt
    await trackPaymentAttempt('ach', totalAmount, 'USD');
    
    try {
      // Agregar datos de transacción a los archivos
      const filesWithData = files.map(file => ({
        ...file,
        numeroTransaccion,
        fechaTransaccion: new Date(fechaTransaccion),
        observaciones
      }));
      
      await onConfirm(filesWithData);
      
      // Track successful ACH submission
      await trackPaymentSuccess('ach', totalAmount, 'USD', numeroTransaccion);
      
      handleClose();
    } catch (error) {
      // Track failed ACH submission
      await trackPaymentFailed('ach', totalAmount, 'USD', 'SUBMISSION_FAILED');
      toast.error('Error al procesar el pago');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] w-[95vw] max-h-[95vh] p-3' : 'max-w-3xl max-h-[85vh]'} overflow-y-auto`}>
        <DialogHeader className={isMobile ? 'pb-2' : ''}>
          <DialogTitle className={isMobile ? 'text-lg' : ''}>Pago por ACH</DialogTitle>
        </DialogHeader>

        <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
          {/* Resumen de facturas */}
          {isMobile ? (
            <Collapsible
              open={sectionsExpanded.invoices}
              onOpenChange={(open) => setSectionsExpanded(prev => ({ ...prev, invoices: open }))}
            >
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-10 text-sm">
                  <span className="font-medium">Facturas ({invoices.length})</span>
                  {sectionsExpanded.invoices ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <Card className="p-2">
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <div key={invoice.invoiceNumber} className="border-b pb-2 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{invoice.invoiceNumber}</p>
                            <p className="text-xs text-gray-500">Fecha: {formatDate(invoice.invDate)}</p>
                            <p className="text-xs text-gray-500">Vence: {formatDate(invoice.dueDate)}</p>
                          </div>
                          <p className="font-bold text-sm ml-2">{formatAmount(invoice.amount.toString())}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t flex justify-between items-center">
                    <span className="font-medium text-sm">Total:</span>
                    <span className="text-lg font-bold text-billpay-blue">{formatAmount(totalAmount.toString())}</span>
                  </div>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div>
              <h3 className="text-base font-semibold mb-2">Resumen de facturas</h3>
              <Card className="p-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm">Factura</TableHead>
                      <TableHead className="text-sm">Fecha</TableHead>
                      <TableHead className="text-sm">Vencimiento</TableHead>
                      <TableHead className="text-right text-sm">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.invoiceNumber}>
                        <TableCell className="text-sm">{invoice.invoiceNumber}</TableCell>
                        <TableCell className="text-sm">{formatDate(invoice.invDate)}</TableCell>
                        <TableCell className="text-sm">{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {formatAmount(invoice.amount.toString())}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <span className="font-semibold">Total a pagar:</span>
                  <span className="text-lg font-bold">{formatAmount(totalAmount.toString())}</span>
                </div>
              </Card>
            </div>
          )}

          {/* Subir comprobante global */}
          <div>
              <h3 className={`${isMobile ? 'text-base' : 'text-base'} font-semibold ${isMobile ? 'mb-2' : 'mb-2'}`}>Subir comprobante</h3>
              <Card className={isMobile ? 'p-2' : 'p-3'}>
                <Label htmlFor="global-file" className="cursor-pointer">
                  <div className={`border-2 border-dashed border-gray-300 rounded-lg ${isMobile ? 'p-3' : 'p-4'} text-center hover:border-gray-400 transition-colors`}>
                    <Upload className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} mx-auto ${isMobile ? 'mb-1' : 'mb-2'} text-gray-400`} />
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                      {isMobile ? 'Toca para seleccionar' : 'Arrastra archivos aquí o haz clic para seleccionar'}
                    </p>
                    <p className={`text-xs text-gray-500 ${isMobile ? 'mt-0.5' : 'mt-1'}`}>
                      PDF, PNG, JPG (máx. 10MB)
                    </p>
                  </div>
                  <input
                    id="global-file"
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e)}
                  />
                </Label>
              </Card>
            </div>

          {/* Archivos subidos */}
          {files.length > 0 && (
            <div>
              <h3 className={`${isMobile ? 'text-base' : 'text-base'} font-semibold ${isMobile ? 'mb-2' : 'mb-2'}`}>Archivos subidos</h3>
              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                {files.map((file) => (
                  <Card key={file.id} className={isMobile ? 'p-2' : 'p-3'}>
                    <div className={`flex items-center justify-between ${isMobile ? 'gap-2' : 'gap-3'}`}>
                      <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'} flex-1 min-w-0`}>
                        {file.preview ? (
                          <img 
                            src={file.preview} 
                            alt={file.file.name} 
                            className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} object-cover rounded flex-shrink-0`} 
                          />
                        ) : file.file.type === 'application/pdf' ? (
                          <FileText className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-red-500 flex-shrink-0`} />
                        ) : (
                          <Image className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-blue-500 flex-shrink-0`} />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium truncate`}>
                            {file.file.name}
                          </p>
                          <p className={`text-xs text-gray-500`}>
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(file.id)}
                        className={`text-red-600 hover:text-red-700 flex-shrink-0 ${isMobile ? 'h-6 w-6 p-1' : ''}`}
                      >
                        <Trash2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Datos de la transacción */}
          <div>
            <h3 className={`${isMobile ? 'text-base' : 'text-base'} font-semibold ${isMobile ? 'mb-2' : 'mb-2'}`}>Datos de la transacción</h3>
            <Card className={isMobile ? 'p-2' : 'p-3'}>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} ${isMobile ? 'gap-2' : 'gap-3'}`}>
                <div>
                  <Label htmlFor="numeroTransaccion" className={isMobile ? 'text-sm' : ''}>Número de transacción</Label>
                  <Input
                    id="numeroTransaccion"
                    placeholder="Ej: TXN123456789"
                    value={numeroTransaccion}
                    onChange={(e) => setNumeroTransaccion(e.target.value)}
                    className={`${isMobile ? 'text-sm h-9 mt-1' : 'text-base'}`}
                  />
                </div>
                <div>
                  <Label htmlFor="fechaTransaccion" className={isMobile ? 'text-sm' : ''}>Fecha de transacción *</Label>
                  <Input
                    id="fechaTransaccion"
                    type="date"
                    value={fechaTransaccion}
                    onChange={(e) => setFechaTransaccion(e.target.value)}
                    required
                    className={`${isMobile ? 'text-sm h-9 mt-1' : 'text-base'}`}
                  />
                </div>
              </div>
              <div className={isMobile ? 'mt-2' : 'mt-3'}>
                <Label htmlFor="observaciones" className={isMobile ? 'text-sm' : ''}>Observaciones</Label>
                <Textarea
                  id="observaciones"
                  placeholder="Información adicional sobre el pago (opcional)"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={isMobile ? 2 : 2}
                  className={`${isMobile ? 'text-sm mt-1' : 'text-base'}`}
                />
              </div>
            </Card>
          </div>

          {/* Instrucciones ACH */}
          {achInstructions && (
            isMobile ? (
              <Collapsible
                open={sectionsExpanded.instructions}
                onOpenChange={(open) => setSectionsExpanded(prev => ({ ...prev, instructions: open }))}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-10 text-sm">
                    <span className="font-medium">Instrucciones ACH</span>
                    {sectionsExpanded.instructions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <h4 className="font-medium text-blue-900 mb-1 text-sm">{achInstructions.title}</h4>
                    <ol className="list-decimal list-inside space-y-0.5 text-xs text-blue-800">
                      {achInstructions.steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <p className="text-xs font-medium text-blue-900 mb-1">{achInstructions.bankDetails.title}</p>
                      {achInstructions.bankDetails.banks.map((bank, index) => (
                        <div key={index} className="mb-2 last:mb-0">
                          <p className="text-xs text-blue-800 font-medium">{bank.bank}</p>
                          <p className="text-xs text-blue-800">Beneficiario: {bank.beneficiary}</p>
                          <p className="text-xs text-blue-800">Cuenta: {bank.accountNumber}</p>
                          <p className="text-xs text-blue-800">Tipo: {bank.accountType}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">{achInstructions.title}</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  {achInstructions.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-2">{achInstructions.bankDetails.title}</p>
                  {achInstructions.bankDetails.banks.map((bank, index) => (
                    <div key={index} className="mb-3 last:mb-0">
                      <p className="text-sm text-blue-800 font-medium">{bank.bank}</p>
                      <p className="text-sm text-blue-800">Beneficiario: {bank.beneficiary}</p>
                      <p className="text-sm text-blue-800">Cuenta: {bank.accountNumber}</p>
                      <p className="text-sm text-blue-800">Tipo: {bank.accountType}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Botones de acción */}
          <div className={`flex ${isMobile ? 'flex-col' : 'justify-end'} ${isMobile ? 'gap-2' : 'gap-3'} ${isMobile ? 'pt-2' : 'pt-3'} border-t`}>
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={isProcessing}
              className={isMobile ? 'w-full h-10 text-sm' : ''}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isProcessing || files.length === 0}
              className={`bg-billpay-blue hover:bg-billpay-blue/90 ${isMobile ? 'w-full h-10 text-sm' : ''}`}
            >
              {isProcessing ? 'Procesando...' : 'Confirmar Pago ACH'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}