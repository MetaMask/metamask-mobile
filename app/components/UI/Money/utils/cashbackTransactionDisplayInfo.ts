import BigNumber from 'bignumber.js';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { CashbackTransaction } from '../types/moneyActivity';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import { moneyFormatFiat } from './moneyFormatFiat';
import { MONEY_ACCOUNT_DISPLAY_SYMBOL } from '../../Card/util/vedaToken';

export function cashbackTransactionDisplayInfo(
  cashback: CashbackTransaction,
  opts: { currentCurrency: string; usdToCurrentCurrencyRate?: number },
): MoneyTransactionDisplayInfo {
  const { currentCurrency, usdToCurrentCurrencyRate } = opts;

  const usdValue = new BigNumber(cashback.amount).dividedBy(
    new BigNumber(10).pow(cashback.token.decimals),
  );

  const primaryAmount = `+${usdValue.toFixed(2)} ${MONEY_ACCOUNT_DISPLAY_SYMBOL}`;

  const fiatAmount =
    usdToCurrentCurrencyRate && usdToCurrentCurrencyRate > 0
      ? `+${moneyFormatFiat(usdValue.times(usdToCurrentCurrencyRate), currentCurrency)}`
      : '';

  return {
    label: strings('money.transaction.cashback'),
    description: undefined,
    primaryAmount,
    fiatAmount,
    isIncoming: true, // cashback credits the money account
    icon: IconName.Card,
    status: 'confirmed', // cashback only surfaces once settled
  };
}
