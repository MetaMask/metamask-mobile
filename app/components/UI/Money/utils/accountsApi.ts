import type { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { areAddressesEqual } from '../../../../util/address';
import { MUSD_MONEY_ACCOUNT_CHAIN_IDS } from '../../Earn/constants/musd';
import type { CardTransaction } from '../types/moneyActivity';

export const METAMASK_CARD_PAYMENT_TYPE = 'METAMASK_CARD_PAYMENT';

const ALLOWED_CHAIN_IDS = new Set(
  MUSD_MONEY_ACCOUNT_CHAIN_IDS.map((c) => c.toLowerCase()),
);

interface AccountsApiValueTransfer {
  contractAddress: string;
  symbol: string;
  decimal: number;
  from: string;
  to: string;
  amount: string;
}

interface AccountsApiTransaction {
  hash: string;
  /** ISO-8601, e.g. "2026-06-04T11:53:51.000Z". */
  timestamp: string;
  chainId: number;
  from: string;
  to: string;
  isError?: boolean;
  /** API-assigned category, e.g. "METAMASK_CARD_PAYMENT". */
  transactionType?: string;
  valueTransfers?: AccountsApiValueTransfer[];
}

interface AccountsApiTransactionsResponse {
  data?: AccountsApiTransaction[];
  pageInfo?: { count: number; hasNextPage: boolean; cursor?: string };
}

function settlementTransfer(
  tx: AccountsApiTransaction,
  moneyAddress: string,
): AccountsApiValueTransfer | undefined {
  return (tx.valueTransfers ?? []).find((vt) =>
    areAddressesEqual(vt.from, moneyAddress),
  );
}

/** A minimal-unit token amount on the wire: a non-empty string of digits. */
const AMOUNT_PATTERN = /^\d+$/u;

function parseChainId(chainId: unknown): Hex | undefined {
  if (
    typeof chainId !== 'number' ||
    !Number.isInteger(chainId) ||
    chainId < 0
  ) {
    return undefined;
  }
  const hex = toHex(chainId);
  return ALLOWED_CHAIN_IDS.has(hex.toLowerCase()) ? hex : undefined;
}

export function parseCardTransactions(
  response: AccountsApiTransactionsResponse,
  moneyAddress: string,
): CardTransaction[] {
  return (response.data ?? [])
    .filter((tx) => tx.transactionType === METAMASK_CARD_PAYMENT_TYPE)
    .flatMap((tx): CardTransaction[] => {
      const transfer = settlementTransfer(tx, moneyAddress);
      const time = new Date(tx.timestamp).getTime();
      const chainId = parseChainId(tx.chainId);
      if (
        !tx.hash ||
        !transfer ||
        Number.isNaN(time) ||
        !chainId ||
        !Number.isInteger(transfer.decimal) ||
        transfer.decimal < 0 ||
        typeof transfer.amount !== 'string' ||
        !AMOUNT_PATTERN.test(transfer.amount)
      ) {
        return [];
      }
      return [
        {
          hash: tx.hash as Hex,
          time,
          chainId,
          token: {
            address: transfer.contractAddress as Hex,
            symbol: transfer.symbol,
            decimals: transfer.decimal,
          },
          amount: transfer.amount,
          to: transfer.to as Hex,
        },
      ];
    });
}
