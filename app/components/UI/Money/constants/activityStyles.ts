import {
  type TransactionMeta,
  TransactionType as EvmTransactionType,
} from '@metamask/transaction-controller';
import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { fromTokenMinimalUnit } from '../../../../util/number';

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

/**
 * +/- prefix for Money rows backed by {@link TransactionMeta} (mUSD pegged 1:1 to USD).
 */
export function getMoneyAmountPrefixForTransactionMeta(
  tx: TransactionMeta,
): string {
  if (tx.type && OUTGOING_EVM_TYPES.includes(tx.type)) {
    return '-';
  }
  return '+';
}

/**
 * Formatted token amount from `transferInformation`, e.g. "+1,000.00 mUSD".
 */
export function getMusdDisplayAmountFromTransactionMeta(
  tx: TransactionMeta,
): string {
  const ti = tx.transferInformation;
  if (!ti?.amount || !ti.symbol) return '';
  if (ti.decimals === undefined) return '';
  const humanReadable = fromTokenMinimalUnit(ti.amount, ti.decimals);
  const num = parseFloat(humanReadable);
  if (isNaN(num)) return '';
  const prefix = getMoneyAmountPrefixForTransactionMeta(tx);
  return `${prefix}${formatNumber(num)} ${ti.symbol}`;
}

export function isIncomingMoneyTransactionMeta(tx: TransactionMeta): boolean {
  const t = tx.type;
  if (!t) return false;
  return (
    t === EvmTransactionType.incoming ||
    t === EvmTransactionType.moneyAccountDeposit ||
    t === EvmTransactionType.musdConversion
  );
}
