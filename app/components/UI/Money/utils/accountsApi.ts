import type { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { areAddressesEqual } from '../../../../util/address';
import {
  isMusdTokenOnChain,
  MUSD_MONEY_ACCOUNT_CHAIN_IDS,
} from '../../Earn/constants/musd';
import type { AccountsApiActivity } from '../types/moneyActivity';

export const METAMASK_CARD_PAYMENT_TYPE = 'METAMASK_CARD_PAYMENT';
export const METAMASK_CARD_CASHBACK_TYPE = 'METAMASK_CARD_CASHBACK';

/**
 * Baanx card-cashback multisend contracts observed on Monad and Linea.
 * Temporary client-side signal until Accounts API assigns
 * `METAMASK_CARD_CASHBACK`.
 */
const CARD_CASHBACK_MULTISEND_TARGETS: readonly string[] = [
  '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
  '0xA90b298d05C2667dDC64e2A4e17111357c215dD2',
  '0x40A695A16C213afEf1c87Fd471Fb73157b948f3f',
  '0x144c1cE815Bd1Eb71678978fE8641cC4e3fd59e6',
  '0xC7f1b2228fbf28451c7bf791C4f610111f0f32cb',
];

/** `multiSend` entrypoint on card-cashback payout transactions. */
const CARD_CASHBACK_MULTISEND_METHOD_ID = '0x0d49b711';

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
  /** Contract call selector, e.g. multisend `0x0d49b711`. */
  methodId?: string;
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
    if (isCashbackTransaction(tx)) {
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

function hasMusdValueTransfer(tx: AccountsApiTransaction): boolean {
  const chainId = parseChainId(tx.chainId);
  if (!chainId) {
    return false;
  }
  return (tx.valueTransfers ?? []).some((vt) =>
    isMusdTokenOnChain(vt.contractAddress, chainId),
  );
}

function isCashbackMultisendTarget(to: string): boolean {
  return CARD_CASHBACK_MULTISEND_TARGETS.some((addr) =>
    areAddressesEqual(to, addr),
  );
}

/**
 * Classify card-cashback rows. Uses the Accounts API type when present;
 * otherwise falls back to Baanx multisend heuristics (mUSD payout via a
 * known multisend contract).
 */
function isCashbackTransaction(tx: AccountsApiTransaction): boolean {
  if (tx.isError) {
    return false;
  }
  if (tx.transactionType === METAMASK_CARD_CASHBACK_TYPE) {
    return true;
  }
  if (tx.transactionType === METAMASK_CARD_PAYMENT_TYPE) {
    return false;
  }
  if (!parseChainId(tx.chainId)) {
    return false;
  }
  if (!isCashbackMultisendTarget(tx.to) || !hasMusdValueTransfer(tx)) {
    return false;
  }
  if (
    tx.methodId &&
    tx.methodId.toLowerCase() !==
      CARD_CASHBACK_MULTISEND_METHOD_ID.toLowerCase()
  ) {
    return false;
  }
  return true;
}
