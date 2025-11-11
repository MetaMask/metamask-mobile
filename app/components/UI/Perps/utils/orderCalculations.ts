interface PositionSizeParams {
  amount: string;
  price: number;
  szDecimals?: number;
}

interface MarginRequiredParams {
  amount: string;
  leverage: number;
}

interface MaxAllowedAmountParams {
  availableBalance: number;
  assetPrice: number;
  assetSzDecimals: number;
  leverage: number;
}

/**
 * Calculate position size based on USD amount and asset price
 * @param params - Amount in USD, current asset price, and optional decimal precision
 * @returns Position size formatted to the asset's decimal precision
 */
export function calculatePositionSize(params: PositionSizeParams): string {
  const { amount, price, szDecimals = 6 } = params;
  const amountNum = parseFloat(amount || '0');

  if (isNaN(amountNum) || isNaN(price) || amountNum === 0 || price === 0) {
    return (0).toFixed(szDecimals);
  }

  const positionSize = amountNum / price;
  const multiplier = Math.pow(10, szDecimals);
  const rounded = Math.round(positionSize * multiplier) / multiplier;

  return rounded.toFixed(szDecimals);
}

/**
 * Calculate margin required for a position
 * @param params - Position amount and leverage
 * @returns Margin required formatted to 2 decimal places
 */
export function calculateMarginRequired(params: MarginRequiredParams): string {
  const { amount, leverage } = params;
  const amountNum = parseFloat(amount || '0');

  if (
    isNaN(amountNum) ||
    isNaN(leverage) ||
    amountNum === 0 ||
    leverage === 0
  ) {
    return '0.00';
  }

  return (amountNum / leverage).toFixed(2);
}

export function getMaxAllowedAmount(params: MaxAllowedAmountParams): number {
  const { availableBalance, assetPrice, assetSzDecimals, leverage } = params;
  if (availableBalance === 0 || !assetPrice || assetSzDecimals === undefined) {
    return 0;
  }

  // The theoretical maximum is simply availableBalance * leverage
  const theoreticalMax = availableBalance * leverage;

  // But we need to account for position size rounding
  // Find the largest whole dollar amount that fits within this limit
  let maxAmount = Math.floor(theoreticalMax);

  // Verify this amount doesn't exceed available balance after rounding
  const testPositionSize = calculatePositionSize({
    amount: maxAmount.toString(),
    price: assetPrice,
    szDecimals: assetSzDecimals,
  });

  const actualNotionalValue = parseFloat(testPositionSize) * assetPrice;
  const requiredMargin = actualNotionalValue / leverage;

  // If rounding caused us to exceed available balance, step down by one position increment
  if (requiredMargin > availableBalance) {
    const minPositionSizeIncrement = 1 / Math.pow(10, assetSzDecimals);
    const positionSizeIncrementUsd = Math.ceil(
      minPositionSizeIncrement * assetPrice,
    );
    maxAmount -= positionSizeIncrementUsd;
  }

  return Math.max(0, maxAmount);
}
