import { useCallback, useEffect, useState } from 'react';
import type { KycDisclaimer, KycVendor } from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

export type { KycDisclaimer };

interface UseVendorDisclaimersResult {
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
 * Loads a vendor's legal disclaimers (Privacy Policy / T&Cs) for the user's
 * country, stores the accepted document ids on the KYC controller's entry for
 * that vendor, and sends them to kyc-api right away.
 *
 * kyc-api keeps the acceptance and records it with the vendor once the
 * vendor's customer exists, so terms can come before email.
 *
 * `disclaimers` is `null` until a load returns a non-empty list. Callers should
 * treat a non-empty `error` as "the user hasn't seen the terms" and keep the
 * flow's continue action disabled until a `retry()` succeeds. An empty vendor
 * response is reported as an `error` (with `disclaimers` left `null`) so the
 * retry affordance is reachable. There's intentionally no static fallback for
 * the Iron catalog itself: the screen hardcodes the MoonPay Privacy Policy
 * link once this load succeeds (TRAM-4169), but the Iron T&C link only exists
 * when this fetch does, so an error keeps the continue action disabled.
 *
 * @returns Disclaimer data, loading/acceptance state, and actions.
 */
export const useVendorDisclaimers = (
  vendor: KycVendor,
): UseVendorDisclaimersResult => {
  const [disclaimers, setDisclaimers] = useState<KycDisclaimer[] | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);
  const acceptDisclaimers = useCallback(async (): Promise<boolean> => {
    if (!disclaimers?.length || !country || isAccepting) {
      return false;
    }

    setIsAccepting(true);
    setError(null);
    try {
      Engine.context.KycController.acceptVendorDisclaimers({
        vendor,
        country,
        disclaimerIds: disclaimers.map(({ id }) => id),
      });
      // kyc-api keeps the acceptance until the vendor's customer exists, so it
      // is sent now, and the next onboarding step comes back with it.
      await Engine.context.KycController.recordVendorDisclaimers({ vendor });
      return true;
    } catch (acceptError) {
      setError(
        acceptError instanceof Error ? acceptError.message : 'Unknown error',
      );
      return false;
    } finally {
      setIsAccepting(false);
    }
  }, [country, disclaimers, isAccepting, vendor]);

  useEffect(() => {
    let isMounted = true;
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

    const controllerLoad = (async () => {
      const kycService = Engine.context.KycService;
      if (!kycService) {
        throw new Error('KYC service is unavailable');
      }

      const geoCountry = await kycService.getGeoCountry();
      return {
        country: geoCountry,
        loadedDisclaimers:
          await Engine.context.KycController.fetchVendorDisclaimers({
            vendor,
            country: geoCountry,
          }),
      };
    })();

    const loadDisclaimers = async () => {
      try {
        const { country: loadedCountry, loadedDisclaimers } =
          await Promise.race([controllerLoad, abortedPromise]);

        if (!isMounted) {
          return;
        }

        // Empty list is not usable success; surface as error so retry is reachable.
        if (!loadedDisclaimers?.length) {
          // The screen only renders a generic message, so record the geo the
          // vendor returned nothing for — the usual cause of an empty catalog.
          Logger.error(new Error('No KYC disclaimers returned'), {
            tags: { feature: 'kyc', provider: vendor },
            context: {
              name: 'useVendorDisclaimers',
              data: { country: loadedCountry },
            },
          });
          setDisclaimers(null);
          setError('No KYC disclaimers returned');
          return;
        }

        setDisclaimers(loadedDisclaimers);
        setCountry(loadedCountry);
        setError(null);
      } catch (err) {
        const isTimeout =
          err instanceof Error &&
          (err.name === 'AbortError' || err.name === 'TimeoutError');
        if (isMounted) {
          // The screen collapses every failure into one generic string, so the
          // underlying status/URL is only recoverable from here. Unmount aborts
          // land here too, but leave `isMounted` false and are not worth logging.
          Logger.error(err as Error, {
            tags: { feature: 'kyc', provider: vendor },
            context: { name: 'useVendorDisclaimers', data: { isTimeout } },
          });
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
    };
  }, [retryCount, vendor]);

  return {
    disclaimers,
    isLoading,
    isAccepting,
    error,
    acceptDisclaimers,
    retry,
  };
};
