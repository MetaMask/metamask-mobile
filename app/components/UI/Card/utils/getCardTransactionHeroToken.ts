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
  isMoneyAccount?: boolean;
}

const MONEY_ACCOUNT_CURRENCIES = new Set([
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
  'musd',
  MONEY_ACCOUNT_DISPLAY_SYMBOL.toLowerCase(),
]);

function asMoneyAccountHero(
  display: ReturnType<typeof getCardTokenDisplay>,
): CardTransactionHeroToken {
  return { ...display, isMoneyAccount: true };
}

export function getCardTransactionHeroToken(
  transaction?: CardTransaction,
  fallbackToken?: CardFundingToken | null,
): CardTransactionHeroToken {
  const source = transaction?.fundingSources.find((item) => item.currency);

  if (!source) {
    if (fallbackToken) {
      const display = getCardTokenDisplay(fallbackToken);
      return fallbackToken.isMoneyAccountEntry
        ? asMoneyAccountHero(display)
        : display;
    }
    return {
      symbol: MUSD_TOKEN.symbol,
      iconSource: MUSD_TOKEN.imageSource,
    };
  }

  const currency = source.currency?.toLowerCase() ?? '';
  if (MONEY_ACCOUNT_CURRENCIES.has(currency)) {
    return asMoneyAccountHero(
      getCardTokenDisplay({
        displaySymbol: MONEY_ACCOUNT_DISPLAY_SYMBOL,
        isMoneyAccountEntry: true,
      }),
    );
  }

  if (fallbackToken) {
    const display = getCardTokenDisplay(fallbackToken);
    return fallbackToken.isMoneyAccountEntry
      ? asMoneyAccountHero(display)
      : display;
  }

  return {
    symbol: source.currency?.toUpperCase() || MUSD_TOKEN.symbol,
    iconSource: MUSD_TOKEN.imageSource,
  };
}
