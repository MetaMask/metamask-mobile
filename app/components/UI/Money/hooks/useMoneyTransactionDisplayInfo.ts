import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import {
  getMusdDisplayAmountFromTransactionMeta,
  isIncomingMoneyTransactionMeta,
} from '../constants/activityStyles';
import { buildMoneyActivityFiatLine } from '../utils/moneyActivityFiat';
import type {
  MoneyActivityTitleKey,
  MoneyActivityTransactionMeta,
} from '../constants/mockActivityData';

export interface MoneyTransactionDisplayInfo {
  label: string;
  description: string | undefined;
  primaryAmount: string;
  fiatAmount: string;
  isIncoming: boolean;
  icon: IconName;
}

function titleKeyToLabel(key: MoneyActivityTitleKey): string {
  switch (key) {
    case 'added':
      return strings('money.transaction.added');
    case 'deposited':
      return strings('money.transaction.deposited');
    case 'received':
      return strings('money.transaction.received');
    case 'card_transaction':
      return strings('money.transaction.card_transaction');
    case 'converted':
      return strings('money.transaction.converted');
    case 'sent':
      return strings('money.transaction.sent');
    case 'transferred':
      return strings('money.transaction.transferred');
    default:
      return strings('money.transaction.received');
  }
}

function getLabelForTransactionType(type: TransactionType | undefined): string {
  if (!type) {
    return strings('money.transaction.received');
  }
  switch (type) {
    case TransactionType.incoming:
    case TransactionType.moneyAccountDeposit:
      return strings('money.transaction.received');
    case TransactionType.moneyAccountWithdraw:
    case TransactionType.simpleSend:
      return strings('money.transaction.sent');
    case TransactionType.musdConversion:
      return strings('money.transaction.converted');
    default:
      return strings('money.transaction.received');
  }
}

function getMoneySubtitle(tx: TransactionMeta): string | undefined {
  const extended = tx as MoneyActivityTransactionMeta;
  return extended.moneySubtitle;
}

function getLabel(tx: TransactionMeta): string {
  const extended = tx as MoneyActivityTransactionMeta;
  if (extended.moneyActivityTitleKey) {
    return titleKeyToLabel(extended.moneyActivityTitleKey);
  }
  return getLabelForTransactionType(tx.type);
}

function titleKeyToIcon(key: MoneyActivityTitleKey): IconName {
  switch (key) {
    case 'added':
      return IconName.Add;
    case 'deposited':
      return IconName.Add;
    case 'received':
      return IconName.Arrow2Down;
    case 'card_transaction':
      return IconName.Card;
    case 'converted':
      return IconName.Refresh;
    case 'sent':
      return IconName.Arrow2UpRight;
    case 'transferred':
      return IconName.SwapHorizontal;
    default:
      return IconName.Arrow2Down;
  }
}

function getIconForTransactionType(
  type: TransactionType | undefined,
): IconName {
  if (!type) {
    return IconName.Arrow2Down;
  }
  switch (type) {
    case TransactionType.moneyAccountDeposit:
      return IconName.Add;
    case TransactionType.incoming:
      return IconName.Arrow2Down;
    case TransactionType.musdConversion:
      return IconName.Refresh;
    case TransactionType.moneyAccountWithdraw:
      return IconName.SwapHorizontal;
    case TransactionType.simpleSend:
      return IconName.Arrow2UpRight;
    default:
      return IconName.Arrow2Down;
  }
}

function getIcon(tx: TransactionMeta): IconName {
  const extended = tx as MoneyActivityTransactionMeta;
  if (extended.moneyActivityTitleKey) {
    return titleKeyToIcon(extended.moneyActivityTitleKey);
  }
  return getIconForTransactionType(tx.type);
}

/**
 * Derives display strings for a Money activity row backed by {@link TransactionMeta}.
 */
export function useMoneyTransactionDisplayInfo(
  tx: TransactionMeta,
  _moneyAddress: string | undefined,
): MoneyTransactionDisplayInfo {
  const subtitle = getMoneySubtitle(tx);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const tokenMarketData = useSelector(selectTokenMarketData);

  return useMemo(
    () => ({
      label: getLabel(tx),
      description: subtitle,
      primaryAmount: getMusdDisplayAmountFromTransactionMeta(tx),
      fiatAmount: buildMoneyActivityFiatLine(
        tx,
        currencyRates,
        currentCurrency,
        tokenMarketData,
      ),
      isIncoming: isIncomingMoneyTransactionMeta(tx),
      icon: getIcon(tx),
    }),
    [tx, subtitle, currentCurrency, currencyRates, tokenMarketData],
  );
}
