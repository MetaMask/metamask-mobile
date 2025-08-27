import AsyncStorage from '@react-native-async-storage/async-storage';
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
  PriceUpdate,
} from '../types';
import type { CandleData } from '../../types';
import { CandlePeriod } from '../../constants/chartConfig';

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

  // Minimal client service to support historical candles for charts
  public clientService = {
    fetchHistoricalCandles: async (
      coin: string,
      interval: CandlePeriod,
      limit: number,
    ): Promise<CandleData> => {
      const now = Date.now();
      const stepMsMap: Partial<Record<CandlePeriod, number>> = {
        [CandlePeriod.ONE_MINUTE]: 60_000,
        [CandlePeriod.THREE_MINUTES]: 180_000,
        [CandlePeriod.FIVE_MINUTES]: 300_000,
        [CandlePeriod.FIFTEEN_MINUTES]: 900_000,
        [CandlePeriod.THIRTY_MINUTES]: 1_800_000,
        [CandlePeriod.ONE_HOUR]: 3_600_000,
        [CandlePeriod.TWO_HOURS]: 7_200_000,
        [CandlePeriod.FOUR_HOURS]: 14_400_000,
        [CandlePeriod.EIGHT_HOURS]: 28_800_000,
        [CandlePeriod.TWELVE_HOURS]: 43_200_000,
        [CandlePeriod.ONE_DAY]: 86_400_000,
        [CandlePeriod.THREE_DAYS]: 259_200_000,
        [CandlePeriod.ONE_WEEK]: 604_800_000,
        [CandlePeriod.ONE_MONTH]: 2_592_000_000,
      } as const;

      const step = stepMsMap[interval] || 3_600_000;
      const base = coin === 'BTC' ? 50_000 : coin === 'ETH' ? 3_000 : 150;

      const candles = Array.from({ length: Math.max(5, limit) }, (_, i) => {
        const time = now - (limit - i) * step;
        const open = base + Math.sin(i / 5) * (base * 0.005);
        const close = open + (Math.random() - 0.5) * (base * 0.004);
        const high = Math.max(open, close) + base * 0.002;
        const low = Math.min(open, close) - base * 0.002;
        const volume = 1_000_000 + Math.floor(Math.random() * 100_000);
        return {
          time,
          open: open.toFixed(2),
          high: high.toFixed(2),
          low: low.toFixed(2),
          close: close.toFixed(2),
          volume: volume.toString(),
        };
      });

      return {
        coin,
        interval,
        candles,
      };
    },
  };

  getDepositRoutes(_params?: GetSupportedPathsParams): AssetRoute[] {
    // Static mock route: USDC on Arbitrum -> mocked bridge contract
    return [
      {
        assetId:
          'eip155:42161/erc20:0x0000000000000000000000000000000000000001/default',
        chainId: 'eip155:42161',
        contractAddress: '0x0000000000000000000000000000000000000002',
        constraints: {
          minAmount: '0',
          maxAmount: '100000000000',
        },
      },
    ];
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
    let balance = '1000';
    try {
      const stored = await AsyncStorage.getItem('@MetaMask:perpsMockBalance');
      if (stored !== null && stored !== undefined && stored !== '') {
        balance = String(stored);
      }
    } catch (error) {
      // ignore storage errors, use default
    }
    return {
      availableBalance: balance,
      totalBalance: balance,
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
  subscribeToPrices(params: SubscribePricesParams): () => void {
    const { symbols, callback, includeMarketData } = params;
    // E2E-friendly: single-shot update to avoid background timers
    const updates = symbols.map((s) => {
      const base = s === 'BTC' ? 50_000 : s === 'ETH' ? 3_000 : 150;
      const update: PriceUpdate = {
        coin: s,
        price: base.toFixed(2),
        timestamp: Date.now(),
        percentChange24h: '0.00',
      } as PriceUpdate;
      if (includeMarketData) {
        const enrichedUpdate: PriceUpdate & {
          funding: number;
          openInterest: number;
          volume24h: number;
        } = {
          ...update,
          funding: 0.0001,
          openInterest: 25_000_000,
          volume24h: 1_200_000_000,
        };
        return enrichedUpdate as unknown as PriceUpdate;
      }
      return update;
    });
    try {
      callback(updates as unknown as PriceUpdate[]);
    } catch {
      // no-op: swallow callback errors in mock provider
    }
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
