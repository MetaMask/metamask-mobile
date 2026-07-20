import BigNumber from 'bignumber.js';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { AccountsApiActivity } from '../types/moneyActivity';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import { moneyFormatUsd } from './moneyFormatFiat';
import { MONEY_ACCOUNT_DISPLAY_SYMBOL } from '../../Card/util/vedaToken';

const KIND_LABEL_KEY: Record<AccountsApiActivity['kind'], string> = {
  card: 'money.transaction.purchase',
  cashback: 'money.transaction.musd_back',
  refund: 'money.transaction.refund',
};

export function accountsApiActivityDisplayInfo(
  activity: AccountsApiActivity,
): MoneyTransactionDisplayInfo {
  const isIncoming = activity.kind === 'cashback' || activity.kind === 'refund';
  const sign = isIncoming ? '+' : '-';

  const labelKey = KIND_LABEL_KEY[activity.kind];

  // Card activity amounts are already denominated in USD (mUSD is USD-pegged).
  const usdValue = new BigNumber(activity.amount).dividedBy(
    new BigNumber(10).pow(activity.token.decimals),
  );

  const primaryAmount = `${sign}${usdValue.toFixed(2)} ${MONEY_ACCOUNT_DISPLAY_SYMBOL}`;

  const fiatAmount = `${sign}${moneyFormatUsd(usdValue)}`;

  return {
    description: strings('money.transaction.card'),
    label: strings(labelKey),
    primaryAmount,
    fiatAmount,
    isIncoming,
    icon: IconName.Card,
    status: 'confirmed',
  };
}
