import { useCallback, useEffect, useState } from 'react';
import type { KycDisclaimer } from '@metamask/kyc-controller';
import Engine from '../../../../../../core/Engine';
import ReduxService from '../../../../../../core/redux';
import Logger from '../../../../../../util/Logger';
import type { RootState } from '../../../../../../reducers';
import { selectSelectedVbaWalletAddress } from '../../../../../../selectors/rampsController';
import { VBA_KYC_VENDOR } from '../constants';
import { saveVbaVendorTermsAcceptance } from '../vbaVendorTermsStorage';

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
 * and stores the accepted document ids locally per wallet.
 *
 * The email step records the locally accepted ids against the customer after
 * creating the Iron session. This lets product show vendor terms before email
 * even though the API requires an email/customer before remote acceptance.
 *
 * `disclaimers` is `null` until a load returns a non-empty list. Callers should
 * treat a non-empty `error` as "the user hasn't seen the terms" and keep the
 * flow's continue action disabled until a `retry()` succeeds. An empty vendor
 * response is reported as an `error` (with `disclaimers` left `null`) so the
 * retry affordance is reachable. There's intentionally no static fallback copy.
 *
 * @returns Disclaimer data, loading/acceptance state, and actions.
 */
export const useKycDisclaimers = (): UseKycDisclaimersResult => {
  const [disclaimers, setDisclaimers] = useState<KycDisclaimer[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);
  const acceptDisclaimers = useCallback(async (): Promise<boolean> => {
    if (!disclaimers?.length || isAccepting) {
      return false;
    }

    setIsAccepting(true);
    setError(null);
    try {
      const walletAddress = selectSelectedVbaWalletAddress(
        ReduxService.store.getState() as RootState,
      );
      if (!walletAddress) {
        throw new Error('No Money Account wallet is selected');
      }
      await saveVbaVendorTermsAcceptance(
        walletAddress,
        disclaimers.map(({ id }) => id),
      );
      return true;
    } catch (acceptError) {
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

      const country = await kycService.getGeoCountry();
      return {
        country,
        loadedDisclaimers:
          await Engine.context.KycController.fetchVendorDisclaimers({
            vendor: VBA_KYC_VENDOR,
            country,
          }),
      };
    })();

    const loadDisclaimers = async () => {
      try {
        const { country, loadedDisclaimers } = await Promise.race([
          controllerLoad,
          abortedPromise,
        ]);

        if (!isMounted) {
          return;
        }

        // Empty list is not usable success; surface as error so retry is reachable.
        if (!loadedDisclaimers?.length) {
          // The screen only renders a generic message, so record the geo the
          // vendor returned nothing for — the usual cause of an empty catalog.
          Logger.error(new Error('No KYC disclaimers returned'), {
            tags: { feature: 'vba-kyc', provider: VBA_KYC_VENDOR },
            context: {
              name: 'useKycDisclaimers',
              data: { country },
            },
          });
          setDisclaimers(null);
          setError('No KYC disclaimers returned');
          return;
        }

        setDisclaimers(loadedDisclaimers);
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
            tags: { feature: 'vba-kyc', provider: VBA_KYC_VENDOR },
            context: { name: 'useKycDisclaimers', data: { isTimeout } },
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
  }, [retryCount]);

  return {
    disclaimers,
    isLoading,
    isAccepting,
    error,
    acceptDisclaimers,
    retry,
  };
};
