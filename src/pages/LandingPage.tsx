import { useNavigate } from 'react-router-dom';
import { Wifi, Globe, Link, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import BillPayHeader from '@/components/BillPayHeader';
import ApiStatusIndicator from '@/components/ApiStatusIndicator';

const LandingPage = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <BillPayHeader />
      
      <main className="flex-1">
        {/* Hero Section - Enhanced Mobile */}
        <div className="bg-gradient-to-br from-[#121212] via-gray-900 to-[#1a1a1a] text-white py-12 md:py-20 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 md:top-20 left-5 md:left-10 w-20 md:w-32 h-20 md:h-32 bg-blue-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 md:bottom-20 right-5 md:right-10 w-24 md:w-40 h-24 md:h-40 bg-cyan-500 rounded-full blur-3xl"></div>
          </div>
          
          <div className="container max-w-6xl mx-auto px-4 flex flex-col items-center text-center relative z-10">
            <Badge className="mb-4 md:mb-6 bg-billpay-cyan/20 text-billpay-cyan border-billpay-cyan/30 animate-pulse text-xs md:text-sm px-3 py-1">
              ¡Oferta Especial! Instalación Gratis
            </Badge>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent animate-fade-in leading-tight">
              Conecta con la mejor velocidad
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl mb-6 md:mb-8 max-w-3xl text-gray-300 animate-fade-in px-2">
              Servicios de internet confiables y de alta velocidad para tu hogar y negocio. 
              Disfruta de una conexión estable y rápida las 24 horas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 animate-fade-in w-full max-w-md sm:max-w-none items-center justify-center">
              <Button 
                onClick={() => navigate('/index')}
                className="bg-gradient-to-r from-billpay-cyan to-blue-500 hover:from-billpay-cyan/90 hover:to-blue-500/90 px-6 md:px-8 py-4 md:py-6 rounded-full text-base md:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full sm:w-auto h-12 md:h-14"
                size="lg"
              >
                Pagar mi factura
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button 
                variant="outline"
                className="border-white/30 text-gray-900 bg-white hover:bg-gray-100 px-6 md:px-8 py-4 md:py-6 rounded-full text-base md:text-lg backdrop-blur-sm w-full sm:w-auto h-12 md:h-14"
                size="lg"
              >
                Ver planes
              </Button>
            </div>
          </div>
        </div>

        {/* Services Section - Enhanced Mobile */}
        <div className="py-12 md:py-16 container max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-billpay-blue mb-3 md:mb-4 text-center">Nuestros Servicios</h2>
          <p className="text-gray-600 text-center mb-8 md:mb-12 text-base md:text-lg px-4">Encuentra el plan perfecto para tus necesidades</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="p-6 md:p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gray-50 border border-gray-200 rounded-xl shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-green-500 text-white px-2 md:px-3 py-1 text-xs md:text-sm font-semibold rounded-bl-lg">
                Más Popular
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-billpay-lightblue p-3 md:p-4 rounded-full mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                  <Wifi className="h-8 w-8 md:h-10 md:w-10 text-billpay-blue" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-2">Internet Residencial</h3>
                <p className="text-gray-600 mb-4 text-sm md:text-base">Conexiones estables y de alta velocidad para todas tus actividades online desde casa.</p>
                <div className="mb-4">
                  <p className="font-bold text-billpay-cyan text-2xl md:text-3xl">$29.99</p>
                  <p className="text-gray-500">/mes</p>
                </div>
                <ul className="text-sm text-gray-600 mb-4 md:mb-6 space-y-2">
                  <li>• Hasta 100 Mbps</li>
                  <li>• Instalación gratuita</li>
                  <li>• Router WiFi incluido</li>
                </ul>
                <Button className="w-full bg-billpay-blue hover:bg-billpay-blue/90 rounded-full">
                  Contratar ahora
                </Button>
              </div>
            </Card>
            
            <Card className="p-6 md:p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gray-50 border border-gray-200 rounded-xl shadow-sm group">
              <div className="flex flex-col items-center text-center">
                <div className="bg-billpay-lightblue p-3 md:p-4 rounded-full mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                  <Globe className="h-8 w-8 md:h-10 md:w-10 text-billpay-blue" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-2">Internet Empresarial</h3>
                <p className="text-gray-600 mb-4 text-sm md:text-base">Soluciones de alta velocidad para empresas con soporte técnico prioritario.</p>
                <div className="mb-4">
                  <p className="font-bold text-billpay-cyan text-2xl md:text-3xl">$59.99</p>
                  <p className="text-gray-500">/mes</p>
                </div>
                <ul className="text-sm text-gray-600 mb-4 md:mb-6 space-y-2">
                  <li>• Hasta 500 Mbps</li>
                  <li>• IP estática</li>
                  <li>• Soporte prioritario</li>
                </ul>
                <Button variant="outline" className="w-full border-billpay-cyan text-billpay-cyan hover:bg-billpay-lightblue rounded-full">
                  Más información
                </Button>
              </div>
            </Card>
            
            <Card className="p-6 md:p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gray-50 border border-gray-200 rounded-xl shadow-sm group">
              <div className="flex flex-col items-center text-center">
                <div className="bg-billpay-lightblue p-3 md:p-4 rounded-full mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                  <Link className="h-8 w-8 md:h-10 md:w-10 text-billpay-blue" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-2">Internet + TV</h3>
                <p className="text-gray-600 mb-4 text-sm md:text-base">Combina tu servicio de internet con TV para disfrutar del mejor entretenimiento.</p>
                <div className="mb-4">
                  <p className="font-bold text-billpay-cyan text-2xl md:text-3xl">$49.99</p>
                  <p className="text-gray-500">/mes</p>
                </div>
                <ul className="text-sm text-gray-600 mb-4 md:mb-6 space-y-2">
                  <li>• Hasta 200 Mbps</li>
                  <li>• 100+ canales HD</li>
                  <li>• Streaming incluido</li>
                </ul>
                <Button variant="outline" className="w-full border-billpay-cyan text-billpay-cyan hover:bg-billpay-lightblue rounded-full">
                  Más información
                </Button>
              </div>
            </Card>
          </div>
        </div>
        
        {/* CTA Section - Enhanced Mobile */}
        <div className="bg-gradient-to-r from-billpay-lightblue to-blue-100 py-16 md:py-20">
          <div className="container max-w-6xl mx-auto px-4 flex flex-col items-center text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-billpay-blue mb-3 md:mb-4">¿Listo para conectarte?</h2>
            <p className="text-lg md:text-xl mb-6 md:mb-8 max-w-2xl text-gray-700 px-4">
              Únete a miles de usuarios satisfechos. Contrata ahora y obtén instalación gratuita
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full max-w-md sm:max-w-none items-center justify-center">
              <Button className="bg-billpay-blue hover:bg-billpay-blue/90 px-6 md:px-8 py-4 md:py-6 rounded-full text-base md:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full sm:w-auto h-12 md:h-14">
                Contratar ahora
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button 
                onClick={() => navigate('/index')}
                variant="outline" 
                className="border-billpay-blue text-billpay-blue hover:bg-billpay-blue/10 px-6 md:px-8 py-4 md:py-6 rounded-full text-base md:text-lg w-full sm:w-auto h-12 md:h-14"
              >
                Pagar mi factura
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer - Redesigned to match the image */}
      <footer className="bg-gray-900 text-white py-4">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Left side: Status and Copyright */}
            <div className="flex items-center gap-4 order-2 md:order-1">
              <ApiStatusIndicator />
              <div className="text-gray-400 text-sm">
                © {currentYear} CELERO. Todos los derechos reservados.
              </div>
            </div>
            
            {/* Legal Links */}
            <div className="flex flex-wrap gap-4 md:gap-6 justify-center md:justify-end text-sm order-1 md:order-2">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Política de Privacidad
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Términos y Condiciones
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Política de Cookies
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Aviso Legal
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
