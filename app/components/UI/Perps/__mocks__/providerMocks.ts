/**
 * Shared provider mocks for Perps tests
 * Provides reusable mock implementations for HyperLiquidProvider and related interfaces
 */
import { type HyperLiquidProvider } from '../controllers/providers/HyperLiquidProvider';

export const createMockHyperLiquidProvider =
  (): jest.Mocked<HyperLiquidProvider> =>
    ({
      protocolId: 'hyperliquid',
      initialize: jest.fn(),
      isReadyToTrade: jest.fn(),
      toggleTestnet: jest.fn(),
      getPositions: jest.fn(),
      getAccountState: jest.fn(),
      getHistoricalPortfolio: jest.fn().mockResolvedValue({
        totalBalance24hAgo: '10000',
        totalBalance7dAgo: '9500',
        totalBalance30dAgo: '9000',
      }),
      getMarkets: jest.fn(),
      placeOrder: jest.fn(),
      editOrder: jest.fn(),
      cancelOrder: jest.fn(),
      closePosition: jest.fn(),
      withdraw: jest.fn(),
      getDepositRoutes: jest.fn(),
      getWithdrawalRoutes: jest.fn(),
      validateDeposit: jest.fn().mockResolvedValue({ isValid: true }),
      validateOrder: jest.fn().mockResolvedValue({ isValid: true }),
      validateClosePosition: jest.fn().mockResolvedValue({ isValid: true }),
      validateWithdrawal: jest.fn().mockResolvedValue({ isValid: true }),
      subscribeToPrices: jest.fn(),
      subscribeToPositions: jest.fn(),
      subscribeToOrderFills: jest.fn(),
      setLiveDataConfig: jest.fn(),
      disconnect: jest.fn(),
      updatePositionTPSL: jest.fn(),
      calculateLiquidationPrice: jest.fn(),
      calculateMaintenanceMargin: jest.fn(),
      getMaxLeverage: jest.fn(),
      calculateFees: jest.fn(),
      getMarketDataWithPrices: jest.fn(),
      getBlockExplorerUrl: jest.fn(),
      getOrderFills: jest.fn(),
      getOrders: jest.fn(),
      getFunding: jest.fn(),
      getIsFirstTimeUser: jest.fn(),
      getOpenOrders: jest.fn(),
      subscribeToOrders: jest.fn(),
      subscribeToAccount: jest.fn(),
      setUserFeeDiscount: jest.fn(),
    } as unknown as jest.Mocked<HyperLiquidProvider>);

export const createMockOrderResult = () => ({
  success: true,
  orderId: 'order-123',
  filledSize: '0.1',
  averagePrice: '50000',
});

export const createMockOrderParams = () => ({
  symbol: 'BTC',
  side: 'buy',
  orderType: 'market',
  amount: '0.1',
  price: '50000',
});
