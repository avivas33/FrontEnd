import { useEffect, useCallback, useRef } from 'react';
import { FingerprintService } from '../services/fingerprintService';
import { ActivityService } from '../services/activityService';

export interface ActivityEvent {
  eventType: string;
  clientId?: string;
  paymentMethod?: string;
  amount?: number;
  currency?: string;
  paymentStatus?: string;
  errorCode?: string;
  additionalData?: Record<string, any>;
}

export const useActivityTracking = (clientId?: string) => {
  const fingerprintService = FingerprintService.getInstance();
  const activityService = ActivityService.getInstance();
  const sessionIdRef = useRef<string>();
  const isInitializedRef = useRef(false);

  const trackEvent = useCallback(async (event: ActivityEvent) => {
    try {
      const deviceInfo = await fingerprintService.getDeviceInfo();
      
      await activityService.trackActivity({
        ...event,
        fingerprint: deviceInfo.fingerprint,
        timeZone: deviceInfo.timeZone,
        screenResolution: deviceInfo.screenResolution,
        browserLanguage: deviceInfo.browserLanguage,
        sessionId: sessionIdRef.current,
        clientId: event.clientId || clientId,
        additionalData: {
          ...event.additionalData,
          colorDepth: deviceInfo.colorDepth,
          platform: deviceInfo.platform,
          hardwareConcurrency: deviceInfo.hardwareConcurrency,
          deviceMemory: deviceInfo.deviceMemory,
          touchSupport: deviceInfo.touchSupport,
          webGLVendor: deviceInfo.webGLVendor,
          webGLRenderer: deviceInfo.webGLRenderer
        }
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }, [clientId, fingerprintService, activityService]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      sessionIdRef.current = fingerprintService.generateSessionId();
      isInitializedRef.current = true;
      
      // Track session start
      trackEvent({
        eventType: 'session_start',
        clientId
      });
    }

    // Cleanup on unmount
    return () => {
      if (isInitializedRef.current) {
        trackEvent({
          eventType: 'session_end',
          clientId
        });
      }
    };
  }, [clientId, trackEvent]);

  const trackCheckoutStart = useCallback((paymentMethod: string, amount: number, currency: string = 'USD') => {
    return trackEvent({
      eventType: 'checkout_start',
      paymentMethod,
      amount,
      currency
    });
  }, [trackEvent]);

  const trackPaymentAttempt = useCallback((paymentMethod: string, amount: number, currency: string = 'USD') => {
    return trackEvent({
      eventType: 'payment_attempt',
      paymentMethod,
      amount,
      currency
    });
  }, [trackEvent]);

  const trackPaymentSuccess = useCallback((paymentMethod: string, amount: number, currency: string = 'USD', transactionId?: string) => {
    return trackEvent({
      eventType: 'payment_success',
      paymentMethod,
      amount,
      currency,
      paymentStatus: 'completed',
      additionalData: { transactionId }
    });
  }, [trackEvent]);

  const trackPaymentFailed = useCallback((paymentMethod: string, amount: number, currency: string = 'USD', errorCode?: string, errorMessage?: string) => {
    return trackEvent({
      eventType: 'payment_failed',
      paymentMethod,
      amount,
      currency,
      paymentStatus: 'failed',
      errorCode,
      additionalData: { errorMessage }
    });
  }, [trackEvent]);

  const trackPageView = useCallback((pageName: string, additionalData?: Record<string, any>) => {
    return trackEvent({
      eventType: 'page_view',
      additionalData: {
        pageName,
        ...additionalData
      }
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackCheckoutStart,
    trackPaymentAttempt,
    trackPaymentSuccess,
    trackPaymentFailed,
    trackPageView
  };
};