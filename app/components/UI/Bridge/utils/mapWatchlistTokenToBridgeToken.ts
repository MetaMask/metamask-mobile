import type { CaipAssetType } from '@metamask/utils';
import { isNonEvmChainId } from '@metamask/bridge-controller';

import type { WatchlistTokenWithBalance } from '../../Assets/watchlist/utils/addBalanceToTokens';
import I18n from '../../../../../locales/i18n';
import { formatWithThreshold } from '../../../../util/assets';
import type { BridgeToken } from '../types';
import { getTokenIconUrl } from './index';
import { convertApiTokenToBridgeToken } from './tokenUtils';

export const formatWatchlistBalanceFiat = (
  balanceFiat: number | undefined,
  currency: string | undefined,
  locale: string = I18n.locale,
): string | undefined => {
  if (balanceFiat == null || !currency) {
    return undefined;
  }

  return formatWithThreshold(balanceFiat, 0.01, locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
};

/**
 * Maps a hydrated watchlist token to the `BridgeToken` shape used by
 * `BridgeTokenSelector` / `TokenSelectorItem`.
 */
export const mapWatchlistTokenToBridgeToken = (
  token: WatchlistTokenWithBalance,
): BridgeToken & { assetId: CaipAssetType } => {
  const bridgeToken = convertApiTokenToBridgeToken({
    assetId: String(token.assetId),
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    iconUrl: token.iconUrl,
  });

  const balanceFiat = formatWatchlistBalanceFiat(
    token.balanceFiat,
    token.fiatCurrency,
  );

  const assetId = String(token.assetId) as CaipAssetType;
  const fallbackImage = getTokenIconUrl(
    assetId,
    isNonEvmChainId(bridgeToken.chainId),
  );

  return {
    ...bridgeToken,
    balance: token.balance,
    balanceFiat,
    tokenFiatAmount: token.balanceFiat,
    image: token.iconUrl ?? bridgeToken.image ?? fallbackImage,
  };
};
