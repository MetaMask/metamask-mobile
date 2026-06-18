import BigNumber from 'bignumber.js';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { AccountsApiActivity } from '../types/moneyActivity';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import { moneyFormatFiat } from './moneyFormatFiat';
import { MONEY_ACCOUNT_DISPLAY_SYMBOL } from '../../Card/util/vedaToken';

/**
 * Derive the display row for an Accounts-API activity. Card spends are outflows
 * (`-`, default colour); cashback credits are inflows (`+`, success colour). Both
 * settle before they surface, so they're always `confirmed`, and merchant /
 * rewarder context isn't on-chain yet, so there's no subtitle.
 */
export function accountsApiActivityDisplayInfo(
  activity: AccountsApiActivity,
  opts: { currentCurrency: string; usdToCurrentCurrencyRate?: number },
): MoneyTransactionDisplayInfo {
  const { currentCurrency, usdToCurrentCurrencyRate } = opts;

  const isIncoming = activity.kind === 'cashback';
  const sign = isIncoming ? '+' : '-';

  const usdValue = new BigNumber(activity.amount).dividedBy(
    new BigNumber(10).pow(activity.token.decimals),
  );

  const primaryAmount = `${sign}${usdValue.toFixed(2)} ${MONEY_ACCOUNT_DISPLAY_SYMBOL}`;

  const fiatAmount =
    usdToCurrentCurrencyRate && usdToCurrentCurrencyRate > 0
      ? `${sign}${moneyFormatFiat(usdValue.times(usdToCurrentCurrencyRate), currentCurrency)}`
      : '';

  return {
    label: strings(
      isIncoming
        ? 'money.transaction.cashback'
        : 'money.transaction.card_transaction',
    ),
    description: undefined,
    primaryAmount,
    fiatAmount,
    isIncoming,
    icon: IconName.Card,
    status: 'confirmed',
  };
}
