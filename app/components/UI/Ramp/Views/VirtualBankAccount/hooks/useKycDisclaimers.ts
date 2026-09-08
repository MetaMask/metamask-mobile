import { useCallback, useEffect, useState } from 'react';
import type { KycConsentRecord, KycDisclaimer } from '@metamask/kyc-controller';
import Engine from '../../../../../../core/Engine';
import { VBA_KYC_VENDOR } from '../constants';

export type { KycDisclaimer };

interface UseKycDisclaimersResult {
  disclaimers: KycDisclaimer[] | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  providerDisclaimersAccepted?: KycConsentRecord[];
  idosDisclaimersAccepted?: KycConsentRecord[];
}

// Bounds the KYC controller wait so a hung request can't leave the CTA disabled forever.
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Loads Iron / MoonPay Enterprise legal disclaimers (Privacy Policy / T&Cs) for the
 * VBA KYC flow via {@link Engine.context.KycController.initialize} then
 * {@link Engine.context.KycController.loadDisclaimers}.
 *
 * The vendor terms come from KycController state. The SumSub and idOS consent
 * catalog is loaded through KycService so the accepted document versions can
 * be submitted when the user continues.
 *
 * `disclaimers` is `null` until a load returns a non-empty list. Callers should
 * treat a non-empty `error` as "the user hasn't seen the terms" and keep the
 * flow's continue action disabled until a `retry()` succeeds. An empty vendor
 * response is reported as an `error` (with `disclaimers` left `null`) so the
 * retry affordance is reachable. There's intentionally no static fallback copy.
 *
 * `retry()` invalidates an in-flight load via {@link Engine.context.KycController.reset}.
 *
 * @param country - ISO 3166-1 alpha-3 country code (e.g. `'BRA'`).
 * @returns The disclaimers, loading state, error, and a `retry` function.
 */
export const useKycDisclaimers = (country: string): UseKycDisclaimersResult => {
  const [disclaimers, setDisclaimers] = useState<KycDisclaimer[] | null>(null);
  const [providerDisclaimersAccepted, setProviderDisclaimersAccepted] =
    useState<KycConsentRecord[]>([]);
  const [idosDisclaimersAccepted, setIdosDisclaimersAccepted] = useState<
    KycConsentRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setProviderDisclaimersAccepted([]);
    setIdosDisclaimersAccepted([]);

    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      FETCH_TIMEOUT_MS,
    );

    // Abort unblocks this race only; initialize/loadDisclaimers ignore the signal.
    const abortedPromise = new Promise<never>((_, reject) => {
      abortController.signal.addEventListener('abort', () => {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        reject(abortError);
      });
    });

    const controllerLoad = (async () => {
      await Engine.context.KycController.initialize({
        vendor: VBA_KYC_VENDOR,
      });
      const kycService = Engine.context.KycService;
      if (!kycService) {
        throw new Error('KYC service is unavailable');
      }
      const [, catalog] = await Promise.all([
        Engine.context.KycController.loadDisclaimers({ country }),
        kycService.fetchDisclaimersCatalog({ country }),
      ]);
      return catalog;
    })();

    // True until this attempt finishes writing controller state (including after timeout).
    let isControllerLoadPending = true;
    const markControllerLoadSettled = () => {
      isControllerLoadPending = false;
    };
    controllerLoad.then(markControllerLoadSettled, markControllerLoadSettled);

    const loadDisclaimers = async () => {
      try {
        const catalog = await Promise.race([controllerLoad, abortedPromise]);

        if (!isMounted) {
          return;
        }

        const { vendorDisclaimers: loadedDisclaimers, vendorError } =
          Engine.context.KycController.state;

        if (vendorError) {
          setDisclaimers(null);
          setError(vendorError);
          return;
        }

        // Empty list is not usable success; surface as error so retry is reachable.
        if (!loadedDisclaimers?.length) {
          setDisclaimers(null);
          setError('No KYC disclaimers returned');
          return;
        }

        setProviderDisclaimersAccepted(
          catalog.kycProvider.map(({ key, version }) => ({ key, version })),
        );
        setIdosDisclaimersAccepted(
          catalog.idOS.map(({ key, version }) => ({ key, version })),
        );
        setDisclaimers([
          ...loadedDisclaimers,
          ...[...catalog.kycProvider, ...catalog.idOS].map(
            ({ key, title, url }) => ({
              id: key,
              display_name: title,
              url,
            }),
          ),
        ]);
        setError(null);
      } catch (err) {
        const isTimeout =
          err instanceof Error &&
          (err.name === 'AbortError' || err.name === 'TimeoutError');
        if (isMounted) {
          setDisclaimers(null);
          setError(
            isTimeout
              ? 'Request timed out'
              : err instanceof Error
                ? err.message
                : 'Unknown error',
          );
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDisclaimers();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      abortController.abort();

      // Invalidate this attempt so a late write cannot clobber the next load.
      if (isControllerLoadPending) {
        Engine.context.KycController.reset();
      }
    };
  }, [country, retryCount]);

  return {
    disclaimers,
    isLoading,
    error,
    retry,
    providerDisclaimersAccepted,
    idosDisclaimersAccepted,
  };
};
