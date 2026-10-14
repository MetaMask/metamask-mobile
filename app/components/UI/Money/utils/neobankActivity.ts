import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import type {
  AccountsApiActivity,
  NeobankBankTransferActivity,
} from '../types/moneyActivity';
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

/**
 * Allowlisted on-chain bank_transfer that settles this NeoBank deposit, if any.
 * MoonPay `created_at` can precede the payout by a few minutes; accept credits
 * from shortly before the autoramp tx through a generous post-window.
 */
export function findSettlingBankTransfer(
  neobank: NeobankBankTransferActivity,
  apiActivity: readonly AccountsApiActivity[],
): Extract<AccountsApiActivity, { kind: 'bank_transfer' }> | undefined {
  const bankTransfers = apiActivity.filter(
    (row): row is Extract<AccountsApiActivity, { kind: 'bank_transfer' }> =>
      row.kind === 'bank_transfer',
  );
  if (bankTransfers.length === 0) {
    return undefined;
  }

  if (neobank.transactionHash) {
    const byHash = bankTransfers.find(
      (row) =>
        row.hash.toLowerCase() === neobank.transactionHash?.toLowerCase(),
    );
    if (byHash) {
      return byHash;
    }
  }

  // Time-window match only after MoonPay pay-in is Completed — a Pending
  // NeoBank row must not be swallowed by an unrelated earlier credit.
  if (!isNeobankCompletedStatus(neobank.status)) {
    return undefined;
  }

  const windowStart = neobank.time - 60_000;
  const windowEnd = neobank.time + 30 * 60_000;
  return bankTransfers
    .filter((row) => row.time >= windowStart && row.time <= windowEnd)
    .sort((left, right) => left.time - right.time)[0];
}

/**
 * Drops NeoBank rows that Accounts API (or an overlapping bank_transfer) already
 * covers, so Completed sandbox/off-chain rows do not double-count once mUSD lands.
 */
export function filterNeobankActivityForMerge(
  neobank: NeobankBankTransferActivity[],
  apiActivity: AccountsApiActivity[],
): NeobankBankTransferActivity[] {
  return neobank.filter(
    (tx) => findSettlingBankTransfer(tx, apiActivity) === undefined,
  );
}

export function neobankActivityDisplayInfo(
  activity: NeobankBankTransferActivity,
): MoneyTransactionDisplayInfo {
  const failed = isNeobankFailedStatus(activity.status);
  // NeoBank rows are off-chain only. Even MoonPay `Completed` is still pending
  // from Money's POV until mUSD lands and Accounts API emits bank_transfer.
  // Amount / "You deposited" copy belong only on the settled Accounts API row.
  const awaitingMoneyAccount = !failed;

  return {
    description: strings('money.transaction.bank_transfer'),
    label: failed
      ? strings('money.transaction.deposit_failed')
      : strings('money.transaction.depositing'),
    // Hide amount on the list until on-chain mUSD settles.
    primaryAmount: '',
    fiatAmount: '',
    isIncoming: true,
    icon: IconName.Add,
    status: failed ? 'failed' : awaitingMoneyAccount ? 'pending' : 'confirmed',
  };
}
