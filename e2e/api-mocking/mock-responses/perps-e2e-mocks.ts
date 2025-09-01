/**
 * Perps E2E Mock Service
 *
 * Provides mock data and state management for Perps E2E tests.
 * This service simulates the Hyperliquid SDK and controller responses
 * without requiring real network calls or testnet funds.
 */

import type {
  AccountState,
  Position,
  Order,
  OrderFill,
  OrderParams,
  OrderResult,
  PriceUpdate,
  PerpsMarketData,
  WithdrawParams,
  WithdrawResult,
  Funding,
} from '../../../app/components/UI/Perps/controllers/types';

export class PerpsE2EMockService {
  private static instance: PerpsE2EMockService;
  private static activeProfile: string | null = null;

  // Mock state that persists across the E2E session
  private mockAccount: AccountState = {
    totalBalance: '10000.00',
    availableBalance: '8000.00',
    marginUsed: '2000.00',
    unrealizedPnl: '150.00',
    returnOnEquity: '0',
    totalValue: '10000.00',
  };

  private mockPositions: Position[] = [];
  private mockOrders: Order[] = [];
  private mockOrderFills: OrderFill[] = [];

  private orderIdCounter = 1;
  private fillIdCounter = 1;

  // Stream callbacks to notify about data changes
  private positionCallbacks: ((positions: Position[]) => void)[] = [];
  private accountCallbacks: ((account: AccountState) => void)[] = [];

  private constructor() {
    this.reset();
  }

  public static getInstance(): PerpsE2EMockService {
    if (!PerpsE2EMockService.instance) {
      PerpsE2EMockService.instance = new PerpsE2EMockService();
    }
    return PerpsE2EMockService.instance;
  }

  // Allow E2E to set a mock "profile" that controls initial state
  public static setProfile(profile: string | null) {
    PerpsE2EMockService.activeProfile = profile;
  }

  // Reset state for fresh test runs
  public reset(): void {
    const profile = PerpsE2EMockService.activeProfile;

    // Default account state
    this.mockAccount = {
      totalBalance: profile === 'no-funds' ? '0.00' : '10000.00',
      availableBalance: profile === 'no-funds' ? '0.00' : '8000.00',
      marginUsed: profile === 'no-funds' ? '0.00' : '2000.00',
      unrealizedPnl: profile === 'no-funds' ? '0.00' : '150.00',
      returnOnEquity: '0',
      totalValue: profile === 'no-funds' ? '0.00' : '10000.00',
    };

    // Positions based on profile
    this.mockPositions =
      profile === 'no-funds' || profile === 'no-positions'
        ? []
        : [
            {
              coin: 'BTC',
              entryPrice: '45000.00',
              size: '0.1',
              positionValue: '4500.00',
              unrealizedPnl: '150.00',
              marginUsed: '900.00',
              leverage: {
                type: 'cross',
                value: 5,
              },
              liquidationPrice: '36000.00',
              maxLeverage: 50,
              returnOnEquity: '0.167',
              cumulativeFunding: {
                allTime: '0',
                sinceChange: '0',
                sinceOpen: '0',
              },
            },
          ];

    this.mockOrders = [];
    this.mockOrderFills = [];
    this.orderIdCounter = 1;
    this.fillIdCounter = 1;

    // Clear callbacks
    this.positionCallbacks = [];
    this.accountCallbacks = [];
  }

