import { ParamListBase } from '@react-navigation/native';
import type {
  Position,
  Order,
  OrderType,
  PerpsMarketData,
  TPSLTrackingData,
} from '../controllers/types';
import { PerpsTransaction } from './transactionHistory';
import type { DataMonitorParams } from '../hooks/usePerpsDataMonitor';

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
    amount?: string;
    price?: string;
    orderType?: OrderType;
    hideTPSL?: boolean; // Hide TP/SL row when modifying existing position
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

  // Withdrawal flow routes
  PerpsWithdraw: undefined;

  // Market and position management routes
  PerpsMarketList: undefined;

  PerpsMarketListView: {
    source?: string;
    variant?: 'full' | 'minimal';
    title?: string;
    showBalanceActions?: boolean;
    showBottomNav?: boolean;
    defaultSearchVisible?: boolean;
    showWatchlistOnly?: boolean;
    defaultMarketTypeFilter?:
      | 'crypto'
      | 'equity'
      | 'commodity'
      | 'forex'
      | 'all'
      | 'stocks_and_commodities';
    fromHome?: boolean;
  };

  PerpsMarketDetails: {
    market: PerpsMarketData;
    initialTab?: 'position' | 'orders' | 'info';
    monitoringIntent?: Partial<DataMonitorParams>;
    source?: string;
  };

  PerpsPositions: undefined;

  PerpsPositionDetails: {
    position: Position;
    action?: 'view' | 'edit' | 'close';
  };

  PerpsClosePosition: {
    position: Position;
  };

  PerpsAdjustMargin: {
    position: Position;
    mode: 'add' | 'remove';
  };

  // Action selection routes
  PerpsSelectModifyAction: {
    position: Position;
  };

  PerpsSelectAdjustMarginAction: {
    position: Position;
  };

  PerpsSelectOrderType: {
    currentOrderType: OrderType;
    asset: string;
    direction: 'long' | 'short';
  };

  // Order history routes
  PerpsOrderHistory: undefined;

  PerpsOrderDetails: {
    order: Order;
    action?: 'view' | 'edit' | 'cancel';
  };

  // Main trading view
  PerpsTradingView: undefined;

  PerpsPositionTransaction: {
    transaction: PerpsTransaction;
  };

  PerpsOrderTransaction: {
    transaction: PerpsTransaction;
  };

  PerpsFundingTransaction: {
    transaction: PerpsTransaction;
  };

  PerpsTutorial: {
    isFromDeeplink?: boolean;
    isFromGTMModal?: boolean;
  };

  // TP/SL screen
  PerpsTPSL: {
    asset: string;
    currentPrice?: number;
    direction?: 'long' | 'short';
    position?: Position;
    initialTakeProfitPrice?: string;
    initialStopLossPrice?: string;
    leverage?: number;
    orderType?: 'market' | 'limit';
    limitPrice?: string;
    amount?: string; // For new orders - USD amount to calculate position size for P&L
    szDecimals?: number; // For new orders - asset decimal precision for P&L
    onConfirm: (
      takeProfitPrice?: string,
      stopLossPrice?: string,
      trackingData?: TPSLTrackingData,
    ) => Promise<void>;
  };

  // PnL Hero Card screen
  PerpsPnlHeroCard: {
    position: Position;
    marketPrice?: string;
  };

  // Order Book view - Full depth order book display
  PerpsOrderBook: {
    symbol: string;
    marketData?: PerpsMarketData;
  };

  // Activity view - Stack-based for proper back navigation
  // Uses the same redirect params as the tab-based TRANSACTIONS_VIEW
  PerpsActivity: {
    /**
     * Redirect to Perps transactions tab
     */
    redirectToPerpsTransactions?: boolean;
    /**
     * Redirect to Orders tab
     */
    redirectToOrders?: boolean;
    /**
     * Show back button in header for stack navigation
     */
    showBackButton?: boolean;
  };

  // Root perps view
  Perps: undefined;
}

/**
 * Type helper for PERPS route parameters
 */
export type PerpsRouteParams<T extends keyof PerpsNavigationParamList> =
  PerpsNavigationParamList[T];
