import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface CodigoVerificacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (codigo: string) => void;
  email: string;
  tipoConsulta: 'facturas' | 'recibos';
}

const CodigoVerificacionModal = ({ 
  isOpen, 
  onClose, 
  onVerify, 
  email, 
  tipoConsulta 
}: CodigoVerificacionModalProps) => {
  const [codigo, setCodigo] = useState(['', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(60);
      setIsTimeUp(false);
      setCodigo(['', '', '', '']);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setIsTimeUp(true);
      toast.error('Tiempo expirado. Por favor, solicite un nuevo código.');
    }
  }, [isOpen, timeLeft]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCodigo = [...codigo];
      newCodigo[index] = value;
      setCodigo(newCodigo);

      // Auto-focus next input
      if (value && index < 3) {
        const nextInput = document.getElementById(`codigo-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      const prevInput = document.getElementById(`codigo-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = () => {
    const codigoCompleto = codigo.join('');
    if (codigoCompleto.length === 4) {
      onVerify(codigoCompleto);
    } else {
      toast.error('Por favor ingrese el código completo de 4 dígitos');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verificación de Código</DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-6">
          {/* Logo de la empresa */}
          <div className="flex justify-center">
            <img 
              src="/lovable-uploads/Logo_Celero_Networks.svg" 
              alt="Celero Networks" 
              className="h-12 w-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/lovable-uploads/Celero_Networks.png";
              }}
            />
          </div>

          {/* Mensaje */}
          <div className="space-y-2">
            <p className="text-gray-600">
              Se ha enviado un código de verificación de 4 dígitos a:
            </p>
            <p className="font-medium text-billpay-cyan">{email}</p>
            <p className="text-sm text-gray-500">
              Para consultar {tipoConsulta === 'facturas' ? 'facturas' : 'recibos'}
            </p>
          </div>

          {/* Temporizador */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">Tiempo restante:</p>
            <div className={`text-2xl font-mono font-bold ${
              timeLeft <= 10 ? 'text-red-500' : 'text-billpay-cyan'
            }`}>
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Campos de código */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Ingrese su código de verificación:</p>
            <div className="flex justify-center space-x-3">
              {codigo.map((digit, index) => (
                <Input
                  key={index}
                  id={`codigo-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-bold"
                  disabled={isTimeUp}
                />
              ))}
            </div>
          </div>

          {/* Botón confirmar */}
          <Button 
            onClick={handleSubmit}
            disabled={isTimeUp || codigo.join('').length !== 4}
            className="w-full bg-billpay-cyan hover:bg-billpay-cyan/90 text-white"
          >
            {isTimeUp ? 'Tiempo Expirado' : 'Confirmar Código'}
          </Button>

          {isTimeUp && (
            <Button 
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Solicitar Nuevo Código
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CodigoVerificacionModal;