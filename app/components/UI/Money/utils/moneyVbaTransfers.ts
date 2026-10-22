import BigNumber from 'bignumber.js';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import type { VbaTransfer } from '@metamask/money-account-api-data-service';
import type { Hex } from '@metamask/utils';
import { areAddressesEqual } from '../../../../util/address';
import { MUSD_DECIMALS, MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import type { AccountsApiActivity } from '../types/moneyActivity';

const TRANSACTION_HASH_PATTERN = /^0x[\da-f]{64}$/iu;
const DECIMAL_AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/u;

/**
 * Converts supported, settled service transfers to the existing completed
 * bank-transfer activity shape. Transfers without a confirmed mUSD settlement
 * hash are intentionally omitted; pending and failed activity stays with the
 * MUSD-1474 provider feed.
 *
 * @param transfers - Validated transfer records from the preview data service.
 * @param walletAddress - Active Money Account wallet address.
 * @returns Supported completed mUSD deposits, newest first.
 */
export function mapMoneyVbaTransfers(
  transfers: readonly VbaTransfer[],
  walletAddress: string,
): Extract<AccountsApiActivity, { kind: 'bank_transfer' }>[] {
  const mapped: Extract<AccountsApiActivity, { kind: 'bank_transfer' }>[] = [];
  const seen = new Set<string>();

  for (const item of transfers) {
    const { transfer } = item;
    if (
      item.status !== 'confirmed' ||
      transfer.asset.toLowerCase() !== 'musd' ||
      transfer.network.toLowerCase() !== 'monad' ||
      !areAddressesEqual(transfer.recipient_address, walletAddress) ||
      !transfer.transaction_hash ||
      !TRANSACTION_HASH_PATTERN.test(transfer.transaction_hash) ||
      !DECIMAL_AMOUNT_PATTERN.test(transfer.amount)
    ) {
      continue;
    }

    const amount = new BigNumber(transfer.amount);
    const minimalAmount = amount.shiftedBy(MUSD_DECIMALS);
    const time = Date.parse(item.event_timestamp);
    const hash = transfer.transaction_hash.toLowerCase();
    if (
      !amount.isFinite() ||
      !amount.isGreaterThan(0) ||
      !minimalAmount.isInteger() ||
      !Number.isFinite(time) ||
      seen.has(hash)
    ) {
      continue;
    }

    seen.add(hash);
    mapped.push({
      kind: 'bank_transfer',
      hash: hash as Hex,
      time,
      chainId: CHAIN_IDS.MONAD,
      token: {
        address: MUSD_TOKEN_ADDRESS as Hex,
        symbol: 'mUSD',
        decimals: MUSD_DECIMALS,
      },
      amount: minimalAmount.toFixed(0),
      receivedFrom: (transfer.sender_address?.toLowerCase() ??
        walletAddress.toLowerCase()) as Hex,
    });
  }

  return mapped.sort((a, b) => b.time - a.time || a.hash.localeCompare(b.hash));
}
