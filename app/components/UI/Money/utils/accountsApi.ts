import type { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { areAddressesEqual } from '../../../../util/address';
import { MUSD_MONEY_ACCOUNT_CHAIN_IDS } from '../../Earn/constants/musd';
import type { AccountsApiActivity } from '../types/moneyActivity';

export const METAMASK_CARD_PAYMENT_TYPE = 'METAMASK_CARD_PAYMENT';
export const METAMASK_CARD_CASHBACK_TYPE = 'METAMASK_CARD_CASHBACK';

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

/** The leg that leaves the money account — a card spend's settlement. */
function outboundTransfer(
  tx: AccountsApiTransaction,
  moneyAddress: string,
): AccountsApiValueTransfer | undefined {
  return (tx.valueTransfers ?? []).find((vt) =>
    areAddressesEqual(vt.from, moneyAddress),
  );
}

/** The leg that credits the money account — a cashback reward. */
function inboundTransfer(
  tx: AccountsApiTransaction,
  moneyAddress: string,
): AccountsApiValueTransfer | undefined {
  return (tx.valueTransfers ?? []).find((vt) =>
    areAddressesEqual(vt.to, moneyAddress),
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

/** The fields shared by card and cashback rows. */
interface ParsedSettlement {
  hash: Hex;
  time: number;
  chainId: Hex;
  token: { address: Hex; symbol: string; decimals: number };
  amount: string;
}

function parseSettlement(
  tx: AccountsApiTransaction,
  transfer: AccountsApiValueTransfer | undefined,
): ParsedSettlement | undefined {
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
    return undefined;
  }
  return {
    hash: tx.hash as Hex,
    time,
    chainId,
    token: {
      address: transfer.contractAddress as Hex,
      symbol: transfer.symbol,
      decimals: transfer.decimal,
    },
    amount: transfer.amount,
  };
}

/**
 * Parse the latest Accounts-API page into Money activity rows.
 **/
export function parseAccountsApiActivity(
  response: AccountsApiTransactionsResponse,
  moneyAddress: string,
): AccountsApiActivity[] {
  return (response.data ?? []).flatMap((tx): AccountsApiActivity[] => {
    if (tx.transactionType === METAMASK_CARD_PAYMENT_TYPE) {
      const transfer = outboundTransfer(tx, moneyAddress);
      const parsed = parseSettlement(tx, transfer);
      if (!parsed || !transfer) {
        return [];
      }
      return [{ ...parsed, kind: 'card', paidTo: transfer.to as Hex }];
    }
    if (tx.transactionType === METAMASK_CARD_CASHBACK_TYPE) {
      const transfer = inboundTransfer(tx, moneyAddress);
      const parsed = parseSettlement(tx, transfer);
      if (!parsed || !transfer) {
        return [];
      }
      return [
        { ...parsed, kind: 'cashback', receivedFrom: transfer.from as Hex },
      ];
    }
    return [];
  });
}
