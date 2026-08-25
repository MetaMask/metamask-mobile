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

// Bounds the KYC API wait so a hung request can't leave the CTA disabled forever.
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetches the vendor's legal disclaimers (Privacy Policy / T&Cs) for the VBA
 * KYC flow, so the client doesn't hardcode partner legal copy that can
 * change server-side. Stand-in for `@metamask/kyc-controller`, which isn't
 * published or wired into Engine yet.
 *
 * Skips the fetch and returns an empty list when {@link KYC_API_BASE_URL}
 * isn't configured (e.g. production). There's intentionally no static
 * fallback copy: callers should keep the flow's continue action disabled
 * until the disclaimers have loaded.
 *
 * @param country - ISO 3166-1 alpha-3 country code (e.g. `'BRA'`).
 * @returns The disclaimers, loading state, error, and a `retry` function.
 */
export const useKycDisclaimers = (country: string): UseKycDisclaimersResult => {
  const [disclaimers, setDisclaimers] = useState<KycDisclaimer[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(KYC_API_BASE_URL));
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  useEffect(() => {
    if (!KYC_API_BASE_URL) {
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
        if (isMounted) {
          setDisclaimers(Array.isArray(data) ? data : []);
        }
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

    fetchDisclaimers();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [country, retryCount]);

  return { disclaimers, isLoading, error, retry };
};
