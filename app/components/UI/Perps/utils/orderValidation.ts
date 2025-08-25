import { strings } from '../../../../../locales/i18n';
import type { MarketInfo, OrderType } from '../controllers/types';
import type { PerpsToken } from '../components/PerpsTokenSelector';
import {
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
} from '../constants/hyperLiquidConfig';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

export interface OrderFormState {
  asset: string;
  direction: 'long' | 'short';
  amount: string;
  leverage: number;
  balancePercent: number;
  takeProfitPrice?: string;
  stopLossPrice?: string;
  limitPrice?: string;
}

export interface OrderValidationParams {
  orderForm: OrderFormState;
  marginRequired: string;
  availableBalance: number;
  marketData: MarketInfo | null;
  selectedPaymentToken: PerpsToken | null;
  orderType: OrderType;
}

export interface OrderValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

/**
 * Validates a perpetuals order based on various criteria
 * @param params - The validation parameters
 * @returns Validation result with errors, warnings, and isValid flag
 */
export function validatePerpsOrder(
  params: OrderValidationParams,
): OrderValidationResult {
  const {
    orderForm,
    marginRequired,
    availableBalance,
    marketData,
    selectedPaymentToken,
    orderType,
  } = params;

  const errors: string[] = [];
  const warnings: string[] = [];

  const amount = parseFloat(orderForm.amount || '0');

  // Amount validation
  if (amount <= 0) {
    errors.push(strings('perps.order.validation.amount_required'));
  }

  if (amount > 0 && amount < 10) {
    errors.push(
      strings('perps.order.validation.minimum_amount', { amount: '10' }),
    );
  }

  if (amount > 100000) {
    errors.push(
      strings('perps.order.validation.maximum_amount', { amount: '100,000' }),
    );
  }

  // Balance validation
  const requiredMargin = parseFloat(marginRequired);
  if (requiredMargin > availableBalance) {
    errors.push(
      strings('perps.order.validation.insufficient_balance', {
        required: marginRequired,
        available: availableBalance.toString(),
      }),
    );
  }

  // Leverage validation
  const maxLeverage =
    marketData?.maxLeverage || PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE;
  if (orderForm.leverage < 1 || orderForm.leverage > maxLeverage) {
    errors.push(
      strings('perps.order.validation.invalid_leverage', {
        min: '1',
        max: maxLeverage.toString(),
      }),
    );
  }

  if (orderForm.leverage > 20) {
    warnings.push(strings('perps.order.validation.high_leverage_warning'));
  }

  // Payment token validation
  // Check if selected payment token is not Hyperliquid USDC (mainnet or testnet)
  if (
    selectedPaymentToken &&
    selectedPaymentToken.chainId !== HYPERLIQUID_MAINNET_CHAIN_ID &&
    selectedPaymentToken.chainId !== HYPERLIQUID_TESTNET_CHAIN_ID
  ) {
    errors.push(strings('perps.order.validation.only_hyperliquid_usdc'));
  }

  // Limit order validation
  if (orderType === 'limit' && !orderForm.limitPrice) {
    errors.push(strings('perps.order.validation.limit_price_required'));
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}
