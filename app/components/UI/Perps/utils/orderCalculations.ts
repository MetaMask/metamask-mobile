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
