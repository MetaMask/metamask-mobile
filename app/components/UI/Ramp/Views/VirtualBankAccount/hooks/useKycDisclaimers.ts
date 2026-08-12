import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../../../core/Engine';
import { KYC_API_BASE_URL } from '../constants';

export interface KycDisclaimer {
  id: string;
  url: string;
  display_name: string;
}

interface UseKycDisclaimersResult {
  disclaimers: KycDisclaimer[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

// Bounds how long we'll wait on the KYC API before treating the request as
// failed, so a hung request can't leave the screen stuck on the loading
// state (and the CTA disabled) forever.
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetches the vendor-provided legal disclaimers (Privacy Policy / T&Cs) for
 * the VBA KYC flow from the KYC API, so the client doesn't hardcode partner
 * legal copy that the KYC/Iron team can change server-side.
 *
 * This is a thin, standalone fetch that gets a bearer token the same way
 * `useFetchPopularTokens` does, rather than going through
 * `@metamask/kyc-controller` — that package exists in `core` but isn't
 * published or wired into Engine yet. Swap this hook for the real
 * controller action once it lands.
 *
 * When {@link KYC_API_BASE_URL} isn't configured (e.g. production, which
 * isn't deployed yet), this skips the fetch entirely and returns an empty
 * list. There's intentionally no static fallback copy — this MVP only
 * ships once the real KYC API is reachable in every environment it runs in.
 *
 * Callers should treat a non-empty `error`, or an empty `disclaimers` list
 * once `isLoading` is `false`, as "the user hasn't seen the terms" and keep
 * the flow's continue action disabled until a `retry()` succeeds.
 *
 * @param country - The ISO 3166-1 alpha-3 country code to scope the
 * disclaimers to (e.g. `'BRA'` for Brazil).
 * @returns The disclaimers, loading state, any error encountered, and a
 * `retry` function to re-run the fetch.
 */
export const useKycDisclaimers = (country: string): UseKycDisclaimersResult => {
  const [disclaimers, setDisclaimers] = useState<KycDisclaimer[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(KYC_API_BASE_URL));
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      '🚨🚨🚨 [VBA KYC] useKycDisclaimers CALLED — country:',
      country,
      'KYC_API_BASE_URL:',
      KYC_API_BASE_URL || '(empty — fetch will be SKIPPED)',
      'attempt:',
      retryCount + 1,
    );

    if (!KYC_API_BASE_URL) {
      // eslint-disable-next-line no-console
      console.log(
        '🚨🚨🚨 [VBA KYC] Skipping fetch, KYC_API_BASE_URL is not configured',
      );
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      FETCH_TIMEOUT_MS,
    );

    const fetchDisclaimers = async () => {
      try {
        const bearerToken =
          await Engine.context.AuthenticationController.getBearerToken();
        const url = new URL('/vendors/moonpay/disclaimers', KYC_API_BASE_URL);
        url.searchParams.set('country', country);

        // eslint-disable-next-line no-console
        console.log(
          '🚨🚨🚨 [VBA KYC] Fetching disclaimers from:',
          url.toString(),
        );

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${bearerToken}` },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch KYC disclaimers, status ${response.status}`,
          );
        }

        const data: KycDisclaimer[] = await response.json();
        // eslint-disable-next-line no-console
        console.log('🚨🚨🚨 [VBA KYC] Fetch SUCCEEDED, disclaimers:', data);
        if (isMounted) {
          setDisclaimers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        const isTimeout =
          err instanceof Error &&
          (err.name === 'AbortError' || err.name === 'TimeoutError');
        // eslint-disable-next-line no-console
        console.log(
          isTimeout
            ? '🚨🚨🚨 [VBA KYC] Fetch TIMED OUT'
            : '🚨🚨🚨 [VBA KYC] Fetch FAILED:',
          isTimeout ? undefined : err,
        );
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

    fetchDisclaimers();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [country, retryCount]);

  return { disclaimers, isLoading, error, retry };
};
