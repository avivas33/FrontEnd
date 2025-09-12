# 🌐 Guía de Integración API Celero - Frontend React (Sin Axios)

## 📋 **RESUMEN DE LA IMPLEMENTACIÓN**

Hemos configurado un sistema completo de servicios para conectar tu frontend React con la API de Celero usando **fetch nativo** en lugar de Axios, manteniendo el proyecto liviano.

## 🛠️ **ARCHIVOS CREADOS Y CONFIGURADOS**

### **1. Configuración de API (`src/config/api.ts`)**
- **URL Base**: `https://api.celero.network`
- **Cliente HTTP**: Clase `ApiClient` con fetch nativo
- **Timeout**: 30 segundos
- **Headers**: JSON por defecto
- **Manejo de errores**: Integrado

### **2. Servicios Implementados**

#### **`src/services/clienteService.ts`**
- ✅ Obtener información de cliente
- ✅ Obtener facturas (todas, abiertas, filtradas)
- ✅ Crear recibos de pago
- ✅ Verificar reCAPTCHA

#### **`src/services/pagoService.ts`**
- ✅ Procesamiento de pagos con tarjeta (Cobalt)
- ✅ Órdenes de pago Yappy
- ✅ Verificación de estado de pagos
- ✅ Métodos de pago disponibles

#### **`src/services/emailService.ts`**
- ✅ Envío de emails genéricos
- ✅ Confirmaciones de pago
- ✅ Recordatorios de facturas
- ✅ Emails de bienvenida

### **3. Hooks Personalizados (`src/hooks/useApi.tsx`)**
- ✅ `useApi`: Para llamadas automáticas
- ✅ `useApiMutation`: Para llamadas bajo demanda
- ✅ `useCliente`: Hook específico para clientes
- ✅ `useFacturas`: Hook específico para facturas
- ✅ `usePago`: Hook para pagos
- ✅ `useRecaptcha`: Hook para verificación reCAPTCHA

### **4. Componentes Actualizados**
- ✅ `ReCaptcha.tsx`: Integrado con verificación backend
- ✅ `ClienteInfo.tsx`: Ejemplo completo de uso
- ✅ `Index.tsx`: Página de búsqueda actualizada

## 🔧 **CONFIGURACIÓN DE VARIABLES DE ENTORNO**

### **Producción (`.env.production`)**
```bash
VITE_API_BASE_URL=https://api.celero.network
VITE_API_TIMEOUT=30000
VITE_RECAPTCHA_SITE_KEY=6Lfj1mArAAAAAIkj3BJGhSMpIdUT6qnCa1aUMrRN
```

### **Desarrollo (`.env.development`)**
```bash
VITE_API_BASE_URL=https://api.celero.network
# O usar servidor local: VITE_API_BASE_URL=http://localhost:5001
VITE_API_TIMEOUT=30000
VITE_RECAPTCHA_SITE_KEY=6Lfj1mArAAAAAIkj3BJGhSMpIdUT6qnCa1aUMrRN
```

## 🎯 **ENDPOINTS DISPONIBLES**

### **Gestión de Clientes**
```typescript
// Obtener cliente
const cliente = await clienteService.getCliente('CU-20037');

// Obtener facturas abiertas
const facturas = await clienteService.getFacturasAbiertas('CU-21541');

// Crear recibo
const recibo = await clienteService.crearRecibo(datosPago);
```

### **Procesamiento de Pagos**
```typescript
// Pago con tarjeta
const pagoTarjeta = await pagoService.ventaTarjeta(datosTarjeta);

// Orden Yappy
const ordenYappy = await pagoService.crearOrdenYappyFrontend(datosYappy);
```

### **Servicios de Email**
```typescript
// Confirmación de pago
const emailConfirmacion = await emailService.enviarConfirmacionPago(datos);
```

## 🎨 **EJEMPLOS DE USO**

