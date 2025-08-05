import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, FileText } from "lucide-react";
import { EmpresaProcesada } from "@/services";
import { getCompanyLogo } from "@/utils/companyLogos";

interface CompanySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompany: (companyCode: string) => void;
  empresas: EmpresaProcesada[];
  facturasPerEmpresa: Record<string, number>;
  clientName: string;
  clientCode: string;
}

export function CompanySelectionModal({
  isOpen,
  onClose,
  onSelectCompany,
  empresas,
  facturasPerEmpresa,
  clientName,
  clientCode
}: CompanySelectionModalProps) {
  
  const handleSelectCompany = (companyCode: string) => {
    onSelectCompany(companyCode);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Seleccione una Empresa</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-6">
            El cliente <span className="font-semibold">{clientName} (#{clientCode})</span> tiene facturas en múltiples empresas. 
            Por favor seleccione la empresa con la que desea trabajar:
          </p>
          
          <div className="space-y-3">
            {empresas.map((empresa) => (
              <Card 
                key={empresa.CompCode}
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleSelectCompany(empresa.CompCode)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={getCompanyLogo(empresa.CompCode)} 
                      alt={empresa.CompName}
                      className="h-12 w-auto object-contain"
                    />
                    <div>
                      <h3 className="font-semibold text-lg">{empresa.CompName}</h3>
                      <p className="text-sm text-gray-500">{empresa.ShortName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-billpay-blue">
                      <FileText className="h-5 w-5" />
                      <span className="font-bold text-lg">{facturasPerEmpresa[empresa.CompCode] || 0}</span>
                    </div>
                    <p className="text-xs text-gray-500">facturas</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Una vez seleccionada la empresa, todas las operaciones se realizarán únicamente con esa empresa.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}