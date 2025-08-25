import CryptoJS from 'crypto-js';

export interface DeviceInfo {
  fingerprint: string;
  screenResolution: string;
  timeZone: string;
  browserLanguage: string;
  colorDepth: number;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  touchSupport: boolean;
  webGLVendor?: string;
  webGLRenderer?: string;
}

export class FingerprintService {
  private static instance: FingerprintService;
  private deviceInfo: DeviceInfo | null = null;

  private constructor() {}

  public static getInstance(): FingerprintService {
    if (!FingerprintService.instance) {
      FingerprintService.instance = new FingerprintService();
    }
    return FingerprintService.instance;
  }

  public async getDeviceInfo(): Promise<DeviceInfo> {
    if (this.deviceInfo) {
      return this.deviceInfo;
    }

    const info = await this.collectDeviceInfo();
    this.deviceInfo = info;
    return info;
  }

  private async collectDeviceInfo(): Promise<DeviceInfo> {
    try {
      const screenResolution = `${window.screen.width}x${window.screen.height}`;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const browserLanguage = navigator.language || navigator.languages[0];
      const colorDepth = window.screen.colorDepth;
      const platform = navigator.platform;
      const hardwareConcurrency = navigator.hardwareConcurrency || 0;
      const deviceMemory = (navigator as any).deviceMemory;
      const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // Obtener información de WebGL con manejo de errores
      const webGLInfo = this.getWebGLInfo();

      // Obtener información de Canvas con manejo de errores
      const canvasFingerprint = this.getCanvasFingerprint();

      // Obtener lista de plugins con manejo de errores
      const plugins = this.getPlugins();

      // Información de fuentes con manejo de errores
      const fonts = await this.getInstalledFonts();

      // Crear string único para fingerprint (simplificado para evitar errores)
      const fingerprintData = [
        screenResolution,
        timeZone,
        browserLanguage,
        colorDepth.toString(),
        platform,
        hardwareConcurrency.toString(),
        deviceMemory?.toString() || 'unknown',
        touchSupport.toString(),
        webGLInfo.vendor || 'unknown',
        webGLInfo.renderer || 'unknown',
        canvasFingerprint.substring(0, 100), // Limitar tamaño para evitar problemas
        plugins.substring(0, 100), // Limitar tamaño
        fonts.join(',').substring(0, 100), // Limitar tamaño
        navigator.userAgent.substring(0, 200) // Limitar tamaño
      ].join('|');

      // Generar hash SHA-256 con manejo de errores
      let fingerprint: string;
      try {
        fingerprint = CryptoJS.SHA256(fingerprintData).toString();
      } catch (error) {
        console.warn('Error generating SHA256 hash, using fallback:', error);
        // Fallback simple: usar timestamp + datos básicos
        fingerprint = `fallback_${Date.now()}_${screenResolution}_${platform}`;
      }

      return {
        fingerprint,
        screenResolution,
        timeZone,
        browserLanguage,
        colorDepth,
        platform,
        hardwareConcurrency,
        deviceMemory,
        touchSupport,
        webGLVendor: webGLInfo.vendor,
        webGLRenderer: webGLInfo.renderer
      };
    } catch (error) {
      console.error('Error collecting device info:', error);
      // Fallback básico si todo falla
      return {
        fingerprint: `error_fallback_${Date.now()}`,
        screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
        timeZone: 'unknown',
        browserLanguage: navigator.language || 'unknown',
        colorDepth: window.screen?.colorDepth || 0,
        platform: navigator.platform || 'unknown',
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        deviceMemory: undefined,
        touchSupport: false
      };
    }
  }

  private getWebGLInfo(): { vendor?: string; renderer?: string } {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      
      if (!gl) {
        return {};
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return {
          vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
          renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        };
      }

      return {};
    } catch (e) {
      return {};
    }
  }

  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return 'canvas_not_supported';
      }

      // Texto con propiedades específicas
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.font = '11pt Arial';
      ctx.fillText('Canvas fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.font = '18pt Arial';
      ctx.fillText('BrowserLeaks.com', 4, 45);

      // Convertir a string
      return canvas.toDataURL();
    } catch (e) {
      console.warn('Canvas fingerprint failed:', e);
      return 'canvas_error';
    }
  }

  private getPlugins(): string {
    try {
      const plugins = [];
      for (let i = 0; i < navigator.plugins.length; i++) {
        plugins.push(navigator.plugins[i].name);
      }
      return plugins.join(',') || 'no_plugins';
    } catch (e) {
      console.warn('Plugin detection failed:', e);
      return 'plugins_error';
    }
  }

  private async getInstalledFonts(): Promise<string[]> {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New',
      'Georgia', 'Palatino', 'Garamond', 'Comic Sans MS',
      'Impact', 'Lucida Console', 'Tahoma', 'Trebuchet MS',
      'Arial Black', 'Arial Narrow', 'Lucida Sans Unicode'
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return [];
    }

    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const installedFonts: string[] = [];

    // Medir ancho con fuentes base
    const baseFontWidths: { [key: string]: number } = {};
    for (const baseFont of baseFonts) {
      ctx.font = `${testSize} ${baseFont}`;
      baseFontWidths[baseFont] = ctx.measureText(testString).width;
    }

    // Probar cada fuente
    for (const font of testFonts) {
      let detected = false;
      for (const baseFont of baseFonts) {
        ctx.font = `${testSize} '${font}', ${baseFont}`;
        const width = ctx.measureText(testString).width;
        if (width !== baseFontWidths[baseFont]) {
          detected = true;
          break;
        }
      }
      if (detected) {
        installedFonts.push(font);
      }
    }

    return installedFonts;
  }

  public generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${random}`;
  }
}