  // Mock successful order placement
  public async mockPlaceOrder(params: OrderParams): Promise<OrderResult> {
    const orderId = `mock_order_${this.orderIdCounter++}`;

    // Calculate mock values
    const notionalValue =
      parseFloat(params.size) * (params.currentPrice || 50000);
    const marginUsed = notionalValue / (params.leverage || 1);

    // Update available balance
    const newAvailableBalance =
      parseFloat(this.mockAccount.availableBalance) - marginUsed;
    const newMarginUsed = parseFloat(this.mockAccount.marginUsed) + marginUsed;

    this.mockAccount = {
      ...this.mockAccount,
      availableBalance: newAvailableBalance.toString(),
      marginUsed: newMarginUsed.toString(),
    };

    // Determine signed size based on direction (long = +, short = -)
    const numericSize = Math.abs(parseFloat(params.size));
    const signedSize = params.isBuy
      ? numericSize.toString()
      : (-numericSize).toString();

    // Create mock position
    const mockPosition: Position = {
      coin: params.coin,
      entryPrice: (params.currentPrice || 50000).toString(),
      size: signedSize,
      positionValue: notionalValue.toString(),
      unrealizedPnl: '0',
      marginUsed: marginUsed.toString(),
      leverage: {
        type: 'cross',
        value: params.leverage || 1,
      },
      liquidationPrice: this.calculateMockLiquidationPrice(
        params.currentPrice || 50000,
        params.leverage || 1,
        params.isBuy,
      ).toString(),
      maxLeverage: 50,
      returnOnEquity: '0',
      cumulativeFunding: {
        allTime: '0',
        sinceChange: '0',
        sinceOpen: '0',
      },
    };

    // Add to mock state
    this.mockPositions.push(mockPosition);

    // Create mock order fill
    const mockFill: OrderFill = {
      orderId,
      symbol: params.coin,
      size: params.size,
      price: (params.currentPrice || 50000).toString(),
      timestamp: Date.now(),
      side: params.isBuy ? 'buy' : 'sell',
      fee: '2.50',
      feeToken: 'USDC',
      pnl: '0.00',
      direction: params.isBuy ? 'long' : 'short',
    };

    this.mockOrderFills.push(mockFill);

    // Notify subscribers
    this.notifyPositionCallbacks();
    this.notifyAccountCallbacks();

    return {
      success: true,
      orderId,
    };
  }

  // Mock withdrawal
  public async mockWithdraw(params: WithdrawParams): Promise<WithdrawResult> {
    const withdrawAmount = parseFloat(params.amount);
    const currentBalance = parseFloat(this.mockAccount.availableBalance);

    if (withdrawAmount > currentBalance) {
      return {
        success: false,
        error: 'Insufficient balance',
      };
    }

    // Update balances
    const newAvailableBalance = currentBalance - withdrawAmount;
    const newTotalBalance =
      parseFloat(this.mockAccount.totalBalance) - withdrawAmount;

    this.mockAccount = {
      ...this.mockAccount,
      totalBalance: newTotalBalance.toString(),
      availableBalance: newAvailableBalance.toString(),
    };

    // Notify subscribers
    this.notifyAccountCallbacks();

    return {
      success: true,
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      withdrawalId: `mock_withdrawal_${Date.now()}`,
      estimatedArrivalTime: Date.now() + 5 * 60 * 1000, // 5 minutes
    };
  }

  // Mock close position
  public async mockClosePosition(
    coin: string,
    size?: string,
  ): Promise<OrderResult> {
    const existingPosition = this.mockPositions.find((p) => p.coin === coin);
    if (!existingPosition) {
      return {
        success: false,
        error: 'Position not found',
      };
    }

    const sizeToClose = size || existingPosition.size;
    const closePrice = parseFloat(existingPosition.entryPrice) * 1.02; // Mock 2% profit
    const pnl =
      (closePrice - parseFloat(existingPosition.entryPrice)) *
      parseFloat(sizeToClose);

    // Update account balance with PnL
    const newAvailableBalance =
      parseFloat(this.mockAccount.availableBalance) +
      parseFloat(existingPosition.marginUsed) +
      pnl;
    const newMarginUsed =
      parseFloat(this.mockAccount.marginUsed) -
      parseFloat(existingPosition.marginUsed);
    const newUnrealizedPnl = parseFloat(this.mockAccount.unrealizedPnl) - pnl;

    this.mockAccount = {
      ...this.mockAccount,
      availableBalance: newAvailableBalance.toString(),
      marginUsed: newMarginUsed.toString(),
      unrealizedPnl: newUnrealizedPnl.toString(),
    };

    // Remove position
    this.mockPositions = this.mockPositions.filter((p) => p.coin !== coin);

    // Notify position subscribers about the change
    this.notifyPositionCallbacks();

    // Notify account subscribers about balance change
    this.notifyAccountCallbacks();

    return {
      success: true,
      orderId: `mock_close_${this.orderIdCounter++}`,
    };
  }

  // Callback management methods
  public registerPositionCallback(
    callback: (positions: Position[]) => void,
  ): void {
    this.positionCallbacks.push(callback);
  }

