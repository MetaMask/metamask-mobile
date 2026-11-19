import BigNumber from 'bignumber.js';
import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import type { NeobankBankTransferActivity } from '../types/moneyActivity';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import { moneyFormatUsd } from './moneyFormatFiat';

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
  // The list amount uses the same fiat line as an on-chain deposit: full
  // opacity, success colour while pending, and a signed zero when failed.
  const destination = new BigNumber(activity.destinationAmount ?? 'NaN');
  let fiatAmount = '';
  if (failed) {
    // Same signed-zero fiat line as a failed on-chain deposit.
    fiatAmount = `+${moneyFormatUsd(new BigNumber(0))}`;
  } else if (destination.isFinite() && destination.isGreaterThan(0)) {
    fiatAmount = `+${moneyFormatUsd(destination.abs())}`;
  }

  return {
    description: strings('money.transaction.bank_transfer'),
    label: failed
      ? strings('money.transaction.deposit_failed')
      : strings('money.transaction.depositing'),
    primaryAmount: '',
    fiatAmount,
    isIncoming: true,
    icon: IconName.Add,
    status: failed ? 'failed' : 'pending',
  };
}
