import type { CaipAssetType } from '@metamask/utils';
import { isNonEvmChainId } from '@metamask/bridge-controller';

import type { WatchlistTokenWithBalance } from '../../Assets/watchlist/utils/addBalanceToTokens';
import { formatPriceWithSubscriptNotation } from '../../Predict/utils/format';
import I18n from '../../../../../locales/i18n';
import { formatWithThreshold } from '../../../../util/assets';
import type { BridgeToken } from '../types';
import { getTokenIconUrl } from './index';
import { convertApiTokenToBridgeToken } from './tokenUtils';

const WATCHLIST_FIAT_THRESHOLD = 0.01;

export const formatWatchlistBalanceFiat = (
  balanceFiat: number | undefined,
  currency: string | undefined,
  locale: string = I18n.locale,
): string | undefined => {
  if (balanceFiat == null || !currency) {
    return undefined;
  }

  const currencyOptions = {
    style: 'currency' as const,
    currency: currency.toUpperCase(),
  };

  if (balanceFiat === 0 || balanceFiat >= WATCHLIST_FIAT_THRESHOLD) {
    return formatWithThreshold(balanceFiat, WATCHLIST_FIAT_THRESHOLD, locale, {
      ...currencyOptions,
    });
  }

  return formatPriceWithSubscriptNotation(balanceFiat, currency.toUpperCase());
};

const isZeroBalance = (balance: string | undefined): boolean => {
  const trimmed = balance?.trim();
  if (!trimmed) {
    return true;
  }

  if (trimmed.startsWith('0x')) {
    try {
      return BigInt(trimmed) === 0n;
    } catch {
      return true;
    }
  }

  return Number.parseFloat(trimmed) === 0;
};

/**
 * Maps a hydrated watchlist token to the `BridgeToken` shape used by
 * `BridgeTokenSelector` / `TokenSelectorItem`.
 */
export const mapWatchlistTokenToBridgeToken = (
  token: WatchlistTokenWithBalance,
  options?: { defaultCurrency?: string },
): BridgeToken & { assetId: CaipAssetType } => {
  const bridgeToken = convertApiTokenToBridgeToken({
    assetId: String(token.assetId),
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    iconUrl: token.iconUrl,
  });

  const fiatCurrency = token.fiatCurrency ?? options?.defaultCurrency;
  const fiatAmount =
    token.balanceFiat ??
    (isZeroBalance(token.balance) && fiatCurrency ? 0 : undefined);

  const balanceFiat = formatWatchlistBalanceFiat(fiatAmount, fiatCurrency);

  const assetId = String(token.assetId) as CaipAssetType;
  const fallbackImage = getTokenIconUrl(
    assetId,
    isNonEvmChainId(bridgeToken.chainId),
  );

  return {
    ...bridgeToken,
    balance: token.balance,
    balanceFiat,
    tokenFiatAmount: token.balanceFiat ?? fiatAmount,
    image: token.iconUrl ?? bridgeToken.image ?? fallbackImage,
  };
};

/**
 * Re-applies watchlist fiat formatting from the numeric `tokenFiatAmount`.
 * Needed after wallet balance merge, which can overwrite sub-cent values with
 * `$0.00` / `<$0.01` from the generic bridge balance formatter.
 */
export const applyWatchlistBridgeTokenFiatDisplay = <T extends BridgeToken>(
  token: T,
  currency: string | undefined,
  locale: string = I18n.locale,
): T => {
  const fiatAmount =
    token.tokenFiatAmount ??
    (isZeroBalance(token.balance) && currency ? 0 : undefined);
  const balanceFiat = formatWatchlistBalanceFiat(fiatAmount, currency, locale);

  return balanceFiat === undefined ? token : { ...token, balanceFiat };
};
