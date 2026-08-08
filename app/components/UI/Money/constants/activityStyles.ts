import {
  type TransactionMeta,
  TransactionType as EvmTransactionType,
} from '@metamask/transaction-controller';
import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { fromTokenMinimalUnit } from '../../../../util/number/bigint';
import {
  isMusdOnMoneyAccountChain,
  MUSD_DECIMALS,
  MUSD_TOKEN,
} from '../../Earn/constants/musd';
import { isPerpsPredictMoneyWithdraw } from '../utils/moneyTransactionGuards';

function formatNumber(num: number): string {
  return getIntlNumberFormatter(I18n.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(num);
}

const OUTGOING_EVM_TYPES: EvmTransactionType[] = [
  EvmTransactionType.moneyAccountWithdraw,
  EvmTransactionType.simpleSend,
];

function hasOutgoingNestedType(tx: TransactionMeta): boolean {
  return (
    tx.nestedTransactions?.some(
      (nested) => nested.type && OUTGOING_EVM_TYPES.includes(nested.type),
    ) ?? false
  );
}

/**
 * +/- prefix for Money rows backed by {@link TransactionMeta} (mUSD pegged 1:1 to USD).
 */
export function getMoneyAmountPrefixForTransactionMeta(
  tx: TransactionMeta,
): string {
  if (
    (tx.type && OUTGOING_EVM_TYPES.includes(tx.type)) ||
    hasOutgoingNestedType(tx)
  ) {
    return '-';
  }
  return '+';
}

// `0x` + 8 hex chars selector + 64 hex chars (address) + 64 hex chars (uint256).
export const ERC20_TRANSFER_CALLDATA_LENGTH = 138;
// `0x` + 8 hex chars selector + 3 × 64 hex chars (from, to, uint256).
export const ERC20_TRANSFER_FROM_CALLDATA_LENGTH = 202;
// Slot offsets into calldata (chars). 10 = `0x` + 8-char selector; each slot
// is 64 chars (32 bytes). transfer: [recipient, amount]. transferFrom:
// [from, to, amount].
const TRANSFER_AMOUNT_START = 10 + 64;
const TRANSFER_AMOUNT_END = 10 + 64 + 64;
const TRANSFER_FROM_AMOUNT_START = 10 + 64 + 64;
const TRANSFER_FROM_AMOUNT_END = 10 + 64 + 64 + 64;

/**
 * Decoded ERC-20 transfer amount from calldata (decimal string), or
 * `undefined` if calldata is missing/truncated/non-hex. We slice the uint256
 * slot ourselves and parse with `BigInt` to avoid the precision loss in
 * `decodeTransferData`'s `parseInt(slot, 16)` (which truncates above 2^53).
 */
function decodeErc20TransferAmount(
  data: string | undefined,
  type: EvmTransactionType | undefined,
): string | undefined {
  if (!data) return undefined;
  let slot: string | undefined;
  if (
    type === EvmTransactionType.tokenMethodTransfer &&
    data.length >= ERC20_TRANSFER_CALLDATA_LENGTH
  ) {
    slot = data.substring(TRANSFER_AMOUNT_START, TRANSFER_AMOUNT_END);
  } else if (
    type === EvmTransactionType.tokenMethodTransferFrom &&
    data.length >= ERC20_TRANSFER_FROM_CALLDATA_LENGTH
  ) {
    slot = data.substring(TRANSFER_FROM_AMOUNT_START, TRANSFER_FROM_AMOUNT_END);
  }
  if (!slot) return undefined;
  try {
    return BigInt(`0x${slot}`).toString();
  } catch {
    return undefined;
  }
}

export interface ResolvedMusdTransferMeta {
  amount: string;
  decimals: number;
  symbol: string;
  contractAddress: string;
}

/**
 * Resolves the token metadata for an mUSD `transfer`/`transferFrom`/`incoming`
 * row on a Money Account chain, preferring `transferInformation` (set by
 * incoming polling + the standard send flow) and falling back to decoded
 * calldata + known mUSD constants for locally-signed rows where
 * `transferInformation` is not yet populated. For EIP-7702 batches (e.g.
 * Money Account withdrawals), scans `nestedTransactions` for the inner mUSD
 * ERC-20 transfer and decodes its calldata. Returns `undefined` when the row
 * isn't mUSD on a Money Account chain or the calldata is malformed.
 *
 * Enforced precondition matters even though current callers pre-filter — the
 * name promises "mUSD" semantics and downstream code (e.g. the peg-fiat path)
 * must not be applied to other tokens.
 */
export function resolveMusdTransferMeta(
  tx: TransactionMeta,
): ResolvedMusdTransferMeta | undefined {
  const ti = tx.transferInformation;
  let amount = ti?.amount;
  let decimals = ti?.decimals;
  let symbol = ti?.symbol;
  let contractAddress = ti?.contractAddress;

  const isErc20TransferType =
    tx.type === EvmTransactionType.tokenMethodTransfer ||
    tx.type === EvmTransactionType.tokenMethodTransferFrom;

  if (
    (!amount || !symbol || decimals === undefined || !contractAddress) &&
    isErc20TransferType &&
    isMusdOnMoneyAccountChain(tx.txParams?.to, tx.chainId)
  ) {
    amount = amount ?? decodeErc20TransferAmount(tx.txParams?.data, tx.type);
    decimals = decimals ?? MUSD_DECIMALS;
    symbol = symbol ?? MUSD_TOKEN.symbol;
    contractAddress = contractAddress ?? tx.txParams?.to;
  }

  if (
    (!amount || !symbol || decimals === undefined || !contractAddress) &&
    tx.type === EvmTransactionType.batch
  ) {
    const nestedMusdTransfer = tx.nestedTransactions?.find(
      (nested) =>
        (nested.type === EvmTransactionType.tokenMethodTransfer ||
          nested.type === EvmTransactionType.tokenMethodTransferFrom) &&
        isMusdOnMoneyAccountChain(nested.to, tx.chainId),
    );
    if (nestedMusdTransfer) {
      amount =
        amount ??
        decodeErc20TransferAmount(
          nestedMusdTransfer.data,
          nestedMusdTransfer.type,
        );
      decimals = decimals ?? MUSD_DECIMALS;
      symbol = symbol ?? MUSD_TOKEN.symbol;
      contractAddress = contractAddress ?? nestedMusdTransfer.to;
    }
  }

  if (!amount || !symbol || decimals === undefined || !contractAddress) {
    return undefined;
  }
  if (!isMusdOnMoneyAccountChain(contractAddress, tx.chainId)) {
    return undefined;
  }
  return { amount, decimals, symbol, contractAddress };
}

/**
 * Formatted token amount, e.g. "+1,000.00 mUSD". See {@link resolveMusdTransferMeta}.
 */
export function getMusdDisplayAmountFromTransactionMeta(
  tx: TransactionMeta,
): string {
  const meta = resolveMusdTransferMeta(tx);
  if (!meta) return '';
  // `isRounding = false` keeps the BigInt-decoded amount precise — the default
  // `Number()` cast would lose precision for amounts above 2^53 minimal units.
  const humanReadable = fromTokenMinimalUnit(meta.amount, meta.decimals, false);
  const num = parseFloat(humanReadable);
  if (isNaN(num)) return '';
  const prefix = getMoneyAmountPrefixForTransactionMeta(tx);
  return `${prefix}${formatNumber(num)} ${meta.symbol}`;
}

export function isIncomingMoneyTransactionMeta(tx: TransactionMeta): boolean {
  if (isPerpsPredictMoneyWithdraw(tx)) {
    return true;
  }

  const t = tx.type;
  if (
    t === EvmTransactionType.incoming ||
    t === EvmTransactionType.moneyAccountDeposit ||
    t === EvmTransactionType.tokenMethodTransfer ||
    t === EvmTransactionType.tokenMethodTransferFrom
  ) {
    return true;
  }

  // EIP-7702 batch deposits: moneyAccountDeposit sits in nestedTransactions
  return (
    tx.nestedTransactions?.some(
      (nested) => nested.type === EvmTransactionType.moneyAccountDeposit,
    ) ?? false
  );
}
