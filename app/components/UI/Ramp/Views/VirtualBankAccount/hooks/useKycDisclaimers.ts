import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { KycDisclaimer } from '@metamask/kyc-controller';
import ReduxService from '../../../../../../core/redux';
import type { RootState } from '../../../../../../reducers';
import { selectSelectedVbaWalletAddress } from '../../../../../../selectors/rampsController';
import { saveVbaVendorTermsAcceptance } from '../vbaVendorTermsStorage';
import { vbaVendorDisclaimersQueryOptions } from '../vbaVendorDisclaimersQuery';

export type { KycDisclaimer };

interface UseKycDisclaimersResult {
  disclaimers: KycDisclaimer[] | null;
  isLoading: boolean;
  isAccepting: boolean;
  error: string | null;
  acceptDisclaimers: () => Promise<boolean>;
  retry: () => void;
}

/**
 * Loads Iron / MoonPay Enterprise legal disclaimers (Privacy Policy / T&Cs)
 * and stores the accepted document ids locally per wallet.
 *
 * The load goes through the shared query cache
 * ({@link vbaVendorDisclaimersQueryOptions}). The VBA loading screen starts
 * it before vendor terms opens, so this usually returns cached disclaimers
 * on the first render. Opened any other way, it loads here as before.
 *
 * The email step records the locally accepted ids against the customer after
 * creating the Iron session. This lets product show vendor terms before email
 * even though the API requires an email/customer before remote acceptance.
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
export const useKycDisclaimers = (): UseKycDisclaimersResult => {
  const {
    data,
    error: queryError,
    isFetching,
    refetch,
  } = useQuery(vbaVendorDisclaimersQueryOptions);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const disclaimers = data?.length ? data : null;
  // Cached terms stay usable while a background refresh runs.
  const isLoading = !disclaimers && (isFetching || !queryError);
  const loadError =
    !disclaimers && !isFetching && queryError
      ? queryError instanceof Error
        ? queryError.message
        : 'Unknown error'
      : null;
  const error = acceptError ?? loadError;

  const retry = useCallback(() => {
    setAcceptError(null);
    refetch().catch(() => undefined);
  }, [refetch]);

  const acceptDisclaimers = useCallback(async (): Promise<boolean> => {
    if (!disclaimers?.length || isAccepting) {
      return false;
    }

    setIsAccepting(true);
    setAcceptError(null);
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
    } catch (saveError) {
      setAcceptError(
        saveError instanceof Error ? saveError.message : 'Unknown error',
      );
      return false;
    } finally {
      setIsAccepting(false);
    }
  }, [disclaimers, isAccepting]);

  return {
    disclaimers,
    isLoading,
    isAccepting,
    error,
    acceptDisclaimers,
    retry,
  };
};
