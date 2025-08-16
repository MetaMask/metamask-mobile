interface PositionSizeParams {
  amount: string;
  price: number;
}

interface MarginRequiredParams {
  amount: string;
  leverage: number;
}

/**
 * Calculate position size based on USD amount and asset price
 * @param params - Amount in USD and current asset price
 * @returns Position size formatted to 6 decimal places
 */
export function calculatePositionSize(params: PositionSizeParams): string {
  const { amount, price } = params;
  const amountNum = parseFloat(amount || '0');

  if (isNaN(amountNum) || isNaN(price) || amountNum === 0 || price === 0) {
    return '0.000000';
  }

  return (amountNum / price).toFixed(6);
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
