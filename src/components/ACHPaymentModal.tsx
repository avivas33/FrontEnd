import { useState, useEffect } from 'react';
import { X, Upload, FileText, Image, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { formatDate, formatAmount } from '../lib/utils';
import { achService, ACHInstructions } from '../services/achService';

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
  // Siempre usar modo global (removida opción individual)
  const uploadMode = 'global';
  const [files, setFiles] = useState<ACHFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [achInstructions, setAchInstructions] = useState<ACHInstructions | null>(null);
  
  // Campos adicionales para el pago ACH
  const [numeroTransaccion, setNumeroTransaccion] = useState('');
  const [fechaTransaccion, setFechaTransaccion] = useState(new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState('');

  // Cargar instrucciones ACH al abrir el modal
  useEffect(() => {
    if (isOpen) {
      achService.getACHInstructions().then(instructions => {
        setAchInstructions(instructions);
      });
    }
  }, [isOpen]);

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
    try {
      // Agregar datos de transacción a los archivos
      const filesWithData = files.map(file => ({
        ...file,
        numeroTransaccion,
        fechaTransaccion: new Date(fechaTransaccion),
        observaciones
      }));
      
      await onConfirm(filesWithData);
      handleClose();
    } catch (error) {
      toast.error('Error al procesar el pago');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pago por ACH</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen de facturas */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Resumen de facturas</h3>
            <Card className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.invoiceNumber}>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{formatDate(invoice.invDate)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAmount(invoice.amount.toString())}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="font-semibold">Total a pagar:</span>
                <span className="text-xl font-bold">{formatAmount(totalAmount.toString())}</span>
              </div>
            </Card>
          </div>

          {/* Subir comprobante global */}
          <div>
              <h3 className="text-lg font-semibold mb-3">Subir comprobante</h3>
              <Card className="p-4">
                <Label htmlFor="global-file" className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Arrastra archivos aquí o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
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
              <h3 className="text-lg font-semibold mb-3">Archivos subidos</h3>
              <div className="space-y-2">
                {files.map((file) => (
                  <Card key={file.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {file.preview ? (
                          <img src={file.preview} alt={file.file.name} className="h-10 w-10 object-cover rounded" />
                        ) : file.file.type === 'application/pdf' ? (
                          <FileText className="h-10 w-10 text-red-500" />
                        ) : (
                          <Image className="h-10 w-10 text-blue-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{file.file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(file.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Datos de la transacción */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Datos de la transacción</h3>
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numeroTransaccion">Número de transacción *</Label>
                  <Input
                    id="numeroTransaccion"
                    placeholder="Ej: TXN123456789"
                    value={numeroTransaccion}
                    onChange={(e) => setNumeroTransaccion(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fechaTransaccion">Fecha de transacción *</Label>
                  <Input
                    id="fechaTransaccion"
                    type="date"
                    value={fechaTransaccion}
                    onChange={(e) => setFechaTransaccion(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  placeholder="Información adicional sobre el pago (opcional)"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                />
              </div>
            </Card>
          </div>

          {/* Instrucciones ACH */}
          {achInstructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">{achInstructions.title}</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                {achInstructions.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-sm font-semibold text-blue-900">{achInstructions.bankDetails.title}</p>
                <p className="text-sm text-blue-800">Banco: {achInstructions.bankDetails.bank}</p>
                <p className="text-sm text-blue-800">Cuenta: {achInstructions.bankDetails.accountNumber}</p>
                <p className="text-sm text-blue-800">Beneficiario: {achInstructions.bankDetails.beneficiary}</p>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isProcessing || files.length === 0}
              className="bg-billpay-blue hover:bg-billpay-blue/90"
            >
              {isProcessing ? 'Procesando...' : 'Confirmar Pago ACH'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}