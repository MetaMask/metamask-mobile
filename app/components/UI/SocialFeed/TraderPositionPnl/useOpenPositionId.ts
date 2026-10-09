import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { getOpenPositionPnl } from './traderPositionService';
import type { TraderPosition } from './types';
import { TRADER_POSITION_POLL_INTERVAL_MS } from './useTraderPosition';

export interface UseOpenPositionIdArgs {
  /** Explicit id wins and skips the open-positions lookup. */
  positionId?: string;
  tokenAddress?: string;
  chainId?: string;
}

export interface UseOpenPositionIdResult {
  position: TraderPosition | null;
  isResolving: boolean;
}

/**
 * Loads this wallet's open position in the token.
 * The asset is sent as a CAIP-19 id on the open-position PnL route.
 */
export const useOpenPositionId = ({
  positionId,
  tokenAddress,
  chainId,
}: UseOpenPositionIdArgs): UseOpenPositionIdResult => {
  const accountAddress = useSelector(selectSelectedInternalAccountAddress);
  const isUnlocked = useSelector(selectIsUnlocked);
  const isFocused = useIsFocused();
  const enabled =
    positionId == null &&
    Boolean(accountAddress) &&
    Boolean(tokenAddress) &&
    isUnlocked;

  const query = useQuery({
    queryKey: [
      'TraderPositionPnl',
      'open-position',
      accountAddress,
      tokenAddress,
      chainId,
    ],
    queryFn: ({ signal }) =>
      getOpenPositionPnl({
        accountAddress: accountAddress ?? '',
        tokenAddress: tokenAddress ?? '',
        chainId,
        signal,
      }),
    enabled,
    refetchInterval: isFocused ? TRADER_POSITION_POLL_INTERVAL_MS : false,
  });

  return {
    position: positionId == null ? (query.data ?? null) : null,
    isResolving: enabled && query.isLoading,
  };
};
