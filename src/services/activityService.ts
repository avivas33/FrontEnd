import { apiClient } from '../config/api';

export interface ActivityLogData {
  eventType: string;
  fingerprint?: string;
  timeZone?: string;
  screenResolution?: string;
  browserLanguage?: string;
  clientId?: string;
  sessionId?: string;
  paymentMethod?: string;
  amount?: number;
  currency?: string;
  paymentStatus?: string;
  errorCode?: string;
  additionalData?: Record<string, any>;
}

export interface SuspiciousActivityData {
  failedPaymentsPerIp: Array<{
    ipAddress: string;
    failedAttempts: number;
    clientIds: number;
    lastAttempt: string;
  }>;
  sharedFingerprints: Array<{
    fingerprint: string;
    clientCount: number;
    clientIds: string[];
    eventCount: number;
  }>;
  clientsWithMultipleTimeZones: Array<{
    clientId: string;
    timeZones: string[];
    totalAccesses: number;
  }>;
  period: {
    from: string;
    to: string;
  };
}

export class ActivityService {
  private static instance: ActivityService;
  private queue: ActivityLogData[] = [];
  private isProcessing = false;
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 1000; // 1 segundo

  private constructor() {
    // Procesar cola cuando se cierra la ventana
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushQueue();
      });
    }
  }

  public static getInstance(): ActivityService {
    if (!ActivityService.instance) {
      ActivityService.instance = new ActivityService();
    }
    return ActivityService.instance;
  }

  public async trackActivity(data: ActivityLogData): Promise<void> {
    // Agregar header de cliente si está disponible
    const headers: Record<string, string> = {};
    if (data.clientId) {
      headers['X-Client-Id'] = data.clientId;
    }

    // Para eventos críticos, enviar inmediatamente
    const criticalEvents = ['payment_attempt', 'payment_success', 'payment_failed'];
    if (criticalEvents.includes(data.eventType)) {
      try {
        await apiClient.post('/api/activitylog/track', data);
        console.log(`Activity tracked immediately: ${data.eventType}`);
      } catch (error) {
        console.error('Error tracking critical activity:', error);
        // Agregar a la cola como respaldo
        this.addToQueue(data);
      }
    } else {
      // Para otros eventos, usar cola con batch
      this.addToQueue(data);
    }
  }

  private addToQueue(data: ActivityLogData): void {
    this.queue.push(data);

    // Si la cola está llena, procesar inmediatamente
    if (this.queue.length >= this.BATCH_SIZE) {
      this.processBatch();
    } else {
      // De lo contrario, programar procesamiento batch
      this.scheduleBatchProcessing();
    }
  }

  private scheduleBatchProcessing(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const batch = this.queue.splice(0, this.BATCH_SIZE);

    try {
      // Enviar cada evento individualmente para mejor manejo de errores
      const promises = batch.map(data => 
        apiClient.post('/api/activitylog/track', data).catch(error => {
          console.error('Error tracking activity:', error);
          // Re-agregar a la cola si falla
          this.queue.push(data);
        })
      );

      await Promise.all(promises);
      console.log(`Batch of ${batch.length} activities tracked`);
    } finally {
      this.isProcessing = false;

      // Si quedan más elementos, continuar procesando
      if (this.queue.length > 0) {
        this.scheduleBatchProcessing();
      }
    }
  }

  private flushQueue(): void {
    if (this.queue.length === 0) {
      return;
    }

    // Usar sendBeacon para enviar datos cuando se cierra la ventana
    if (navigator.sendBeacon) {
      const data = JSON.stringify(this.queue);
      const blob = new Blob([data], { type: 'application/json' });
      
      // Enviar cada evento por separado para mayor confiabilidad
      this.queue.forEach(activity => {
        const activityBlob = new Blob([JSON.stringify(activity)], { type: 'application/json' });
        navigator.sendBeacon(`${apiClient['baseURL']}/api/activitylog/track`, activityBlob);
      });
    }

    this.queue = [];
  }

  public async getSuspiciousActivity(from?: Date, to?: Date): Promise<SuspiciousActivityData> {
    const params: Record<string, string> = {};
    
    if (from) {
      params.from = from.toISOString();
    }
    if (to) {
      params.to = to.toISOString();
    }

    return await apiClient.get('/api/activitylog/analytics/suspicious', params);
  }
}