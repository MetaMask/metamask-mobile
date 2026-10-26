import BigNumber from 'bignumber.js';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import type { VbaTransfer } from '@metamask/money-account-api-data-service';
import type { Hex } from '@metamask/utils';
import { areAddressesEqual } from '../../../../util/address';
import { MUSD_DECIMALS, MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import type {
  AccountsApiActivity,
  NeobankBankTransferActivity,
} from '../types/moneyActivity';
import { isNeobankFailedStatus } from './neobankActivity';

const TRANSACTION_HASH_PATTERN = /^0x[\da-f]{64}$/iu;
const DECIMAL_AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/u;

export interface MappedMoneyVbaTransfers {
  completed: Extract<AccountsApiActivity, { kind: 'bank_transfer' }>[];
  pending: NeobankBankTransferActivity[];
  failed: NeobankBankTransferActivity[];
}

type CompletedBankTransfer = Extract<
  AccountsApiActivity,
  { kind: 'bank_transfer' }
>;
type CompletedVbaTransfer = VbaTransfer & {
  status: 'confirmed';
  transfer: VbaTransfer['transfer'] & { transaction_hash: string };
};

function isValidTransferRecord(
  item: VbaTransfer,
  walletAddress: string,
): item is VbaTransfer & { transfer_id: string } {
  return Boolean(
    item.transfer_id &&
      Number.isFinite(Date.parse(item.event_timestamp)) &&
      areAddressesEqual(item.transfer.recipient_address, walletAddress),
  );
}

function mapInFlightTransfer(item: VbaTransfer): NeobankBankTransferActivity {
  const { transfer } = item;
  const status = item.status === 'error' ? 'Failed' : 'Pending';
  const destinationAmount =
    transfer.asset.toLowerCase() === 'musd' &&
    DECIMAL_AMOUNT_PATTERN.test(transfer.amount)
      ? transfer.amount
      : undefined;
  const transactionHash =
    transfer.transaction_hash &&
    TRANSACTION_HASH_PATTERN.test(transfer.transaction_hash)
      ? (transfer.transaction_hash.toLowerCase() as Hex)
      : undefined;

  return {
    id: item.transfer_id,
    autorampId: item.transfer_id,
    status,
    time: Date.parse(item.event_timestamp),
    destinationAmount,
    transactionHash,
  };
}

function isValidCompletedTransfer(
  item: VbaTransfer,
): item is CompletedVbaTransfer {
  const { transfer } = item;
  return Boolean(
    item.status === 'confirmed' &&
      transfer.asset.toLowerCase() === 'musd' &&
      transfer.network.toLowerCase() === 'monad' &&
      transfer.transaction_hash &&
      TRANSACTION_HASH_PATTERN.test(transfer.transaction_hash) &&
      DECIMAL_AMOUNT_PATTERN.test(transfer.amount),
  );
}

function mapCompletedTransfer(
  item: VbaTransfer,
  walletAddress: string,
): CompletedBankTransfer | undefined {
  if (!isValidCompletedTransfer(item)) {
    return undefined;
  }

  const { transfer } = item;
  const amount = new BigNumber(transfer.amount);
  const minimalAmount = amount.shiftedBy(MUSD_DECIMALS);
  if (
    !amount.isFinite() ||
    !amount.isGreaterThan(0) ||
    !minimalAmount.isInteger()
  ) {
    return undefined;
  }

  return {
    kind: 'bank_transfer',
    hash: transfer.transaction_hash.toLowerCase() as Hex,
    time: Date.parse(item.event_timestamp),
    chainId: CHAIN_IDS.MONAD,
    token: {
      address: MUSD_TOKEN_ADDRESS as Hex,
      symbol: 'mUSD',
      decimals: MUSD_DECIMALS,
    },
    amount: minimalAmount.toFixed(0),
    receivedFrom: (transfer.sender_address?.toLowerCase() ??
      walletAddress.toLowerCase()) as Hex,
    status: 'confirmed',
  };
}

function sortNewestFirst<
  T extends { time: number; id?: string; hash?: string },
>(rows: T[]): T[] {
  const sortedRows = [...rows];
  sortedRows.sort(
    (left, right) =>
      right.time - left.time ||
      (left.id ?? left.hash ?? '').localeCompare(right.id ?? right.hash ?? ''),
  );
  return sortedRows;
}

/**
 * Maps the service's current VBA transfer records to completed and in-flight
 * Money activity. Only confirmed mUSD settlements become completed deposits;
 * processing and error transfers remain provider rows.
 *
 * @param transfers - Validated transfer records from the preview data service.
 * @param walletAddress - Active Money Account wallet address.
 * @returns Completed mUSD deposits and processing/error activity, newest first.
 */
export function mapMoneyVbaTransfers(
  transfers: readonly VbaTransfer[],
  walletAddress: string,
): MappedMoneyVbaTransfers {
  const completed: Extract<AccountsApiActivity, { kind: 'bank_transfer' }>[] =
    [];
  const pending: NeobankBankTransferActivity[] = [];
  const failed: NeobankBankTransferActivity[] = [];
  const seenCompletedHashes = new Set<string>();
  const seenTransferIds = new Set<string>();

  for (const item of transfers) {
    if (!isValidTransferRecord(item, walletAddress)) {
      continue;
    }

    if (item.status === 'processing' || item.status === 'error') {
      if (seenTransferIds.has(item.transfer_id)) {
        continue;
      }
      seenTransferIds.add(item.transfer_id);
      const providerActivity = mapInFlightTransfer(item);
      (isNeobankFailedStatus(providerActivity.status) ? failed : pending).push(
        providerActivity,
      );
      continue;
    }

    const completedActivity = mapCompletedTransfer(item, walletAddress);
    if (!completedActivity || seenCompletedHashes.has(completedActivity.hash)) {
      continue;
    }

    seenCompletedHashes.add(completedActivity.hash);
    completed.push(completedActivity);
  }

  return {
    completed: sortNewestFirst(completed),
    pending: sortNewestFirst(pending),
    failed: sortNewestFirst(failed),
  };
}
