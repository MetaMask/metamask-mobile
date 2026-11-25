import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { usePerpsLiveAccount } from '../../../../UI/Perps/hooks/stream/usePerpsLiveAccount';
import { selectPerpsBalances } from '../../../../UI/Perps/selectors/perpsController';
import { formatPerpsBalance } from '../../../../UI/Perps/utils/formatUtils';
import { useLighterWithdrawableBalance } from '../../temp-lighter/useLighterWithdrawableBalance';

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
  const address = useSelector(selectSelectedInternalAccountAddress);
  const controllerLighterBalance = perpsBalances.lighter?.totalBalance;
  // TEMPORARY FALLBACK. Remove it once the Perps code fills `perpsBalances`
  // for Lighter in every provider mode. The controller only does so in
  // aggregated mode, so in direct Hyperliquid mode it has no Lighter entry.
  const fallbackLighterBalance = useLighterWithdrawableBalance(
    address,
    controllerLighterBalance === undefined,
  );
  const hyperliquid = useMemo(
    () => formatPerpsBalance(account?.totalBalance),
    [account?.totalBalance],
  );
  const lighter = useMemo(
    () =>
      formatPerpsBalance(controllerLighterBalance ?? fallbackLighterBalance),
    [controllerLighterBalance, fallbackLighterBalance],
  );

  return { hyperliquid, lighter };
}
