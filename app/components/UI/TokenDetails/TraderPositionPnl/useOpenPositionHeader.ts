import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useTokenCaipAssetId } from '../hooks/useTokenCaipAssetId';
import {
  toOpenPositionHeader,
  type OpenPositionHeaderModel,
} from './openPositionHeader';
import {
  assetChainScope,
  resolveOpenPositionWallet,
} from './openPositionWallet';
import type { TraderPosition } from './types';
import { useOpenPositionForAsset } from './useOpenPositionForAsset';
import { useUsdToFiatRate } from './useUsdToFiatRate';

/**
 * Header model for the meme-page sticky footer.
 * PnL comes from the selected wallet on this token's chain and the token's
 * CAIP-19 id. A profile id is not a valid key for that route.
 */
export interface OpenPositionHeaderResult extends OpenPositionHeaderModel {
  /** Open-position row to attach when sharing to the feed. */
  sharePosition: TraderPosition | null;
}

export const useOpenPositionHeader = (
  token: TokenDetailsRouteParams,
): OpenPositionHeaderResult => {
  const assetId = useTokenCaipAssetId(token);
  const scope = useMemo(() => assetChainScope(assetId), [assetId]);

  // Both selectors return a memoized account reference, so the checksumming in
  // resolveOpenPositionWallet runs on an account change rather than per action.
  const scopedAccount = useSelector((state: RootState) =>
    scope ? selectSelectedInternalAccountByScope(state)(scope) : undefined,
  );
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const walletAddress = useMemo(
    () => resolveOpenPositionWallet({ scope, scopedAccount, selectedAccount }),
    [scope, scopedAccount, selectedAccount],
  );

  const { position, sharePosition, isLoading } = useOpenPositionForAsset(
    walletAddress,
    assetId ?? undefined,
    walletAddress,
  );
  const { fiatBalance } = useTokenBalance(token);
  const conversion = useUsdToFiatRate();
  const tradeTimestamps =
    sharePosition?.trades.map((trade) => trade.timestamp) ?? [];
  const earliestTrade = tradeTimestamps.reduce<number | null>(
    (earliest, timestamp) =>
      earliest == null || timestamp < earliest ? timestamp : earliest,
    null,
  );
  const header = toOpenPositionHeader({
    position,
    isLoading,
    walletFiatBalance: fiatBalance,
    conversion,
    earliestTradeAt: earliestTrade ?? sharePosition?.lastTradeAt,
  });

  return {
    ...header,
    sharePosition: sharePosition ?? null,
  };
};
