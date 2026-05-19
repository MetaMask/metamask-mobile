import {
  type TransactionMeta,
  TransactionType as EvmTransactionType,
} from '@metamask/transaction-controller';
import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { fromTokenMinimalUnit } from '../../../../util/number/bigint';
import { decodeTransferData } from '../../../../util/transactions';
import {
  isMusdToken,
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

/**
 * Decoded ERC-20 transfer amount from `txParams.data` (decimal string), or
 * `undefined` if calldata is missing or malformed.
 */
function getErc20TransferAmount(tx: TransactionMeta): string | undefined {
  const data = tx.txParams?.data;
  if (!data) return undefined;
  try {
    const decoded = decodeTransferData('transfer', data) as string[];
    return decoded[1];
  } catch {
    return undefined;
  }
}

/**
 * Formatted token amount, e.g. "+1,000.00 mUSD". Prefers `transferInformation`
 * (populated by incoming polling and the standard send flow); for locally-signed
 * mUSD `tokenMethodTransfer` it falls back to decoding `txParams.data` with
 * known mUSD metadata.
 */
export function getMusdDisplayAmountFromTransactionMeta(
  tx: TransactionMeta,
): string {
  let amount = tx.transferInformation?.amount;
  let decimals = tx.transferInformation?.decimals;
  let symbol = tx.transferInformation?.symbol;

  if (
    (!amount || !symbol || decimals === undefined) &&
    tx.type === EvmTransactionType.tokenMethodTransfer &&
    isMusdToken(tx.txParams?.to)
  ) {
    amount = amount ?? getErc20TransferAmount(tx);
    decimals = decimals ?? MUSD_DECIMALS;
    symbol = symbol ?? MUSD_TOKEN.symbol;
  }

  if (!amount || !symbol) return '';
  if (decimals === undefined) return '';
  const humanReadable = fromTokenMinimalUnit(amount, decimals);
  const num = parseFloat(humanReadable);
  if (isNaN(num)) return '';
  const prefix = getMoneyAmountPrefixForTransactionMeta(tx);
  return `${prefix}${formatNumber(num)} ${symbol}`;
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
