import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Transaction, TransactionType } from '@metamask/keyring-api';
import type { ThemeColors } from '@metamask/design-tokens';
import {
  type TransactionMeta,
  TransactionType as EvmTransactionType,
} from '@metamask/transaction-controller';
import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { fromTokenMinimalUnit } from '../../../../util/number';

export const moneyActivityItemStyles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  } as ViewStyle,
});

/**
 * Builds Money activity text style overrides per the design spec.
 *
 * Title:      Body/Md/Medium  (16 px, weight 500)
 * Amount:     Body/Md/Medium  (16 px, weight 500, success-default for receives)
 * FiatAmount: Body/Sm/Medium  (14 px, weight 500, text-alternative)
 */
export const getMoneyActivityTextStyles = (
  colors: ThemeColors,
  transactionType?: string,
): {
  title: TextStyle;
  amount: TextStyle;
  fiatAmount: TextStyle;
} => {
  const isReceive =
    transactionType === TransactionType.Receive ||
    transactionType === TransactionType.Swap;

  return {
    title: {
      fontSize: 16,
      fontWeight: '500',
    },
    amount: {
      fontSize: 16,
      fontWeight: '500',
      color: isReceive ? colors.success.default : colors.text.default,
    },
    fiatAmount: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.alternative,
      textTransform: 'none',
    },
  };
};

function getMusdAmount(transaction: Transaction): {
  num: number;
  unit: string;
  prefix: string;
} | null {
  const isSend = transaction.type === TransactionType.Send;
  const asset = isSend ? transaction.from[0]?.asset : transaction.to[0]?.asset;

  if (!asset?.amount) return null;

  const num = parseFloat(asset.amount);
  if (isNaN(num)) return null;

  return { num, unit: asset.unit, prefix: isSend ? '-' : '+' };
}

function formatNumber(num: number): string {
  return getIntlNumberFormatter(I18n.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(num);
}

/**
 * Formatted token amount with +/- sign, e.g. "+1,000.00 mUSD".
 */
export const getMusdDisplayAmount = (transaction: Transaction): string => {
  const parsed = getMusdAmount(transaction);
  if (!parsed) return '';
  return `${parsed.prefix}${formatNumber(parsed.num)} ${parsed.unit}`;
};

/**
 * Formatted fiat amount with +/- sign, e.g. "+$1,000.00".
 * mUSD is pegged 1:1 to USD.
 */
export const getMusdFiatAmount = (transaction: Transaction): string => {
  const parsed = getMusdAmount(transaction);
  if (!parsed) return '';
  return `${parsed.prefix}$${formatNumber(parsed.num)}`;
};

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
    t === EvmTransactionType.musdConversion ||
    t === EvmTransactionType.swap
  );
}
