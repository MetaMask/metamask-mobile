const CURRENCY_DISPLAY_MAP: Record<string, string> = {
  musd: 'mUSD',
  usdc: 'USDC',
  usdt: 'USDT',
};

export const DISPLAY_PRECISION = 4;
const DISPLAY_SCALE = 10 ** DISPLAY_PRECISION;

export const formatCurrency = (raw: string): string =>
  CURRENCY_DISPLAY_MAP[raw.toLowerCase()] ?? raw.toUpperCase();

export const formatAmount = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '0.00';
  const truncated = Math.floor(num * DISPLAY_SCALE) / DISPLAY_SCALE;
  const formatted = truncated.toFixed(DISPLAY_PRECISION).replace(/0{1,2}$/, '');
  return formatted;
};

export const roundFeeUp = (fee: number): number => {
  if (Number.isNaN(fee) || fee <= 0) {
    return 0;
  }
  return Math.ceil(fee * DISPLAY_SCALE) / DISPLAY_SCALE;
};

export const floorToDisplayPrecision = (value: number): number => {
  if (Number.isNaN(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value * DISPLAY_SCALE) / DISPLAY_SCALE;
};

const toCanonicalAmountString = (value: number): string => {
  const floored = floorToDisplayPrecision(value);
  if (floored === 0) {
    return '0';
  }
  return floored.toFixed(DISPLAY_PRECISION).replace(/\.?0+$/, '');
};

export interface CashbackWithdrawalAmounts {
  roundedFee: string;
  roundedFeeNum: number;
  netAmount: string;
  netAmountNumber: number;
  hasInsufficientBalance: boolean;
}

export const getCashbackWithdrawalAmounts = (
  balance: string,
  feePrice: string,
): CashbackWithdrawalAmounts => {
  const balanceNum = parseFloat(balance);
  const feeNum = parseFloat(feePrice);
  const safeBalance = Number.isNaN(balanceNum) ? 0 : balanceNum;
  const roundedFeeNum = roundFeeUp(Number.isNaN(feeNum) ? 0 : feeNum);
  const netAmountNumber = floorToDisplayPrecision(
    Math.max(0, safeBalance - roundedFeeNum),
  );
  const hasInsufficientBalance =
    safeBalance <= 0 || safeBalance <= roundedFeeNum || netAmountNumber <= 0;

  return {
    roundedFee: toCanonicalAmountString(roundedFeeNum),
    roundedFeeNum,
    netAmount: toCanonicalAmountString(netAmountNumber),
    netAmountNumber,
    hasInsufficientBalance,
  };
};
