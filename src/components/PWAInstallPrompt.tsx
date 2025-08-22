import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Download, Wifi, WifiOff, RefreshCw, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

const PWAInstallPrompt = () => {
  const { canInstall, installPWA, isOnline, isInstalled, updateAvailable, updatePWA } = usePWA();
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(true);

  // Debug logs
  useEffect(() => {
    console.log('PWA Status:', { canInstall, isInstalled, isOnline, updateAvailable });
  }, [canInstall, isInstalled, isOnline, updateAvailable]);

  // Mostrar prompt de actualización
  if (updateAvailable && showUpdatePrompt) {
    return (
      <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto">
        <Card className="bg-blue-50 border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-blue-900">Actualización Disponible</h3>
              <p className="text-xs text-blue-700 mb-3">
                Nueva versión de la app disponible
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={updatePWA}
                  className="text-xs bg-blue-600 hover:bg-blue-700"
                >
                  Actualizar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUpdatePrompt(false)}
                  className="text-xs"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Mostrar prompt de instalación si está disponible y no está instalada
  if (canInstall && !isInstalled && showInstallPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
        <Card className="bg-white border shadow-lg p-4">
          <div className="flex items-start gap-3">
            <Download className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Instalar App</h3>
              <p className="text-xs text-gray-600 mb-3">
                Instala Celero Self-Service para acceso rápido y uso sin conexión
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={installPWA}
                  className="text-xs bg-blue-600 hover:bg-blue-700"
                >
                  Instalar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowInstallPrompt(false)}
                  className="text-xs"
                >
                  Ahora no
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }
  // Mostrar indicador de estado siempre visible
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-lg">
        {isInstalled && (
          <img src="/favicon.png" alt="Celero App Instalada" className="h-4 w-4" />
        )}
        {!isOnline && (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        {!isOnline && (
          <span className="text-xs text-gray-600">Sin conexión</span>
        )}
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
