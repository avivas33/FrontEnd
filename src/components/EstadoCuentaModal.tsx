import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface EstadoCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'facturas' | 'recibos') => void;
  clientName: string;
}

const EstadoCuentaModal = ({ isOpen, onClose, onSelectOption, clientName }: EstadoCuentaModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccionar tipo de consulta</DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            Cliente: <span className="font-medium">{clientName}</span>
          </p>
          <p className="text-sm text-gray-500">
            Para revisar su estado de cuenta, seleccione la opción que desea consultar:
          </p>
          <div className="flex flex-col space-y-3">
            <Button 
              onClick={() => onSelectOption('facturas')}
              className="bg-billpay-cyan hover:bg-billpay-cyan/90 text-white"
            >
              Ver Facturas
            </Button>
            <Button 
              onClick={() => onSelectOption('recibos')}
              variant="outline"
              className="border-billpay-cyan text-billpay-cyan hover:bg-billpay-cyan hover:text-white"
            >
              Ver Recibos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EstadoCuentaModal;