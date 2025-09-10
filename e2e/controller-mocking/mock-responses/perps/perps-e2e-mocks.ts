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
} from '../../../../app/components/UI/Perps/controllers/types';

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
  private mockPricesMap: Record<string, PriceUpdate> = {};
  private orderMeta: Record<string, { leverage: number }> = {};

  private orderIdCounter = 1;
  private fillIdCounter = 1;

  // Stream callbacks to notify about data changes
  private positionCallbacks: ((positions: Position[]) => void)[] = [];
  private accountCallbacks: ((account: AccountState) => void)[] = [];
  private ordersCallbacks: ((orders: Order[]) => void)[] = [];

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
      // Set a temporary value; we will recompute from positions below
      unrealizedPnl: '0.00',
      returnOnEquity: '0',
      totalValue: profile === 'no-funds' ? '0.00' : '10000.00',
    };

    // Positions based on profile
    if (profile === 'no-funds' || profile === 'no-positions') {
      this.mockPositions = [];
    } else if (profile === 'position-testing') {
      // Rich set of positions for UI validation
      this.mockPositions = [
        {
          coin: 'ETH',
          entryPrice: '2500.00',
          size: '1.0', // long
          positionValue: '2500.00',
          unrealizedPnl: '125.00',
          marginUsed: '833.33',
          leverage: { type: 'cross', value: 3 },
          liquidationPrice: '2000.00',
          maxLeverage: 40,
          returnOnEquity: '0.05', // 5%
          cumulativeFunding: { allTime: '0', sinceChange: '0', sinceOpen: '0' },
        },
        {
          coin: 'BTC',
          entryPrice: '45000.00',
          size: '-0.05', // short
          positionValue: '2250.00',
          unrealizedPnl: '-50.00',
          marginUsed: '225.00',
          leverage: { type: 'cross', value: 10 },
          liquidationPrice: '47250.00',
          maxLeverage: 40,
          returnOnEquity: '-0.02', // -2%
          cumulativeFunding: { allTime: '0', sinceChange: '0', sinceOpen: '0' },
        },
        {
          coin: 'SOL',
          entryPrice: '100.00',
          size: '5', // long
          positionValue: '500.00',
          unrealizedPnl: '25.00',
          marginUsed: '25.00',
          leverage: { type: 'cross', value: 20 },
          liquidationPrice: '80.00',
          maxLeverage: 40,
          returnOnEquity: '0.10', // 10%
          cumulativeFunding: { allTime: '0', sinceChange: '0', sinceOpen: '0' },
        },
      ];
    } else {
      this.mockPositions = [
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
          maxLeverage: 40,
          returnOnEquity: '0.167',
          cumulativeFunding: {
            allTime: '0',
            sinceChange: '0',
            sinceOpen: '0',
          },
        },
      ];
    }

    // Recompute account-level unrealized PnL from the sum of positions
    this.mockAccount = {
      ...this.mockAccount,
      unrealizedPnl: this.computeTotalUnrealizedPnl().toFixed(2),
    };

    this.mockOrders = [];
    this.mockOrderFills = [];
    this.orderIdCounter = 1;
    this.fillIdCounter = 1;
    this.orderMeta = {};

    // Clear callbacks
    this.positionCallbacks = [];
    this.accountCallbacks = [];
    this.ordersCallbacks = [];

    // Initialize price map with default prices
    this.mockPricesMap = this.buildDefaultPrices();
  }

  // Mock successful order placement
  public async mockPlaceOrder(params: OrderParams): Promise<OrderResult> {
    const orderId = `mock_order_${this.orderIdCounter++}`;

    // If this is a limit order, add to open orders and do not create a position yet
    if (params.orderType === 'limit' && params.price) {
      const openOrder: Order = {
        orderId,
        symbol: params.coin,
        side: params.isBuy ? 'buy' : 'sell',
        orderType: 'limit',
        size: params.size,
        originalSize: params.size,
        price: params.price,
        filledSize: '0',
        remainingSize: params.size,
        status: 'open',
        timestamp: Date.now(),
      };
      this.mockOrders.push(openOrder);
      // Track leverage metadata for later fill
      this.orderMeta[orderId] = { leverage: params.leverage || 1 };
      this.notifyOrdersCallbacks();
      return { success: true, orderId };
    }

    // Calculate mock values for market orders
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

  // Mock withdrawal (reserved for upcoming tests)
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
    _size?: string,
  ): Promise<OrderResult> {
    const existingPosition = this.mockPositions.find((p) => p.coin === coin);
    if (!existingPosition) {
      return {
        success: false,
        error: 'Position not found',
      };
    }

    // Use the current unrealized PnL of the position as the realized PnL on close
    // This keeps UI estimates and account updates consistent and avoids sign errors
    const pnl = parseFloat(existingPosition.unrealizedPnl || '0');

    // Update account balances with realized PnL
    const newAvailableBalance =
      parseFloat(this.mockAccount.availableBalance) +
      parseFloat(existingPosition.marginUsed) +
      pnl;
    const newMarginUsed =
      parseFloat(this.mockAccount.marginUsed) -
      parseFloat(existingPosition.marginUsed);
    const newTotalBalance = parseFloat(this.mockAccount.totalBalance) + pnl;
    this.mockAccount = {
      ...this.mockAccount,
      availableBalance: newAvailableBalance.toString(),
      marginUsed: newMarginUsed.toString(),
      totalBalance: newTotalBalance.toString(),
    };

    // Remove position
    this.mockPositions = this.mockPositions.filter((p) => p.coin !== coin);

    // Recompute account unrealized PnL based on remaining positions
    const recomputedUnrealized = this.computeTotalUnrealizedPnl();
    this.mockAccount.unrealizedPnl = recomputedUnrealized.toFixed(2);
    // Keep totalValue aligned with equity (realized + unrealized)
    this.mockAccount.totalValue = (
      parseFloat(this.mockAccount.totalBalance) + recomputedUnrealized
    ).toFixed(2);

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

  private notifyOrdersCallbacks(): void {
    try {
      const snapshot = this.getMockOrders();
      this.ordersCallbacks.forEach((callback) => {
        try {
          callback([...snapshot]);
        } catch {
          // no-op
        }
      });
    } catch {
      // no-op
    }
  }

  public registerOrderCallback(callback: (orders: Order[]) => void): void {
    this.ordersCallbacks.push(callback);
  }

  public unregisterOrderCallback(callback: (orders: Order[]) => void): void {
    this.ordersCallbacks = this.ordersCallbacks.filter((cb) => cb !== callback);
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
        maxLeverage: '40x',
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
        maxLeverage: '40x',
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
    return { ...this.mockPricesMap };
  }

  // Mock funding endpoint (reserved for upcoming tests)
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

  /**
   * Update live price for a symbol and recompute liquidation state where applicable.
   * Triggers callbacks so UI updates without navigation.
   */
  public mockPushPrice(symbol: string, price: string): boolean {
    if (!symbol || !price) {
      return false;
    }

    const parsed = parseFloat(price);
    if (Number.isNaN(parsed)) {
      return false;
    }

    // Update the price feed (stateful)
    const existing = this.mockPricesMap[symbol];
    const updated: PriceUpdate = {
      ...(existing || {
        coin: symbol,
        percentChange24h: '0',
        bestBid: price,
        bestAsk: price,
        spread: '0',
        funding: 0,
        openInterest: 0,
        volume24h: 0,
        markPrice: price,
        price,
        timestamp: Date.now(),
      }),
      price,
      markPrice: price,
      timestamp: Date.now(),
    } as PriceUpdate;

    this.mockPricesMap[symbol] = updated;

    // Adjust unrealized PnL roughly based on movement towards/away from entry
    this.mockPositions = this.mockPositions.map((pos) => {
      if (pos.coin !== symbol) return pos;
      const entry = parseFloat(pos.entryPrice);
      const size = parseFloat(pos.size);
      const direction = size >= 0 ? 1 : -1;
      const delta = (parsed - entry) * Math.abs(size) * direction;
      return { ...pos, unrealizedPnl: delta.toFixed(2) };
    });

    // Evaluate open limit orders for potential fills (remove when triggered and open position)
    const remainingOrders: Order[] = [];
    for (const order of this.mockOrders) {
      if (order.symbol !== symbol) {
        remainingOrders.push(order);
        continue;
      }
      if (order.orderType === 'limit') {
        const limitPx = parseFloat(order.price);
        const fill =
          (order.side === 'buy' && parsed <= limitPx) ||
          (order.side === 'sell' && parsed >= limitPx);
        if (!fill) {
          remainingOrders.push(order);
        } else {
          // Mark fill in history and drop from open orders
          const mockFill: OrderFill = {
            orderId: order.orderId,
            symbol: order.symbol,
            size: order.size,
            price: order.price,
            timestamp: Date.now(),
            side: order.side,
            fee: '0.00',
            feeToken: 'USDC',
            pnl: '0.00',
            direction: order.side === 'buy' ? 'long' : 'short',
          };
          this.mockOrderFills.push(mockFill);

          // Create a position at the limit price using stored leverage metadata
          const leverage = this.orderMeta[order.orderId]?.leverage || 1;
          const numericSize = Math.abs(parseFloat(order.size) || 0);
          const signedSize = order.side === 'buy' ? numericSize : -numericSize;
          const entry = parseFloat(order.price);
          const notional = numericSize * entry;
          const marginUsed = notional / leverage;

          // Update account balances for margin usage
          const newAvailableBalance =
            parseFloat(this.mockAccount.availableBalance) - marginUsed;
          const newMarginUsed =
            parseFloat(this.mockAccount.marginUsed) + marginUsed;
          this.mockAccount = {
            ...this.mockAccount,
            availableBalance: newAvailableBalance.toString(),
            marginUsed: newMarginUsed.toString(),
          };

          // Add position
          const newPosition: Position = {
            coin: order.symbol,
            entryPrice: entry.toFixed(2),
            size: signedSize.toString(),
            positionValue: notional.toFixed(2),
            unrealizedPnl: '0',
            marginUsed: marginUsed.toFixed(2),
            leverage: { type: 'cross', value: leverage },
            liquidationPrice: this.calculateMockLiquidationPrice(
              entry,
              leverage,
              order.side === 'buy',
            ).toFixed(2),
            maxLeverage: 50,
            returnOnEquity: '0',
            cumulativeFunding: {
              allTime: '0',
              sinceChange: '0',
              sinceOpen: '0',
            },
          };
          this.mockPositions.push(newPosition);

          // Cleanup order meta
          delete this.orderMeta[order.orderId];
        }
      } else {
        remainingOrders.push(order);
      }
    }
    this.mockOrders = remainingOrders;
    this.notifyOrdersCallbacks();
    // Notify about new positions/balances if any were created
    this.notifyPositionCallbacks();
    this.notifyAccountCallbacks();

    // Liquidation check pass for all positions of this symbol
    this.applyLiquidationChecksForSymbol(symbol, updated);

    // Notify subscribers about account/position changes
    this.notifyPositionCallbacks();
    this.notifyAccountCallbacks();

    return true;
  }

  /**
   * Force evaluate liquidation for a symbol using current position and price.
   * If price crosses liquidation threshold, close the position.
   */
  public mockForceLiquidation(symbol: string): boolean {
    if (!symbol) return false;
    const current =
      this.mockPricesMap[symbol] ||
      ({
        coin: symbol,
        price: '0',
        markPrice: '0',
        timestamp: Date.now(),
        percentChange24h: '0',
        bestBid: '0',
        bestAsk: '0',
        spread: '0',
        funding: 0,
        openInterest: 0,
        volume24h: 0,
      } as PriceUpdate);

    const didClose = this.applyLiquidationChecksForSymbol(symbol, current);
    if (didClose) {
      this.notifyPositionCallbacks();
      this.notifyAccountCallbacks();
    }
    return didClose;
  }

  private applyLiquidationChecksForSymbol(
    symbol: string,
    price: PriceUpdate,
  ): boolean {
    const px = parseFloat(price.price);
    let didAnyClose = false;

    // Evaluate each position independently
    const remaining: Position[] = [];
    for (const pos of this.mockPositions) {
      if (pos.coin !== symbol) {
        remaining.push(pos);
        continue;
      }

      const liq = parseFloat(pos.liquidationPrice || '0');
      const isLong = parseFloat(pos.size) >= 0;
      const breached = isLong ? px <= liq : px >= liq;

      if (breached) {
        // Realize PnL and close this position
        const pnl = parseFloat(pos.unrealizedPnl || '0');
        const newAvailableBalance =
          parseFloat(this.mockAccount.availableBalance) +
          parseFloat(pos.marginUsed) +
          pnl;
        const newMarginUsed =
          parseFloat(this.mockAccount.marginUsed) - parseFloat(pos.marginUsed);
        const newTotalBalance = parseFloat(this.mockAccount.totalBalance) + pnl;

        this.mockAccount = {
          ...this.mockAccount,
          availableBalance: newAvailableBalance.toString(),
          marginUsed: newMarginUsed.toString(),
          totalBalance: newTotalBalance.toString(),
        };

        didAnyClose = true;
      } else {
        remaining.push(pos);
      }
    }

    this.mockPositions = remaining;

    // Recompute unrealized and totalValue after potential closures
    if (didAnyClose) {
      const recomputedUnrealized = this.computeTotalUnrealizedPnl();
      this.mockAccount.unrealizedPnl = recomputedUnrealized.toFixed(2);
      this.mockAccount.totalValue = (
        parseFloat(this.mockAccount.totalBalance) + recomputedUnrealized
      ).toFixed(2);
    }

    return didAnyClose;
  }

  private buildDefaultPrices(): Record<string, PriceUpdate> {
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
      SOL: {
        coin: 'SOL',
        price: '100.00',
        timestamp: Date.now(),
        percentChange24h: '-2.3',
        bestBid: '99.90',
        bestAsk: '100.10',
        spread: '0.20',
        markPrice: '100.00',
        funding: 0.003,
        openInterest: 12000000,
        volume24h: 300000,
      },
    };
  }

  private computeTotalUnrealizedPnl(): number {
    return this.mockPositions.reduce((acc, pos) => {
      const val = parseFloat(pos.unrealizedPnl || '0');
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }

  // Update an existing position and notify subscribers (reserved for upcoming tests)
  public mockUpdatePosition(coin: string, updates: Partial<Position>): boolean {
    const index = this.mockPositions.findIndex((p) => p.coin === coin);
    if (index === -1) return false;
    this.mockPositions[index] = { ...this.mockPositions[index], ...updates };
    this.notifyPositionCallbacks();
    return true;
  }
}

export default PerpsE2EMockService;