  public unregisterPositionCallback(
    callback: (positions: Position[]) => void,
  ): void {
    this.positionCallbacks = this.positionCallbacks.filter(
      (cb) => cb !== callback,
    );
  }

  public registerAccountCallback(
    callback: (account: AccountState) => void,
  ): void {
    this.accountCallbacks.push(callback);
  }

  public unregisterAccountCallback(
    callback: (account: AccountState) => void,
  ): void {
    this.accountCallbacks = this.accountCallbacks.filter(
      (cb) => cb !== callback,
    );
  }

  private notifyPositionCallbacks(): void {
    console.log(
      '🎭 E2E Mock: Notifying position callbacks, positions count:',
      this.mockPositions.length,
    );
    this.positionCallbacks.forEach((callback) => {
      try {
        callback([...this.mockPositions]); // Send a copy
      } catch (error) {
        console.warn('Error in position callback:', error);
      }
    });
  }

  private notifyAccountCallbacks(): void {
    console.log(
      '🎭 E2E Mock: Notifying account callbacks, balance:',
      this.mockAccount.availableBalance,
    );
    this.accountCallbacks.forEach((callback) => {
      try {
        callback({ ...this.mockAccount }); // Send a copy
      } catch (error) {
        console.warn('Error in account callback:', error);
      }
    });
  }

  // Getter methods
  public getMockAccountState(): AccountState {
    return { ...this.mockAccount };
  }

  public getMockPositions(): Position[] {
    return [...this.mockPositions];
  }

  public getMockOrders(): Order[] {
    return [...this.mockOrders];
  }

  public getMockOrderFills(): OrderFill[] {
    return [...this.mockOrderFills];
  }

  public getMockMarkets(): PerpsMarketData[] {
    return [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        maxLeverage: '50x',
        price: '$45,000.00',
        change24h: '+$1,125.00',
        change24hPercent: '+2.5%',
        volume: '$1.2B',
        nextFundingTime: Date.now() + 8 * 60 * 60 * 1000, // 8 hours from now
        fundingIntervalHours: 8,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        maxLeverage: '50x',
        price: '$2,500.00',
        change24h: '+$45.00',
        change24hPercent: '+1.8%',
        volume: '$850M',
        nextFundingTime: Date.now() + 8 * 60 * 60 * 1000, // 8 hours from now
        fundingIntervalHours: 8,
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        maxLeverage: '40x',
        price: '$98.50',
        change24h: '-$2.30',
        change24hPercent: '-2.3%',
        volume: '$425M',
        nextFundingTime: Date.now() + 8 * 60 * 60 * 1000, // 8 hours from now
        fundingIntervalHours: 8,
      },
    ];
  }

  public getMockPrices(): Record<string, PriceUpdate> {
    return {
      BTC: {
        coin: 'BTC',
        price: '45000.00',
        timestamp: Date.now(),
        percentChange24h: '2.5',
        bestBid: '44995.00',
        bestAsk: '45005.00',
        spread: '10.00',
        markPrice: '45000.00',
        funding: 0.01,
        openInterest: 50000000,
        volume24h: 1000000,
      },
      ETH: {
        coin: 'ETH',
        price: '2500.00',
        timestamp: Date.now(),
        percentChange24h: '1.8',
        bestBid: '2499.50',
        bestAsk: '2500.50',
        spread: '1.00',
        markPrice: '2500.00',
        funding: 0.005,
        openInterest: 25000000,
        volume24h: 500000,
      },
    };
  }

  public async mockGetFunding(): Promise<Funding[]> {
    return [
      {
        symbol: 'BTC',
        amountUsd: '1.50',
        rate: '0.0125',
        timestamp: Date.now(),
      },
    ];
  }

  private calculateMockLiquidationPrice(
    entryPrice: number,
    leverage: number,
    isBuy: boolean,
  ): number {
    // Simplified liquidation price calculation for mocking
    const maintenanceMarginRate = 0.05; // 5%
    const liquidationBuffer =
      entryPrice * (1 - 1 / leverage + maintenanceMarginRate);

    return isBuy
      ? entryPrice - liquidationBuffer
      : entryPrice + liquidationBuffer;
  }
}

export default PerpsE2EMockService;
