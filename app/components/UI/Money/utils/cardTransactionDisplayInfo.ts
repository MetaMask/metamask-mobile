import BigNumber from 'bignumber.js';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { CardTransaction } from '../types/moneyActivity';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import { moneyFormatFiat } from './moneyFormatFiat';
import { MONEY_ACCOUNT_DISPLAY_SYMBOL } from '../../Card/util/vedaToken';

export function cardTransactionDisplayInfo(
  card: CardTransaction,
  opts: { currentCurrency: string; usdToCurrentCurrencyRate?: number },
): MoneyTransactionDisplayInfo {
  const { currentCurrency, usdToCurrentCurrencyRate } = opts;

  const usdValue = new BigNumber(card.amount).dividedBy(
    new BigNumber(10).pow(card.token.decimals),
  );

  const primaryAmount = `-${usdValue.toFixed(2)} ${MONEY_ACCOUNT_DISPLAY_SYMBOL}`;

  const fiatAmount =
    usdToCurrentCurrencyRate && usdToCurrentCurrencyRate > 0
      ? `-${moneyFormatFiat(usdValue.times(usdToCurrentCurrencyRate), currentCurrency)}`
      : '';

  return {
    label: strings('money.transaction.card_transaction'),
    description: undefined, // No merchant/vendor data on-chain
    primaryAmount,
    fiatAmount,
    isIncoming: false,
    icon: IconName.Card,
    status: 'confirmed', // card spends only surface once settled
  };
}
