import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { getMusdAutorampDepositRailReadiness } from '@metamask/ramps-controller';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { selectVbaCustomerAbilities } from '../../../../../../selectors/rampsController';
import type { VbaSourceCurrency } from '../../../../../../util/region/getVbaSourceCurrency';

export interface VbaMusdAvailability {
  /** The abilities fetch for this check is still in flight. */
  isLoading: boolean;
  /** The customer's abilities do not offer mUSD on Monad for this currency. */
  isUnavailable: boolean;
}

/**
 * Whether the MoonPay customer is offered mUSD on Monad for the market
 * currency, read from the abilities already in memory. When `shouldCheck` is
 * set and none are loaded, fetches them once per focus, since abilities are
 * not persisted across app restarts. Loading lasts until the fetch lands. A
 * failed fetch, or no network, reports available so callers keep their usual
 * behavior.
 *
 * @param shouldCheck - The caller needs the answer now.
 * @param sourceCurrency - Currency of the market serving the user.
 */
export const useVbaMusdAvailability = (
  shouldCheck: boolean,
  sourceCurrency: VbaSourceCurrency | undefined,
): VbaMusdAvailability => {
  const abilities = useSelector(selectVbaCustomerAbilities);
  const networkTier = useNetworkTier();
  // Set once a fetch fails, so a failure shows the card instead of hiding it.
  const [hasFetchFailed, setHasFetchFailed] = useState(false);
  const isFetchingRef = useRef(false);

  const needsFetch =
    shouldCheck &&
    Boolean(sourceCurrency) &&
    abilities === null &&
    networkTier !== 'NONE';

  useFocusEffect(
    useCallback(() => {
      if (!needsFetch || isFetchingRef.current) {
        return undefined;
      }
      isFetchingRef.current = true;
      setHasFetchFailed(false);
      Engine.context.RampsController.refreshCustomerAbilities()
        .catch((error) => {
          setHasFetchFailed(true);
          Logger.error(error as Error, {
            tags: { feature: 'money-home' },
            context: { name: 'useVbaMusdAvailability', data: {} },
          });
        })
        .finally(() => {
          isFetchingRef.current = false;
        });
      return undefined;
    }, [needsFetch]),
  );

  if (!shouldCheck || !sourceCurrency || !abilities) {
    return { isLoading: needsFetch && !hasFetchFailed, isUnavailable: false };
  }
  return {
    isLoading: false,
    isUnavailable:
      getMusdAutorampDepositRailReadiness(abilities, sourceCurrency) ===
      'unavailable',
  };
};
