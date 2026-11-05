import type { QueryClient } from '@tanstack/react-query';
import type { KycDisclaimer } from '@metamask/kyc-controller';
import Engine from '../../../../../core/Engine';
import reactQueryService from '../../../../../core/ReactQueryService';
import Logger from '../../../../../util/Logger';
import { VBA_KYC_VENDOR } from './constants';

// Bounds the KYC controller wait so a hung request can't leave the CTA disabled forever.
export const VBA_VENDOR_DISCLAIMERS_TIMEOUT_MS = 10_000;

// Vendor terms change rarely. Keeping them fresh for a few minutes lets
// onboarding warm this cache before the vendor terms screen mounts.
const VBA_VENDOR_DISCLAIMERS_STALE_TIME_MS = 5 * 60 * 1000;

export const VBA_VENDOR_DISCLAIMERS_ERRORS = {
  KYC_SERVICE_UNAVAILABLE: 'KYC service is unavailable',
  EMPTY: 'No KYC disclaimers returned',
  TIMEOUT: 'Request timed out',
} as const;

export const vbaVendorDisclaimersQueryKey = [
  'vbaVendorDisclaimers',
  VBA_KYC_VENDOR,
] as const;

const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = new Error(VBA_VENDOR_DISCLAIMERS_ERRORS.TIMEOUT);
      timeoutError.name = 'TimeoutError';
      reject(timeoutError);
    }, VBA_VENDOR_DISCLAIMERS_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
};

export type VbaVendorDisclaimersSource = 'prefetch' | 'screen';

/**
 * Looks up the user's country, then loads the Iron / MoonPay Enterprise vendor
 * disclaimers for it. An empty list is thrown as an error so callers can offer
 * a retry instead of an incomplete legal line.
 *
 * @param source - Which caller started the load. Only the screen reports
 * failures to Sentry: a failed prefetch has no user impact, and if the user
 * reaches the screen its own load reports the failure there.
 * @returns The non-empty vendor disclaimer list.
 */
export const fetchVbaVendorDisclaimers = async (
  source: VbaVendorDisclaimersSource,
): Promise<KycDisclaimer[]> => {
  let country: string | undefined;
  try {
    return await withTimeout(
      (async () => {
        const kycService = Engine.context.KycService;
        if (!kycService) {
          throw new Error(
            VBA_VENDOR_DISCLAIMERS_ERRORS.KYC_SERVICE_UNAVAILABLE,
          );
        }
        country = await kycService.getGeoCountry();
        const disclaimers =
          await Engine.context.KycController.fetchVendorDisclaimers({
            vendor: VBA_KYC_VENDOR,
            country,
          });
        if (!disclaimers?.length) {
          throw new Error(VBA_VENDOR_DISCLAIMERS_ERRORS.EMPTY);
        }
        return disclaimers;
      })(),
    );
  } catch (error) {
    if (source === 'screen') {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError';
      // The screen collapses every failure into one generic string, so the
      // underlying cause is only recoverable from here. For an empty catalog
      // the geo is the usual cause, so it is recorded with the error.
      Logger.error(error as Error, {
        tags: { feature: 'vba-kyc', provider: VBA_KYC_VENDOR },
        context: {
          name: 'useKycDisclaimers',
          data: { source, isTimeout, country },
        },
      });
    }
    throw error;
  }
};

export const vbaVendorDisclaimersQueryOptions = {
  queryKey: vbaVendorDisclaimersQueryKey,
  queryFn: () => fetchVbaVendorDisclaimers('screen'),
  staleTime: VBA_VENDOR_DISCLAIMERS_STALE_TIME_MS,
  // The screen offers its own retry, so a failure shows straight away.
  retry: false,
  // NetInfo offline would otherwise pause the query: no request, no error, and
  // a spinner with no retry. Attempting it lets the timeout turn that into a
  // visible failure the user can retry.
  networkMode: 'always',
} as const;

/**
 * Starts loading the vendor disclaimers into the shared query cache. Never
 * rejects; a failure is left in the cache and the screen loads or retries.
 *
 * @param queryClient - The app query client. Defaults to the shared one.
 * @returns A promise that settles when the load finishes.
 */
export const prefetchVbaVendorDisclaimers = (
  queryClient: QueryClient = reactQueryService.queryClient,
): Promise<void> =>
  queryClient
    .query({
      ...vbaVendorDisclaimersQueryOptions,
      // A failed prefetch is invisible to the user, so it stays out of Sentry.
      // If the user reaches the screen, its own load reports the failure.
      queryFn: () => fetchVbaVendorDisclaimers('prefetch'),
    })
    .then(() => undefined)
    .catch(() => undefined);
