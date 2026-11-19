import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  getPreviouslyUsedProviders,
  type Provider,
  type RampsProviderHistoryEntry,
} from '@metamask/ramps-controller';
import {
  getCompletedLegacyBuyHistory,
  LEGACY_NATIVE_DEPOSIT_PROVIDER_ID,
} from '../../../../reducers/fiatOrders';
import { selectRampsProvidersAheadOfHistory } from '../../../../selectors/featureFlagController/rampsProvidersAheadOfHistory';
import { selectRampsOrders } from '../../../../selectors/rampsController';

export interface ProviderPickerOptions {
  aheadOfHistory: string[];
  extraHistory: RampsProviderHistoryEntry[];
}

/**
 * Inputs for `RampsController.selectProviderForAsset`: the remote
 * ahead-of-history list and the completed buys kept in the legacy order
 * store, which the controller does not see. Native Deposit orders map to the
 * region's native provider.
 *
 * @param providers - Providers for the current region.
 * @returns Stable picker options.
 */
export function useProviderPickerOptions(
  providers: Provider[],
): ProviderPickerOptions {
  const aheadOfHistory = useSelector(selectRampsProvidersAheadOfHistory);
  const legacyHistory = useSelector(getCompletedLegacyBuyHistory);
  const nativeProviderId = providers.find(
    (provider) => provider.type === 'native',
  )?.id;

  const extraHistory = useMemo(
    () =>
      legacyHistory.reduce<RampsProviderHistoryEntry[]>((history, entry) => {
        if (entry.providerId !== LEGACY_NATIVE_DEPOSIT_PROVIDER_ID) {
          history.push(entry);
        } else if (nativeProviderId) {
          history.push({ ...entry, providerId: nativeProviderId });
        }
        return history;
      }, []),
    [legacyHistory, nativeProviderId],
  );

  return useMemo(
    () => ({ aheadOfHistory, extraHistory }),
    [aheadOfHistory, extraHistory],
  );
}

/**
 * Ids of the given providers that the user has completed a buy with, most
 * recent first. Reads the same history as the provider pre-selection, so the
 * "Previously used" tag and the pick agree.
 *
 * @param providers - Providers for the current region.
 * @returns Stable list of previously used provider ids.
 */
export function usePreviouslyUsedProviderIds(providers: Provider[]): string[] {
  const orders = useSelector(selectRampsOrders);
  const { extraHistory } = useProviderPickerOptions(providers);

  return useMemo(
    () =>
      getPreviouslyUsedProviders({ providers, orders, extraHistory }).map(
        (provider) => provider.id,
      ),
    [providers, orders, extraHistory],
  );
}

export default useProviderPickerOptions;
