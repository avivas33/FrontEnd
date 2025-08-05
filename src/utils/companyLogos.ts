// Mapeo de códigos de empresa a sus logos
export const getCompanyLogo = (companyCode: string): string => {
  const logoMap: Record<string, string> = {
    '2': '/lovable-uploads/Logo_Celero_Networks.svg', // Celero Networks, Corp
    '3': '/lovable-uploads/Logo_Celero_Quantum.svg',  // Celero Quantum, Corp
  };
  
  // Retornar el logo correspondiente o un logo por defecto
  return logoMap[companyCode] || '/lovable-uploads/Cabecera.png';
};

// Obtener información completa de la empresa
export const getCompanyInfo = (companyCode: string) => {
  const companyInfo: Record<string, { name: string; shortName: string; logo: string }> = {
    '2': {
      name: 'Celero Networks, Corp',
      shortName: 'CNCO',
      logo: '/lovable-uploads/Logo_Celero_Networks.svg'
    },
    '3': {
      name: 'Celero Quantum, Corp',
      shortName: 'CQCO',
      logo: '/lovable-uploads/Logo_Celero_Quantum.svg'
    }
  };
  
  return companyInfo[companyCode] || {
    name: 'Celero',
    shortName: 'CELERO',
    logo: '/lovable-uploads/Cabecera.png'
  };
};