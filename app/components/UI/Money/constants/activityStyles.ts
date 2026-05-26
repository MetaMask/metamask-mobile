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
const ERC20_TRANSFER_CALLDATA_LENGTH = 138;
// `0x` + 8 hex chars selector + 3 × 64 hex chars (from, to, uint256).
const ERC20_TRANSFER_FROM_CALLDATA_LENGTH = 202;
// Slot offsets into calldata (chars). 10 = `0x` + 8-char selector; each slot
// is 64 chars (32 bytes). transfer: [recipient, amount]. transferFrom:
// [from, to, amount].
const TRANSFER_AMOUNT_START = 10 + 64;
const TRANSFER_AMOUNT_END = 10 + 64 + 64;
const TRANSFER_FROM_AMOUNT_START = 10 + 64 + 64;
const TRANSFER_FROM_AMOUNT_END = 10 + 64 + 64 + 64;

/**
 * Decoded ERC-20 transfer amount from `txParams.data` (decimal string), or
 * `undefined` if calldata is missing/truncated/non-hex. We slice the uint256
 * slot ourselves and parse with `BigInt` to avoid the precision loss in
 * `decodeTransferData`'s `parseInt(slot, 16)` (which truncates above 2^53).
 */
function getErc20TransferAmount(tx: TransactionMeta): string | undefined {
  const data = tx.txParams?.data;
  if (!data) return undefined;
  let slot: string | undefined;
  if (
    tx.type === EvmTransactionType.tokenMethodTransfer &&
    data.length >= ERC20_TRANSFER_CALLDATA_LENGTH
  ) {
    slot = data.substring(TRANSFER_AMOUNT_START, TRANSFER_AMOUNT_END);
  } else if (
    tx.type === EvmTransactionType.tokenMethodTransferFrom &&
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
 * `transferInformation` is not yet populated. Returns `undefined` when the
 * row isn't mUSD on a Money Account chain or the calldata is malformed.
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
    amount = amount ?? getErc20TransferAmount(tx);
    decimals = decimals ?? MUSD_DECIMALS;
    symbol = symbol ?? MUSD_TOKEN.symbol;
    contractAddress = contractAddress ?? tx.txParams?.to;
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
