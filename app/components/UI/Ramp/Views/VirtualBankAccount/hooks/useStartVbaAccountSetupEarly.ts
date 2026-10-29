import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedVbaWalletAddress } from '../../../../../../selectors/rampsController';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { ensureMusdAutoramp } from '../ensureMusdAutoramp';
import { useVbaRegionSourceCurrency } from './useVbaRegionSourceCurrency';

/**
 * Starts virtual bank account setup as soon as the currency is known
 * (chooseCurrency off), so the account is usually ready by the time account
 * details open. Account details joins the same run and owns routing for its
 * outcome (waiting, provider approval, failures), so errors are ignored here.
 *
 * Runs once per wallet and currency, and skips while offline.
 */
export const useStartVbaAccountSetupEarly = (): void => {
  const walletAddress = useSelector(selectSelectedVbaWalletAddress);
  const regionCurrency = useVbaRegionSourceCurrency();
  const networkTier = useNetworkTier();
  const startedSetupKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!walletAddress || !regionCurrency || networkTier === 'NONE') {
      return;
    }
    // Start once per account; a network tier change must not rerun setup.
    const setupKey = `${walletAddress}:${regionCurrency}`;
    if (startedSetupKeyRef.current === setupKey) {
      return;
    }
    startedSetupKeyRef.current = setupKey;
    ensureMusdAutoramp(walletAddress, regionCurrency).catch(() => undefined);
  }, [networkTier, regionCurrency, walletAddress]);
};
