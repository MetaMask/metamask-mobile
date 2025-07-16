import { ParamListBase } from '@react-navigation/native';
import type { Position, OrderResult } from '../controllers/types';

/**
 * PERPS navigation parameter types
 */
export interface PerpsNavigationParamList extends ParamListBase {
  [key: string]: object | undefined;

  // Order flow routes
  PerpsOrder: {
    direction: 'long' | 'short';
    asset: string;
    leverage?: number;
    size?: string;
    price?: string;
    orderType?: 'market' | 'limit';
  };

  PerpsOrderSuccess: {
    orderId: string;
    direction: 'long' | 'short';
    asset: string;
    size: string;
    price?: string;
    leverage?: number;
  };

  // Deposit flow routes
  PerpsDeposit: undefined;

  PerpsDepositPreview: {
    amount: string;
    fromToken: string;
    toToken?: string;
    exchangeRate?: string;
    fees?: string;
    estimatedGas?: string;
  };

  PerpsDepositProcessing: {
    amount: string;
    fromToken: string;
    toToken?: string;
    transactionHash?: string;
  };

  PerpsDepositSuccess: {
    amount: string;
    fromToken: string;
    toToken?: string;
    transactionHash: string;
    finalBalance?: string;
  };

  // Market and position management routes
  PerpsMarketList: undefined;

  PerpsPositions: undefined;

  PerpsPositionDetails: {
    position: Position;
    action?: 'view' | 'edit' | 'close';
  };

  // Order history routes
  PerpsOrderHistory: undefined;

  PerpsOrderDetails: {
    order: OrderResult;
    action?: 'view' | 'edit' | 'cancel';
  };

  // Main trading view
  PerpsTradingView: undefined;

  // Root perps view
  Perps: undefined;
}

/**
 * Type helper for PERPS route parameters
 */
export type PerpsRouteParams<T extends keyof PerpsNavigationParamList> =
  PerpsNavigationParamList[T];
