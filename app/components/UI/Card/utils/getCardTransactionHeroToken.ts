import type { ImageSourcePropType } from 'react-native';
import type { CardTransaction } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { MUSD_TOKEN } from '../../Earn/constants/musd';
import type { CardFundingToken } from '../types';
import { getCardTokenDisplay } from '../util/getCardTokenDisplay';
import {
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
  MONEY_ACCOUNT_DISPLAY_SYMBOL,
} from '../util/vedaToken';

export interface CardTransactionHeroToken {
  symbol: string;
  iconSource: ImageSourcePropType;
}

const MONEY_ACCOUNT_CURRENCIES = new Set([
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
  'musd',
  MONEY_ACCOUNT_DISPLAY_SYMBOL.toLowerCase(),
]);

/**
 * Resolves the asset icon/symbol for a card transaction hero.
 * Prefer the funding-source token; fall back to the card's primary
 * funding token, then mUSD for Money Account spends.
 */
export function getCardTransactionHeroToken(
  transaction?: CardTransaction,
  fallbackToken?: CardFundingToken | null,
): CardTransactionHeroToken {
  const source = transaction?.fundingSources.find(
    (item) => item.currency || item.address,
  );

  if (!source) {
    if (fallbackToken) {
      return getCardTokenDisplay(fallbackToken);
    }
    return {
      symbol: MUSD_TOKEN.symbol,
      iconSource: MUSD_TOKEN.imageSource,
    };
  }

  const currency = source.currency?.toLowerCase() ?? '';
  if (MONEY_ACCOUNT_CURRENCIES.has(currency)) {
    return getCardTokenDisplay({
      displaySymbol: MONEY_ACCOUNT_DISPLAY_SYMBOL,
      isMoneyAccountEntry: true,
    });
  }

  if (source.address && source.chainId) {
    return getCardTokenDisplay({
      address: source.address,
      caipChainId: source.chainId,
      symbol: source.currency?.toUpperCase() ?? '',
    });
  }

  if (fallbackToken) {
    return getCardTokenDisplay(fallbackToken);
  }

  return {
    symbol: source.currency?.toUpperCase() || MUSD_TOKEN.symbol,
    iconSource: MUSD_TOKEN.imageSource,
  };
}
