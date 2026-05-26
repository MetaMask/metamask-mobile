import {
  type TransactionMeta,
  TransactionType as EvmTransactionType,
} from '@metamask/transaction-controller';
import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { fromTokenMinimalUnit } from '../../../../util/number/bigint';
import { decodeTransferData } from '../../../../util/transactions';
import {
  isMusdTokenOnChain,
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

/**
 * Decoded ERC-20 transfer amount from `txParams.data` (decimal string), or
 * `undefined` if calldata is missing/truncated. `decodeTransferData` does not
 * throw on truncated input — it returns "NaN" — so length is checked first.
 */
function getErc20TransferAmount(tx: TransactionMeta): string | undefined {
  const data = tx.txParams?.data;
  if (!data) return undefined;
  try {
    if (
      tx.type === EvmTransactionType.tokenMethodTransfer &&
      data.length >= ERC20_TRANSFER_CALLDATA_LENGTH
    ) {
      const decoded = decodeTransferData('transfer', data) as string[];
      const amount = decoded[1];
      return Number.isFinite(Number(amount)) ? amount : undefined;
    }
    if (
      tx.type === EvmTransactionType.tokenMethodTransferFrom &&
      data.length >= ERC20_TRANSFER_FROM_CALLDATA_LENGTH
    ) {
      // transferFrom(address from, address to, uint256 amount) → amount at [2].
      const decoded = decodeTransferData('transferFrom', data) as string[];
      const amount = decoded[2];
      return Number.isFinite(Number(amount)) ? amount : undefined;
    }
    return undefined;
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
 * Resolves the token metadata for an mUSD `transfer`/`transferFrom`-style row,
 * preferring `transferInformation` (set by incoming polling + the standard
 * send flow) and falling back to decoded calldata + known mUSD constants for
 * locally-signed rows where `transferInformation` is not yet populated.
 * Returns `undefined` when the calldata is malformed/truncated or the tx isn't
 * an mUSD transfer on a supported chain.
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
    isMusdTokenOnChain(tx.txParams?.to, tx.chainId)
  ) {
    amount = amount ?? getErc20TransferAmount(tx);
    decimals = decimals ?? MUSD_DECIMALS;
    symbol = symbol ?? MUSD_TOKEN.symbol;
    contractAddress = contractAddress ?? tx.txParams?.to;
  }

  if (!amount || !symbol || decimals === undefined || !contractAddress) {
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
  const humanReadable = fromTokenMinimalUnit(meta.amount, meta.decimals);
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
