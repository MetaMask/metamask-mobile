/* eslint-disable no-console -- Temporary VBA KYC flow diagnostics. */
import { useCallback, useEffect, useState } from 'react';
import type { KycDisclaimer } from '@metamask/kyc-controller';
import Engine from '../../../../../../core/Engine';
import { VBA_KYC_VENDOR } from '../constants';

export type { KycDisclaimer };

interface UseKycDisclaimersResult {
  disclaimers: KycDisclaimer[] | null;
  isLoading: boolean;
  isAccepting: boolean;
  error: string | null;
  acceptDisclaimers: () => Promise<boolean>;
  retry: () => void;
}

// Bounds the KYC controller wait so a hung request can't leave the CTA disabled forever.
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Loads Iron / MoonPay Enterprise legal disclaimers (Privacy Policy / T&Cs)
 * via {@link Engine.context.KycController.fetchVendorDisclaimers}.
 *
 * This is vendor T&Cs only — not the idOS / SumSub catalog used on Verify
 * Identity (`useKycSessionDisclaimers` → `KycController.fetchSessionDisclaimers`).
 *
 * `disclaimers` is `null` until a load returns a non-empty list. Callers should
 * treat a non-empty `error` as "the user hasn't seen the terms" and keep the
 * flow's continue action disabled until a `retry()` succeeds. An empty vendor
 * response is reported as an `error` (with `disclaimers` left `null`) so the
 * retry affordance is reachable. There's intentionally no static fallback copy.
 *
 * @param country - ISO 3166-1 alpha-3 country code (e.g. `'BRA'`).
 * @returns Disclaimer data, loading/acceptance state, and actions.
 */
export const useKycDisclaimers = (country: string): UseKycDisclaimersResult => {
  const [disclaimers, setDisclaimers] = useState<KycDisclaimer[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    console.log('[VBA KYC][Vendor disclaimers] Retrying fetch');
    setRetryCount((count) => count + 1);
  }, []);
  const acceptDisclaimers = useCallback(async (): Promise<boolean> => {
    if (!disclaimers?.length || isAccepting) {
      console.log('[VBA KYC][Vendor disclaimers] Acceptance skipped', {
        disclaimerCount: disclaimers?.length ?? 0,
        isAccepting,
      });
      return false;
    }

    console.log('[VBA KYC][Vendor disclaimers] Recording acceptance', {
      disclaimerIds: disclaimers.map(({ id }) => id),
    });
    setIsAccepting(true);
    setError(null);
    try {
      await Engine.context.KycController.recordVendorDisclaimers({
        disclaimerIds: disclaimers.map(({ id }) => id),
      });
      console.log('[VBA KYC][Vendor disclaimers] Acceptance recorded');
      return true;
    } catch (acceptError) {
      console.log(
        '[VBA KYC][Vendor disclaimers] Failed to record acceptance',
        acceptError,
      );
      setError(
        acceptError instanceof Error ? acceptError.message : 'Unknown error',
      );
      return false;
    } finally {
      setIsAccepting(false);
    }
  }, [disclaimers, isAccepting]);

  useEffect(() => {
    let isMounted = true;
    console.log('[VBA KYC][Vendor disclaimers] Fetching', {
      country,
      retryCount,
      vendor: VBA_KYC_VENDOR,
    });
    setIsLoading(true);
    setError(null);

    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      FETCH_TIMEOUT_MS,
    );

    const abortedPromise = new Promise<never>((_, reject) => {
      abortController.signal.addEventListener('abort', () => {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        reject(abortError);
      });
    });

    const controllerLoad = Engine.context.KycController.fetchVendorDisclaimers({
      vendor: VBA_KYC_VENDOR,
      country,
    });

    const loadDisclaimers = async () => {
      try {
        const loadedDisclaimers = await Promise.race([
          controllerLoad,
          abortedPromise,
        ]);

        if (!isMounted) {
          console.log(
            '[VBA KYC][Vendor disclaimers] Ignoring result after unmount',
          );
          return;
        }

        // Empty list is not usable success; surface as error so retry is reachable.
        if (!loadedDisclaimers?.length) {
          console.log('[VBA KYC][Vendor disclaimers] Empty response');
          setDisclaimers(null);
          setError('No KYC disclaimers returned');
          return;
        }

        console.log('[VBA KYC][Vendor disclaimers] Fetch succeeded', {
          disclaimerCount: loadedDisclaimers.length,
          disclaimerIds: loadedDisclaimers.map(({ id }) => id),
        });
        setDisclaimers(loadedDisclaimers);
        setError(null);
      } catch (err) {
        const isTimeout =
          err instanceof Error &&
          (err.name === 'AbortError' || err.name === 'TimeoutError');
        console.log('[VBA KYC][Vendor disclaimers] Fetch failed', {
          error: err,
          isMounted,
          isTimeout,
        });
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
      console.log('[VBA KYC][Vendor disclaimers] Cleaning up fetch');
      isMounted = false;
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [country, retryCount]);

  return {
    disclaimers,
    isLoading,
    isAccepting,
    error,
    acceptDisclaimers,
    retry,
  };
};
