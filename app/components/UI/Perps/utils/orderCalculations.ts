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
  maxAllowedAmount: number;
  price: number;
  szDecimals?: number;
  sizeDown?: boolean;
}

interface HighestAmountForPositionSizeParams {
  positionSize: number;
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
 * When sizeDown=true, it finds the optimal amount for the next position size down.
 * For example, if target amount results in position size 0.0500, with sizeDown=true
 * it will find the optimal amount for position size 0.0499 (one increment smaller).
 *
 * @param params - Target amount, asset price, optional decimal precision, and sizeDown flag
 * @returns Optimal USD amount as string
 */
export function findOptimalAmount(params: OptimalAmountParams): string {
  const { targetAmount, price, szDecimals = 6, maxAllowedAmount } = params;

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

  let positionSizeNum = parseFloat(targetPositionSize);
  const multiplier = Math.pow(10, szDecimals);

  let highestAmount = findHighestAmountForPositionSize({
    positionSize: positionSizeNum,
    price,
    szDecimals,
  });

  if (highestAmount === -1) {
    return targetAmount;
  }

  if (highestAmount > maxAllowedAmount) {
    const decrementedPositionSize =
      (Math.ceil(positionSizeNum * multiplier) - 1) / multiplier;

    // If the decremented position size would be 0 or negative, return original amount
    if (decrementedPositionSize <= 0) {
      return '0';
    }

    positionSizeNum = decrementedPositionSize;
    highestAmount = findHighestAmountForPositionSize({
      positionSize: positionSizeNum,
      price,
      szDecimals,
    });

    if (highestAmount === -1) {
      return targetAmount;
    }
  }

  return highestAmount.toString();
}

export function findHighestAmountForPositionSize(
  params: HighestAmountForPositionSizeParams,
): number {
  const { positionSize, price, szDecimals = 6 } = params;
  // Calculate the exact USD value that would result in this position size
  const exactUsdValue = Math.ceil(positionSize * price);

  // Find the optimal USD amount for this position size
  // We want to find the highest amount that still rounds to this position size
  let finalAmount = exactUsdValue;
  const multiplier = Math.pow(10, szDecimals);

  // Search for the highest amount that produces the target position size
  // Start from the exact value and increment until we find the boundary
  for (
    let testAmount = exactUsdValue;
    testAmount <= exactUsdValue + price / multiplier;
    testAmount += 1
  ) {
    const testPositionSize = calculatePositionSize({
      amount: testAmount.toString(),
      price,
      szDecimals,
    });

    // If we've crossed over the boundary somehow, return the last valid amount
    // ensure we can break out of the loop
    if (testAmount > exactUsdValue + price / multiplier) {
      return testAmount;
    }

    if (parseFloat(testPositionSize) === positionSize) {
      finalAmount = testAmount;
    } else {
      // We've crossed the boundary, use the last valid amount
      break;
    }
  }

  // Verify that this amount actually produces the expected position size
  // Use Math.floor for verification to match the final result format
  const verificationPositionSize = calculatePositionSize({
    amount: Math.ceil(finalAmount).toString(),
    price,
    szDecimals,
  });

  // The expected position size depends on whether we're sizing down or not
  const expectedPositionSize = positionSize.toFixed(szDecimals);

  // If verification fails, return -1
  if (verificationPositionSize !== expectedPositionSize) {
    return -1;
  }

  return Math.ceil(finalAmount);
}

export function getMaxAllowedAmount(params: MaxAllowedAmountParams): number {
  const { availableBalance, assetPrice, assetSzDecimals, leverage } = params;
  if (availableBalance === 0 || !assetPrice || assetSzDecimals === undefined) {
    return 0;
  }

  // Start with the theoretical maximum
  let testAmount = Math.floor(availableBalance * leverage);

  // Work backwards to find the highest amount that results in sufficient margin
  while (testAmount > 0) {
    const testPositionSize = calculatePositionSize({
      amount: testAmount.toString(),
      price: assetPrice,
      szDecimals: assetSzDecimals,
    });

    const actualNotionalValue = parseFloat(testPositionSize) * assetPrice;
    const requiredMargin = actualNotionalValue / leverage;

    // If this amount requires margin within our available balance, use it
    if (requiredMargin <= availableBalance) {
      return testAmount;
    }

    // Reduce the test amount by one position size increment
    // Calculate the USD value of the smallest position size increment
    const minPositionSizeIncrement = 1 / Math.pow(10, assetSzDecimals);
    const positionSizeIncrementUsd = minPositionSizeIncrement * assetPrice;

    const positionSizeIncrementUsdCeil = Math.ceil(positionSizeIncrementUsd);
    if (positionSizeIncrementUsdCeil <= 0) {
      return 0;
    }
    testAmount -= positionSizeIncrementUsdCeil;
  }

  return 0;
}
