import BigNumber from 'bignumber.js';
import { safeParseBigNumber } from '../../../../../util/number/bignumber';

const CURRENCY_DISPLAY_MAP: Record<string, string> = {
  musd: 'mUSD',
  usdc: 'USDC',
  usdt: 'USDT',
};

export const DISPLAY_PRECISION = 4;
const DISPLAY_SCALE = 10 ** DISPLAY_PRECISION;
const ZERO = new BigNumber(0);

export const formatCurrency = (raw: string): string =>
  CURRENCY_DISPLAY_MAP[raw.toLowerCase()] ?? raw.toUpperCase();

export const formatAmount = (value: string | number): string => {
  const parsedValue = safeParseBigNumber(value);
  if (!parsedValue.isFinite()) return '0.00';
  const truncated = parsedValue.decimalPlaces(
    DISPLAY_PRECISION,
    BigNumber.ROUND_FLOOR,
  );
  const formatted = truncated.toFixed(DISPLAY_PRECISION).replace(/0{1,2}$/, '');
  return formatted;
};

const roundFeeUpToDisplayPrecision = (fee: string | number): BigNumber => {
  const parsedFee = safeParseBigNumber(fee);
  if (!parsedFee.isFinite() || parsedFee.lte(0)) {
    return ZERO;
  }
  return parsedFee.decimalPlaces(DISPLAY_PRECISION, BigNumber.ROUND_CEIL);
};

export const roundFeeUp = (fee: string | number): number =>
  roundFeeUpToDisplayPrecision(fee).toNumber();

export const floorToDisplayPrecision = (value: number): number => {
  const parsedValue = safeParseBigNumber(value);
  if (!parsedValue.isFinite() || parsedValue.lte(0)) {
    return 0;
  }
  return parsedValue
    .decimalPlaces(DISPLAY_PRECISION, BigNumber.ROUND_FLOOR)
    .toNumber();
};

export interface CashbackWithdrawalAmounts {
  roundedFeeNum: number;
  expectedToReceiveNumber: number;
  hasInsufficientBalance: boolean;
}

export const getCashbackWithdrawalAmounts = (
  balance: string,
  feePrice: string,
): CashbackWithdrawalAmounts => {
  const parsedBalance = safeParseBigNumber(balance);
  const safeBalance =
    parsedBalance.isFinite() && parsedBalance.gt(0) ? parsedBalance : ZERO;
  const roundedFee = roundFeeUpToDisplayPrecision(feePrice);
  const roundedFeeNum = roundedFee.toNumber();
  const expectedToReceive = safeBalance.minus(roundedFee);
  const expectedToReceiveNumber = expectedToReceive.gt(0)
    ? expectedToReceive
        .decimalPlaces(DISPLAY_PRECISION, BigNumber.ROUND_FLOOR)
        .toNumber()
    : 0;
  const hasInsufficientBalance =
    safeBalance.lte(0) ||
    safeBalance.lte(roundedFee) ||
    expectedToReceiveNumber <= 0;

  return {
    roundedFeeNum,
    expectedToReceiveNumber,
    hasInsufficientBalance,
  };
};