### **1. Uso Básico con Servicios**
```typescript
import { clienteService } from '@/services';

const buscarCliente = async (codigo: string) => {
  try {
    const response = await clienteService.getCliente(codigo);
    console.log('Cliente:', response.data.CUVc[0]);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

### **2. Uso con Hooks**
```typescript
import { useCliente, useFacturas } from '@/hooks/useApi';

const MiComponente = ({ codigoCliente }: { codigoCliente: string }) => {
  const { data: cliente, loading, error } = useCliente(codigoCliente);
  const { data: facturas } = useFacturas(codigoCliente, 'abiertas');

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>{cliente?.data?.CUVc?.[0]?.Name}</h2>
      <p>Facturas: {facturas?.data?.facturas?.length || 0}</p>
    </div>
  );
};
```

### **3. Procesamiento de Pagos**
```typescript
import { usePago } from '@/hooks/useApi';
import { pagoService } from '@/services';

const PagoComponent = () => {
  const { execute, loading, error } = usePago();
  
  const handlePagoYappy = async (datos) => {
    try {
      const resultado = await execute(
        pagoService.crearOrdenYappyFrontend,
        datos
      );
      console.log('Orden creada:', resultado);
    } catch (err) {
      console.error('Error en pago:', err);
    }
  };
  
  return (
    <button 
      onClick={() => handlePagoYappy(datosPago)}
      disabled={loading}
    >
      {loading ? 'Procesando...' : 'Pagar con Yappy'}
    </button>
  );
};
```

## 🚀 **VENTAJAS DE ESTA IMPLEMENTACIÓN**

### **✅ Sin Dependencias Externas**
- No requiere Axios ni otras librerías HTTP
- Usa fetch nativo del navegador
- Proyecto más liviano

### **✅ TypeScript Completo**
- Tipos definidos para todas las respuestas
- Autocompletado en VS Code
- Detección de errores en tiempo de desarrollo

### **✅ Manejo de Errores Robusto**
- Timeouts configurables
- Manejo centralizado de errores
- Logs detallados para debugging

### **✅ Hooks Personalizados**
- Reutilización de lógica
- Estado reactivo automático
- Fácil integración con componentes

### **✅ Validaciones Integradas**
- Validación de formatos de email, teléfono, códigos
- Verificación de reCAPTCHA
- Validación de datos antes del envío

## 🧪 **PRUEBAS DE CONECTIVIDAD**

### **Desde el Navegador (Consola)**
```javascript
// Probar conexión directa
fetch('https://api.celero.network/api/clientes?range=CU-20037')
  .then(r => r.json())
  .then(console.log);
```

### **Desde el Componente**
```typescript
// Usar en cualquier componente
import { clienteService } from '@/services';

// En useEffect o función async
const probarConexion = async () => {
  try {
    const resultado = await clienteService.getCliente('CU-20037');
    console.log('✅ Conexión exitosa:', resultado);
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
};
```

## 🔒 **CORS Y SEGURIDAD**

La API ya está configurada para permitir requests desde:
- `https://selfservice.celero.network`
- `https://portal.celero.net/`
- `https://celero.network`
- `https://api.celero.network`

## 📝 **PRÓXIMOS PASOS**

1. **Probar la conexión** con los endpoints
2. **Actualizar las páginas** existentes para usar los nuevos servicios
3. **Implementar manejo de pagos** en los componentes
4. **Agregar notificaciones** de éxito/error
5. **Configurar el DNS** para `api.celero.network` si es necesario

## 🆘 **SOLUCIÓN DE PROBLEMAS**

### **Error de CORS**
- Verificar que el dominio esté en la lista de CORS permitidos
- Usar la IP del servidor temporalmente si DNS no está listo

### **Error de Timeout**
- Ajustar `VITE_API_TIMEOUT` en variables de entorno
- Verificar conectividad del servidor

### **Error de reCAPTCHA**
- Verificar `VITE_RECAPTCHA_SITE_KEY`
- Comprobar configuración en Google reCAPTCHA Console

¡Tu frontend React ya está listo para conectarse a la API de Celero sin dependencias externas! 🎉
