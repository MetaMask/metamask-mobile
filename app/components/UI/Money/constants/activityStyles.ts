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
import { decodeErc20Transfer } from '../../../../util/transactions/erc20-transfer';

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
    amount = amount ?? decodeErc20Transfer(tx.txParams?.data, tx.type)?.amount;
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
        decodeErc20Transfer(nestedMusdTransfer.data, nestedMusdTransfer.type)
          ?.amount;
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
