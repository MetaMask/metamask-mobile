interface PositionSizeParams {
  amount: string;
  price: number;
  szDecimals?: number;
}

interface MarginRequiredParams {
  amount: string;
  leverage: number;
}

/**
 * Calculate position size based on USD amount and asset price
 * Uses Math.ceil to ensure orders meet minimum USD requirements
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
  // Math.ceil prevents orders from falling below minimum USD requirements
  // HL chooses the order size closest to the usd value on the low end
  // We instead choose the order size closest to the usd value on the high end
  // i.e. $10, $11, $12 may equate to the same order size
  const rounded = Math.ceil(positionSize * multiplier) / multiplier;

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

interface OptimalAmountParams {
  targetAmount: string;
  price: number;
  szDecimals?: number;
}

/**
 * Find the optimal (highest) USD amount that results in the same position size
 * as the target amount. This maximizes the USD value while maintaining the same
 * position size due to rounding behavior.
 *
 * For example, if $10, $11, and $12 all result in the same position size of 0.0500,
 * this function will return $12 as the optimal amount.
 *
 * @param params - Target amount, asset price, and optional decimal precision
 * @returns Optimal USD amount as string
 */
export function findOptimalAmount(params: OptimalAmountParams): string {
  const { targetAmount, price, szDecimals = 6 } = params;
  const targetAmountNum = parseFloat(targetAmount || '0');

  if (
    isNaN(targetAmountNum) ||
    isNaN(price) ||
    targetAmountNum === 0 ||
    price === 0
  ) {
    return targetAmount;
  }

  // Calculate the position size for the target amount
  const targetPositionSize = calculatePositionSize({
    amount: targetAmount,
    price,
    szDecimals,
  });

  // If position size is 0, return original amount
  if (parseFloat(targetPositionSize) === 0) {
    return targetAmount;
  }

  // Calculate the exact USD value that would result in this position size
  const positionSizeNum = parseFloat(targetPositionSize);
  const exactUsdValue = positionSizeNum * price;

  // Find the range of USD values that result in the same position size
  // We'll check backwards from the exact value to find the lower bound
  const multiplier = Math.pow(10, szDecimals);
  const lowerBoundPositionSize =
    (Math.ceil(positionSizeNum * multiplier) - 1) / multiplier;
  const lowerBoundUsd = lowerBoundPositionSize * price;

  // The optimal amount is just below the point where it would round up to the next position size
  // We use a small epsilon to ensure we stay within the same rounding bucket
  const epsilon = 0.01; // 1 cent precision
  const optimalAmount = exactUsdValue - epsilon;

  // Ensure we don't go below the lower bound
  const finalAmount = Math.max(optimalAmount, lowerBoundUsd);

  // Verify that this amount actually produces the same position size
  const verificationPositionSize = calculatePositionSize({
    amount: finalAmount.toFixed(2),
    price,
    szDecimals,
  });

  // If verification fails, return the original amount
  if (verificationPositionSize !== targetPositionSize) {
    return targetAmount;
  }

  return finalAmount.toFixed(0);
}
