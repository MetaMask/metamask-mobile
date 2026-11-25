import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { usePerpsLiveAccount } from '../../../../UI/Perps/hooks/stream/usePerpsLiveAccount';
import { selectPerpsBalances } from '../../../../UI/Perps/selectors/perpsController';
import { formatPerpsBalance } from '../../../../UI/Perps/utils/formatUtils';

/**
 * Hyperliquid uses the live perps account balance. Lighter uses the per-venue
 * balance the controller keeps in `perpsBalances`.
 */
export function usePerpsProviderBalance(): {
  hyperliquid: string;
  lighter: string;
} {
  const { account } = usePerpsLiveAccount();
  const perpsBalances = useSelector(selectPerpsBalances);
  const hyperliquid = useMemo(
    () => formatPerpsBalance(account?.totalBalance),
    [account?.totalBalance],
  );
  const lighter = useMemo(
    () => formatPerpsBalance(perpsBalances.lighter?.totalBalance),
    [perpsBalances.lighter?.totalBalance],
  );

  return { hyperliquid, lighter };
}
