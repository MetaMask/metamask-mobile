import type {
  AccountState,
  AssetRoute,
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  DepositParams,
  DisconnectResult,
  EditOrderParams,
  FeeCalculationParams,
  FeeCalculationResult,
  Funding,
  GetAccountStateParams,
  GetFundingParams,
  GetOrderFillsParams,
  GetOrdersParams,
  GetPositionsParams,
  GetSupportedPathsParams,
  InitializeResult,
  IPerpsProvider,
  LiquidationPriceParams,
  LiveDataConfig,
  MaintenanceMarginParams,
  MarketInfo,
  Order,
  OrderFill,
  OrderParams,
  OrderResult,
  PerpsMarketData,
  Position,
  ReadyToTradeResult,
  SubscribeAccountParams,
  SubscribeOrderFillsParams,
  SubscribeOrdersParams,
  SubscribePositionsParams,
  SubscribePricesParams,
  ToggleTestnetResult,
  UpdatePositionTPSLParams,
  WithdrawParams,
  WithdrawResult,
} from '../types';

// Minimal mock data for E2E
const MOCK_MARKETS: MarketInfo[] = [
  { name: 'BTC', szDecimals: 3, maxLeverage: 40, marginTableId: 1 },
  { name: 'ETH', szDecimals: 3, maxLeverage: 30, marginTableId: 1 },
  { name: 'SOL', szDecimals: 2, maxLeverage: 20, marginTableId: 1 },
];

const MOCK_MARKET_DATA: PerpsMarketData[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    maxLeverage: '40x',
    price: '$50,000.00',
    change24h: '+$500.00',
    change24hPercent: '+1.0%',
    volume: '$1.2B',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    maxLeverage: '30x',
    price: '$3,000.00',
    change24h: '+$30.00',
    change24hPercent: '+1.0%',
    volume: '$800M',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    maxLeverage: '20x',
    price: '$150.00',
    change24h: '+$1.50',
    change24hPercent: '+1.0%',
    volume: '$300M',
  },
];

export class MockPerpsProvider implements IPerpsProvider {
  readonly protocolId = 'mock-perps';

  getDepositRoutes(_params?: GetSupportedPathsParams): AssetRoute[] {
    return [];
  }
  getWithdrawalRoutes(_params?: GetSupportedPathsParams): AssetRoute[] {
    return [];
  }

  async placeOrder(_params: OrderParams): Promise<OrderResult> {
    return { success: true, orderId: 'mock-order-1' };
  }
  async editOrder(_params: EditOrderParams): Promise<OrderResult> {
    return { success: true, orderId: 'mock-order-1' };
  }
  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    return { success: true, orderId: params.orderId };
  }
  async closePosition(_params: ClosePositionParams): Promise<OrderResult> {
    return { success: true };
  }
  async updatePositionTPSL(
    _params: UpdatePositionTPSLParams,
  ): Promise<OrderResult> {
    return { success: true };
  }
  async getPositions(_params?: GetPositionsParams): Promise<Position[]> {
    return [];
  }
  async getAccountState(
    _params?: GetAccountStateParams,
  ): Promise<AccountState> {
    return {
      availableBalance: '1000',
      totalBalance: '1000',
      marginUsed: '0',
      unrealizedPnl: '0',
    };
  }
  async getMarkets(): Promise<MarketInfo[]> {
    return MOCK_MARKETS;
  }
  async getMarketDataWithPrices(): Promise<PerpsMarketData[]> {
    return MOCK_MARKET_DATA;
  }
  async withdraw(_params: WithdrawParams): Promise<WithdrawResult> {
    return { success: true, withdrawalId: 'mock-withdraw-1' };
  }
  async validateDeposit(
    _params: DepositParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    return { isValid: true };
  }
  async validateOrder(
    _params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    return { isValid: true };
  }
  async validateClosePosition(
    _params: ClosePositionParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    return { isValid: true };
  }
  async validateWithdrawal(
    _params: WithdrawParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    return { isValid: true };
  }
  async getOrderFills(_params?: GetOrderFillsParams): Promise<OrderFill[]> {
    return [];
  }
  async getOrders(_params?: GetOrdersParams): Promise<Order[]> {
    return [];
  }
  async getOpenOrders(_params?: GetOrdersParams): Promise<Order[]> {
    return [];
  }
  async getFunding(_params?: GetFundingParams): Promise<Funding[]> {
    return [];
  }
  async calculateLiquidationPrice(
    _params: LiquidationPriceParams,
  ): Promise<string> {
    return '0.00';
  }
  async calculateMaintenanceMargin(
    _params: MaintenanceMarginParams,
  ): Promise<number> {
    return 0.01;
  }
  async getMaxLeverage(_asset: string): Promise<number> {
    return 40;
  }
  async calculateFees(
    params: FeeCalculationParams,
  ): Promise<FeeCalculationResult> {
    const baseRate =
      params.orderType === 'market' || !params.isMaker ? 0.00045 : 0.00015;
    const parsedAmount = params.amount ? parseFloat(params.amount) : NaN;
    const feeAmount = !isNaN(parsedAmount)
      ? parsedAmount * baseRate
      : undefined;
    return { feeRate: baseRate, feeAmount };
  }
  subscribeToPrices(_params: SubscribePricesParams): () => void {
    return () => undefined;
  }
  subscribeToPositions(_params: SubscribePositionsParams): () => void {
    return () => undefined;
  }
  subscribeToOrderFills(_params: SubscribeOrderFillsParams): () => void {
    return () => undefined;
  }
  subscribeToOrders(_params: SubscribeOrdersParams): () => void {
    return () => undefined;
  }
  subscribeToAccount(_params: SubscribeAccountParams): () => void {
    return () => undefined;
  }
  setLiveDataConfig(_config: Partial<LiveDataConfig>): void {
    // no-op
  }
  async toggleTestnet(): Promise<ToggleTestnetResult> {
    return { success: true, isTestnet: true };
  }
  async initialize(): Promise<InitializeResult> {
    return { success: true, chainId: '42161' };
  }
  async isReadyToTrade(): Promise<ReadyToTradeResult> {
    return { ready: true, walletConnected: true, networkSupported: true };
  }
  async disconnect(): Promise<DisconnectResult> {
    return { success: true };
  }
  getBlockExplorerUrl(_address?: string): string {
    return 'https://explorer.mock/';
  }
}
