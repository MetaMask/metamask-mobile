import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import {
  selectSelectedVbaWalletAddress,
  selectUsableVbaAutoramp,
} from '../../../../selectors/rampsController';
import Logger from '../../../../util/Logger';

type RefreshAutorampTransactions = (autorampId: string) => Promise<unknown>;

interface AutorampTransactionRefreshController {
  refreshAutorampTransactions?: RefreshAutorampTransactions;
}

/**
 * Refreshes the VBA autoramp transaction list when a Money activity surface
 * gains focus and when the app returns to the foreground.
 *
 * `RampsController.refreshAutorampTransactions` owns the persisted
 * last-seen-status record and emits `Money VBA Transaction Updated` once per
 * new transaction or status change, so this hook never dedupes on its own.
 * The refresh is best-effort: failures never block the screen, and an older
 * controller without the method is a no-op.
 */
export function useVbaTransactionRefresh(): void {
  const walletAddress = useSelector(selectSelectedVbaWalletAddress);
  // Same autoramp the rest of the Money UI uses: an approved cursor wins over
  // an earlier failed create, so the refresh watches the live deposit.
  const autoramp = useSelector(selectUsableVbaAutoramp);
  const isFocused = useIsFocused();
  const networkTier = useNetworkTier();
  const networkTierRef = useRef(networkTier);
  networkTierRef.current = networkTier;

  const refresh = useCallback(() => {
    // Device-capability matrix: every hardware tier skips network work on a
    // known-offline network; `null` (unknown) takes the product default.
    if (!walletAddress || networkTierRef.current === 'NONE') {
      return;
    }

    const ramps = Engine.context
      .RampsController as AutorampTransactionRefreshController;
    if (!ramps.refreshAutorampTransactions) {
      return;
    }

    if (!autoramp) {
      return;
    }

    ramps.refreshAutorampTransactions(autoramp.id).catch((error) => {
      Logger.error(error as Error, {
        tags: { feature: 'money-home' },
        context: {
          name: 'useVbaTransactionRefresh',
          data: { walletAddress },
        },
      });
    });
  }, [autoramp, walletAddress]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isFocused) {
        refresh();
      }
    });
    return () => subscription.remove();
  }, [isFocused, refresh]);
}
