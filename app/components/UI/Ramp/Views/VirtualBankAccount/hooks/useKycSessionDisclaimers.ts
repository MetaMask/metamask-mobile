import { useCallback, useEffect, useState } from 'react';
import type { KycCatalogDocument } from '@metamask/kyc-controller';
import Engine from '../../../../../../core/Engine';

export type KycCatalogDisclaimerLink = KycCatalogDocument & {
  /** Stable list key; documents are unique per catalog group + `key`. */
  id: string;
};

interface UseKycSessionDisclaimersResult {
  disclaimers: KycCatalogDisclaimerLink[] | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

// Bounds the KYC service wait so a hung request can't leave the CTA disabled forever.
const FETCH_TIMEOUT_MS = 10_000;

const toLinks = (
  group: 'idOS' | 'kycProvider',
  documents: KycCatalogDocument[] | undefined,
): KycCatalogDisclaimerLink[] =>
  (documents ?? []).map((catalogDocument) => ({
    ...catalogDocument,
    id: `${group}:${catalogDocument.key}`,
  }));

/**
 * Loads idOS + SumSub (KYC-provider) legal documents for the VBA Verify Identity
 * screen via {@link Engine.context.KycService.fetchDisclaimersCatalog}.
 *
 * This is the pre-session global catalog (`GET /disclaimers?country=`). Do not
 * use {@link Engine.context.KycService.fetchSessionDisclaimers} here — that
 * endpoint requires a UKYC `sessionId`. Vendor T&Cs stay on
 * {@link Engine.context.KycController.loadDisclaimers} (Get Pix Key).
 *
 * `disclaimers` is `null` until a load returns a non-empty list. Callers should
 * treat a non-empty `error` as "the user hasn't seen the terms" and keep the
 * flow's continue action disabled until a `retry()` succeeds. An empty catalog
 * is reported as an `error` so the retry affordance is reachable. There's
 * intentionally no static fallback copy.
 *
 * @param country - ISO 3166-1 alpha-3 country code (e.g. `'BRA'`).
 * @returns The flattened catalog links, loading state, error, and a `retry` function.
 */
export const useKycSessionDisclaimers = (
  country: string,
): UseKycSessionDisclaimersResult => {
  const [disclaimers, setDisclaimers] = useState<
    KycCatalogDisclaimerLink[] | null
  >(null);
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

    const abortedPromise = new Promise<never>((_, reject) => {
      abortController.signal.addEventListener('abort', () => {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        reject(abortError);
      });
    });

    const loadCatalog = async () => {
      try {
        // KycService is an optional messenger client, so it can be absent when
        // the KYC feature is not enabled for this build.
        const kycService = Engine.context.KycService;
        if (!kycService) {
          throw new Error('KYC service is unavailable');
        }

        const catalog = await Promise.race([
          kycService.fetchDisclaimersCatalog({ country }),
          abortedPromise,
        ]);

        if (!isMounted) {
          return;
        }

        const links = [
          ...toLinks('idOS', catalog.idOS),
          ...toLinks('kycProvider', catalog.kycProvider),
        ];

        if (!links.length) {
          setDisclaimers(null);
          setError('No KYC disclaimers returned');
          return;
        }

        setDisclaimers(links);
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

    loadCatalog();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [country, retryCount]);

  return { disclaimers, isLoading, error, retry };
};
