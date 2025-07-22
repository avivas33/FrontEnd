import React, { useEffect, useState } from 'react';
import { API_CONFIG } from '@/config/api';
import { useRecaptcha } from '@/hooks/useApi';

interface ReCaptchaProps {
  onVerify: (token: string, isValid: boolean) => void;
}

const SITE_KEY = API_CONFIG.RECAPTCHA_SITE_KEY;

const ReCaptcha: React.FC<ReCaptchaProps> = ({ onVerify }) => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const { verificar, loading: verifyLoading, error } = useRecaptcha();

  useEffect(() => {
    // Cargar el script solo si no existe
    if (!document.getElementById('recaptcha-enterprise-script')) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${SITE_KEY}`;
      script.async = true;
      script.defer = true;
      script.id = 'recaptcha-enterprise-script';
      document.body.appendChild(script);
    }
  }, []);

  // Ejecutar reCAPTCHA Enterprise invisible
  const handleCheck = async () => {
    if (checked || loading) return;
    setLoading(true);
    
    try {
      if ((window as any).grecaptcha && (window as any).grecaptcha.enterprise) {
        (window as any).grecaptcha.enterprise.ready(async () => {
          try {
            const token = await (window as any).grecaptcha.enterprise.execute(SITE_KEY, { action: 'Cliente' });
            
            // Verificar el token con nuestro backend
            const isValid = await verificar(token);
            
            setChecked(isValid);
            setLoading(false);
            onVerify(token, isValid);
          } catch (error) {
            console.error('Error al ejecutar reCAPTCHA:', error);
            setLoading(false);
            onVerify('', false);
          }
        });
      } else {
        setLoading(false);
        alert('reCAPTCHA aún no está listo. Intenta de nuevo en unos segundos.');
        onVerify('', false);
      }
    } catch (error) {
      console.error('Error en reCAPTCHA:', error);
      setLoading(false);
      onVerify('', false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <label className="flex items-center space-x-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleCheck}
          disabled={checked || loading || verifyLoading}
          className="accent-billpay-cyan w-5 h-5"
        />
        <span className="text-base font-medium">
          {checked ? '¡Verificado!' : (loading || verifyLoading) ? 'Verificando...' : 'No soy un robot'}
        </span>
      </label>
      {error && (
        <div className="text-xs text-red-500 mt-1">
          Error: {error}
        </div>
      )}
      <div className="text-xs text-gray-400 mt-2">Protegido por reCAPTCHA Enterprise</div>
    </div>
  );
};

export default ReCaptcha;
