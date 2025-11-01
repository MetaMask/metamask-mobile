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
  const rounded = Math.floor(positionSize * multiplier) / multiplier;

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
  minAllowedAmount: number;
  price: number;
  szDecimals?: number;
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
  const {
    targetAmount,
    price,
    szDecimals = 6,
    maxAllowedAmount,
    minAllowedAmount,
  } = params;

  const targetAmountNum = parseFloat(targetAmount || '0');

  if (
    isNaN(targetAmountNum) ||
    isNaN(price) ||
    targetAmountNum === 0 ||
    price === 0 ||
    targetAmountNum < minAllowedAmount
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

  // Position size for $1 USD
  const dollarPositionSize = 1 / price;
  // get the position increment base
  // but at times wwe will need to skip by a few increments
  let positionIncrement = 10 ** -szDecimals;
  let dollarBasedPositionIncrement = (
    Math.round(dollarPositionSize * multiplier) / multiplier
  ).toFixed(szDecimals);

  if (parseFloat(dollarBasedPositionIncrement) === 0) {
    dollarBasedPositionIncrement = (
      (dollarPositionSize * multiplier) /
      multiplier
    ).toFixed(szDecimals);
  }
  if (parseFloat(dollarBasedPositionIncrement) > positionIncrement) {
    positionIncrement = parseFloat(dollarBasedPositionIncrement);
  }

  if (highestAmount > maxAllowedAmount) {
    const decrementedPositionSize =
      ((positionSizeNum - positionIncrement) * multiplier) / multiplier;
    // If the decremented position size would be 0 or negative, return original amount
    if (decrementedPositionSize <= 0) {
      return targetAmount;
    }

    positionSizeNum = decrementedPositionSize;
    highestAmount = findHighestAmountForPositionSize({
      positionSize: positionSizeNum,
      price,
      szDecimals,
    });
  }

  if (
    parseFloat(targetAmount) >= minAllowedAmount &&
    positionSizeNum * price < minAllowedAmount
  ) {
    const incrementedPositionSize =
      ((positionSizeNum + positionIncrement) * multiplier) / multiplier;

    // If the incremented position size would be 0 or negative, return original amount
    if (incrementedPositionSize <= 0) {
      return targetAmount;
    }

    positionSizeNum = incrementedPositionSize;
    highestAmount = findHighestAmountForPositionSize({
      positionSize: positionSizeNum,
      price,
      szDecimals,
    });
  }

  return highestAmount.toString();
}

export function findHighestAmountForPositionSize(
  params: HighestAmountForPositionSizeParams,
): number {
  const { positionSize, price, szDecimals = 6 } = params;

  // Calculate the exact USD value for this position size
  const exactUsdValue = parseFloat(positionSize.toFixed(szDecimals)) * price;

  // Calculate the increment that would bump to the next position size
  const multiplier = Math.pow(10, szDecimals);
  const usdIncrement = price / multiplier;

  // The highest amount is just before the next position size tier
  const highestAmount = exactUsdValue + usdIncrement;

  return Math.floor(highestAmount);
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
