import { useCallback, useEffect, useState } from 'react';
import type { KycDisclaimer } from '@metamask/kyc-controller';
import Engine from '../../../../../../core/Engine';

export type { KycDisclaimer };

interface UseKycDisclaimersResult {
  disclaimers: KycDisclaimer[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

// Bounds the KYC controller wait so a hung request can't leave the CTA disabled forever.
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Loads Iron / MoonPay Enterprise legal disclaimers (Privacy Policy / T&Cs) for the
 * VBA KYC flow via {@link Engine.context.KycController.loadDisclaimers}.
 *
 * This is vendor T&Cs only — not the idOS relay / SumSub session catalog
 * (`fetchDisclaimersCatalog` / session disclaimers). Those are a separate controller
 * path and must not be fetched here.
 *
 * Callers should treat a non-empty `error`, or an empty `disclaimers` list once
 * `isLoading` is `false`, as "the user hasn't seen the terms" and keep the flow's
 * continue action disabled until a `retry()` succeeds. There's intentionally no
 * static fallback copy.
 *
 * @param country - ISO 3166-1 alpha-3 country code (e.g. `'BRA'`).
 * @returns The disclaimers, loading state, error, and a `retry` function.
 */
export const useKycDisclaimers = (country: string): UseKycDisclaimersResult => {
  const [disclaimers, setDisclaimers] = useState<KycDisclaimer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      FETCH_TIMEOUT_MS,
    );

    // `loadDisclaimers` does not take an AbortSignal, so race it against the same
    // timeout used for the old direct fetch to keep the CTA from being stuck on a
    // hung controller / network call.
    const abortedPromise = new Promise<never>((_, reject) => {
      abortController.signal.addEventListener('abort', () => {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        reject(abortError);
      });
    });

    const loadDisclaimers = async () => {
      try {
        await Promise.race([
          Engine.context.KycController.loadDisclaimers({ country }),
          abortedPromise,
        ]);

        if (!isMounted) {
          return;
        }

        const { disclaimers: loadedDisclaimers, disclaimersError } =
          Engine.context.KycController.state;

        if (disclaimersError) {
          setDisclaimers([]);
          setError(disclaimersError);
          return;
        }

        if (loadedDisclaimers.length === 0) {
          // An empty success would render no disclaimers and no retry while the
          // CTA stays disabled, so treat it as an error.
          setDisclaimers([]);
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
          setDisclaimers([]);
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
  }, [country, retryCount]);

  return { disclaimers, isLoading, error, retry };
};
