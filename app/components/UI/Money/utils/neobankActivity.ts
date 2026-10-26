import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { MUSD_TOKEN } from '../../Earn/constants/musd';
import type { NeobankBankTransferActivity } from '../types/moneyActivity';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';

/** MoonPay autoramp transaction statuses that are no longer in flight. */
export const NEOBANK_TERMINAL_STATUSES = new Set([
  'Completed',
  'Failed',
  'Cancelled',
]);

export function isNeobankPendingStatus(status: string): boolean {
  return !NEOBANK_TERMINAL_STATUSES.has(status);
}

export function isNeobankFailedStatus(status: string): boolean {
  return status === 'Failed' || status === 'Cancelled';
}

export function isNeobankCompletedStatus(status: string): boolean {
  return status === 'Completed';
}

export function isNeobankVisibleActivityStatus(status: string): boolean {
  return !isNeobankCompletedStatus(status);
}

/**
 * Maps a NeoBankService `listAutorampTransactions` row into Money Activity shape.
 */
export function mapAutorampTransactionToNeobankActivity(tx: {
  id: string;
  autorampId: string;
  status: string;
  sourceAmount?: string;
  destinationAmount?: string;
  createdAt?: string;
  transactionHash?: string;
}): NeobankBankTransferActivity {
  const time =
    typeof tx.createdAt === 'string' && !Number.isNaN(Date.parse(tx.createdAt))
      ? Date.parse(tx.createdAt)
      : Date.now();

  const hash =
    typeof tx.transactionHash === 'string' &&
    tx.transactionHash.startsWith('0x')
      ? (tx.transactionHash as Hex)
      : undefined;

  return {
    id: tx.id,
    autorampId: tx.autorampId,
    status: tx.status,
    time,
    sourceAmount: tx.sourceAmount,
    destinationAmount: tx.destinationAmount,
    transactionHash: hash,
  };
}

export function neobankActivityDisplayInfo(
  activity: NeobankBankTransferActivity,
): MoneyTransactionDisplayInfo {
  const failed = isNeobankFailedStatus(activity.status);
  // NeoBank rows are off-chain only. Even MoonPay `Completed` is still pending
  // from Money's POV until mUSD lands and Accounts API emits bank_transfer.
  const amount = new BigNumber(activity.destinationAmount ?? 'NaN');
  const hasValidAmount = amount.isFinite() && amount.isGreaterThan(0);
  const primaryAmount = hasValidAmount
    ? `+${getIntlNumberFormatter(I18n.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
      }).format(amount.toNumber())} ${MUSD_TOKEN.symbol}`
    : '';

  return {
    description: strings('money.transaction.bank_transfer'),
    label: failed
      ? strings('money.transaction.deposit_failed')
      : strings('money.transaction.depositing'),
    primaryAmount,
    fiatAmount: '',
    isIncoming: true,
    icon: IconName.Add,
    status: failed ? 'failed' : 'pending',
    showPrimaryAmount: !failed && Boolean(primaryAmount),
    pendingStatusLabel: !failed ? strings('transaction.pending') : undefined,
    isPrimaryAmountPending: !failed && Boolean(primaryAmount),
  };
}
