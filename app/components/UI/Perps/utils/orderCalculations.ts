import { FEE_RATES, RISK_MANAGEMENT } from '../constants/hyperLiquidConfig';

interface PositionSizeParams {
  amount: string;
  price: number;
}

interface MarginRequiredParams {
  amount: string;
  leverage: number;
}

interface LiquidationPriceParams {
  entryPrice: number;
  leverage: number;
  direction: 'long' | 'short';
}

interface EstimatedFeesParams {
  amount: string;
  orderType: 'market' | 'limit';
}

/**
 * Calculate position size based on USD amount and asset price
 * @param params - Amount in USD and current asset price
 * @returns Position size formatted to 6 decimal places
 */
export function calculatePositionSize(params: PositionSizeParams): string {
  const { amount, price } = params;
  const amountNum = parseFloat(amount || '0');

  if (amountNum === 0 || price === 0) {
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

  if (amountNum === 0 || leverage === 0) {
    return '0.00';
  }

  return (amountNum / leverage).toFixed(2);
}

/**
 * Calculate liquidation price for a position
 * @param params - Entry price, leverage, and position direction
 * @returns Liquidation price formatted to 2 decimal places
 */
export function calculateLiquidationPrice(
  params: LiquidationPriceParams,
): string {
  const { entryPrice, leverage, direction } = params;

  if (entryPrice === 0 || leverage === 0) {
    return '0.00';
  }

  const maintenanceMargin = RISK_MANAGEMENT.maintenanceMargin;
  const leverageRatio = 1 / leverage;

  if (direction === 'long') {
    // For long positions: liquidation occurs when price drops
    const liquidationRatio = 1 - (leverageRatio - maintenanceMargin);
    return (entryPrice * liquidationRatio).toFixed(2);
  }
  // For short positions: liquidation occurs when price rises
  const liquidationRatio = 1 + (leverageRatio - maintenanceMargin);
  return (entryPrice * liquidationRatio).toFixed(2);
}

/**
 * Calculate estimated fees for an order
 * @param params - Order amount and type
 * @returns Estimated fees as a number
 */
export function calculateEstimatedFees(params: EstimatedFeesParams): number {
  const { amount, orderType } = params;
  const amountNum = parseFloat(amount || '0');
  const feeRate = orderType === 'market' ? FEE_RATES.market : FEE_RATES.limit;

  return amountNum * feeRate;
}
