import { useMemo } from 'react';

import { usePerpsLiveAccount } from '../../../../UI/Perps/hooks/stream/usePerpsLiveAccount';
import { formatPerpsBalance } from '../../../../UI/Perps/utils/formatUtils';

/** Lighter balances are not wired yet. */
export const LIGHTER_BALANCE_PLACEHOLDER = 'XXX.XX';

/**
 * Hyperliquid uses the live perps account balance. Lighter stays a placeholder.
 */
export function usePerpsProviderBalance(): {
  hyperliquid: string;
  lighter: string;
} {
  const { account } = usePerpsLiveAccount();
  const hyperliquid = useMemo(
    () => formatPerpsBalance(account?.totalBalance),
    [account?.totalBalance],
  );

  return {
    hyperliquid,
    lighter: LIGHTER_BALANCE_PLACEHOLDER,
  };
}
