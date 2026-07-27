import BigNumber from 'bignumber.js';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { AccountsApiActivity } from '../types/moneyActivity';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import { moneyFormatUsd } from './moneyFormatFiat';
import { MONEY_ACCOUNT_DISPLAY_SYMBOL } from '../../Card/util/vedaToken';
import type { CardTransaction } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { formatCardAmount } from '../../Card/utils/cardTransactionAmount';

const KIND_LABEL_KEY: Record<AccountsApiActivity['kind'], string> = {
  card: 'money.transaction.purchase',
  cashback: 'money.transaction.musd_back',
  refund: 'money.transaction.refund',
};

export function accountsApiActivityDisplayInfo(
  activity: AccountsApiActivity,
  enrichment?: CardTransaction,
): MoneyTransactionDisplayInfo {
  const isIncoming = activity.kind === 'cashback' || activity.kind === 'refund';
  const sign = isIncoming ? '+' : '-';

  const usdValue = new BigNumber(activity.amount).dividedBy(
    new BigNumber(10).pow(activity.token.decimals),
  );

  const primaryAmount = `${sign}${usdValue.toFixed(2)} ${MONEY_ACCOUNT_DISPLAY_SYMBOL}`;
  const fiatAmount = `${sign}${moneyFormatUsd(usdValue)}`;

  const base: MoneyTransactionDisplayInfo = {
    description: strings('money.transaction.card'),
    label: strings(KIND_LABEL_KEY[activity.kind]),
    primaryAmount,
    fiatAmount,
    isIncoming,
    icon: IconName.Card,
    status: 'confirmed',
  };

  if (activity.kind !== 'card' || !enrichment) {
    return base;
  }

  const original = enrichment.originalAmount;
  const secondaryAmount =
    original && original.currency.toUpperCase() !== 'USD'
      ? formatCardAmount(original, enrichment.isDebit)
      : fiatAmount;

  return {
    ...base,
    description: enrichment.merchant?.name ?? base.description,
    fiatAmount: secondaryAmount,
  };
}
