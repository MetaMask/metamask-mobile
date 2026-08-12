import { useEffect, useState } from 'react';
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
}

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
 * @param country - The ISO 3166-1 alpha-3 country code to scope the
 * disclaimers to (e.g. `'BRA'` for Brazil).
 * @returns The disclaimers, loading state, and any error encountered.
 */
export const useKycDisclaimers = (country: string): UseKycDisclaimersResult => {
  const [disclaimers, setDisclaimers] = useState<KycDisclaimer[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(KYC_API_BASE_URL));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      '🚨🚨🚨 [VBA KYC] useKycDisclaimers CALLED — country:',
      country,
      'KYC_API_BASE_URL:',
      KYC_API_BASE_URL || '(empty — fetch will be SKIPPED)',
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
        // eslint-disable-next-line no-console
        console.log('🚨🚨🚨 [VBA KYC] Fetch FAILED:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDisclaimers();

    return () => {
      isMounted = false;
    };
  }, [country]);

  return { disclaimers, isLoading, error };
};
