import { getOrderDirection, willFlipPosition } from './orderUtils';
import { strings } from '../../../../../locales/i18n';
import { OrderParams } from '../controllers/types';
import { Position } from '../hooks';

// Mock the i18n module
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

describe('getOrderDirection', () => {
  const mockStrings = strings as jest.MockedFunction<typeof strings>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mock return values
    mockStrings.mockImplementation((key: string) => {
      if (key === 'perps.market.long') return 'Long';
      if (key === 'perps.market.short') return 'Short';
      return key;
    });
  });

  describe('when no position exists', () => {
    it('returns "Long" for buy side', () => {
      const result = getOrderDirection('buy', undefined);
      expect(result).toBe('Long');
      expect(mockStrings).toHaveBeenCalledWith('perps.market.long');
    });

    it('returns "Short" for sell side', () => {
      const result = getOrderDirection('sell', undefined);
      expect(result).toBe('Short');
      expect(mockStrings).toHaveBeenCalledWith('perps.market.short');
    });

    it('treats null position size as no position', () => {
      const result = getOrderDirection('buy', null as unknown as string);
      expect(result).toBe('Long');
      expect(mockStrings).toHaveBeenCalledWith('perps.market.long');
    });
  });

  describe('when position exists', () => {
    it('returns "Long" for positive position size', () => {
      const result = getOrderDirection('sell', '100');
      expect(result).toBe('Long');
      expect(mockStrings).toHaveBeenCalledWith('perps.market.long');
    });

    it('returns "Short" for negative position size', () => {
      const result = getOrderDirection('buy', '-100');
      expect(result).toBe('Short');
      expect(mockStrings).toHaveBeenCalledWith('perps.market.short');
    });

    it('handles decimal position sizes', () => {
      const result = getOrderDirection('sell', '0.5');
      expect(result).toBe('Long');
      expect(mockStrings).toHaveBeenCalledWith('perps.market.long');
    });
  });
});

describe('willFlipPosition', () => {
  const mockPosition: Position = {
    size: '100',
    entryPrice: '50000',
    unrealizedPnl: '100',
    liquidationPrice: '40000',
    leverage: { type: 'isolated', value: 2 },
    coin: 'BTC',
    positionValue: '100000',
    marginUsed: '2500',
    maxLeverage: 20,
    returnOnEquity: '0',
    cumulativeFunding: {
      allTime: '0',
      sinceOpen: '0',
      sinceChange: '0',
    },
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  const mockOrderParams: OrderParams = {
    coin: 'BTC',
    isBuy: false,
    size: '150',
    orderType: 'market',
    reduceOnly: false,
  };

  it('returns false when reduceOnly is true', () => {
    const orderParams = { ...mockOrderParams, reduceOnly: true };
    const result = willFlipPosition(mockPosition, orderParams);
    expect(result).toBe(false);
  });

  it('returns false when orderType is not market', () => {
    const orderParams = {
      ...mockOrderParams,
      orderType: 'limit' as OrderParams['orderType'],
    };
    const result = willFlipPosition(mockPosition, orderParams);
    expect(result).toBe(false);
  });

  it('returns false when position and order direction match', () => {
    const orderParams = { ...mockOrderParams, isBuy: true };
    const result = willFlipPosition(mockPosition, orderParams);
    expect(result).toBe(false);
  });

  it('returns true when order size exceeds absolute position size', () => {
    const result = willFlipPosition(mockPosition, mockOrderParams);
    expect(result).toBe(true);
  });

  it('returns false when order size does not exceed absolute position size', () => {
    const orderParams = { ...mockOrderParams, size: '50' };
    const result = willFlipPosition(mockPosition, orderParams);
    expect(result).toBe(false);
  });

  it('handles negative position sizes correctly', () => {
    const negativePosition = { ...mockPosition, size: '-100' };
    const result = willFlipPosition(negativePosition, mockOrderParams);
    expect(result).toBe(false);
  });

  it('returns false when order size equals position size', () => {
    const currentPosition: Position = {
      coin: 'BTC',
      size: '0.5',
      entryPrice: '45000',
      positionValue: '22500',
      unrealizedPnl: '0',
      marginUsed: '500',
      leverage: { type: 'isolated', value: 5 },
      liquidationPrice: '40000',
      maxLeverage: 20,
      returnOnEquity: '0',
      cumulativeFunding: {
        allTime: '0',
        sinceOpen: '0',
        sinceChange: '0',
      },
      takeProfitCount: 0,
      stopLossCount: 0,
    };

    const orderParams: OrderParams = {
      coin: 'BTC',
      isBuy: false,
      size: '0.5',
      orderType: 'market',
    };

    const result = willFlipPosition(currentPosition, orderParams);
    expect(result).toBe(false);
  });

  it('handles negative position sizes correctly', () => {
    const currentPosition: Position = {
      coin: 'BTC',
      size: '-0.5',
      entryPrice: '45000',
      positionValue: '22500',
      unrealizedPnl: '0',
      marginUsed: '500',
      leverage: { type: 'isolated', value: 5 },
      liquidationPrice: '40000',
      maxLeverage: 20,
      returnOnEquity: '0',
      cumulativeFunding: {
        allTime: '0',
        sinceOpen: '0',
        sinceChange: '0',
      },
      takeProfitCount: 0,
      stopLossCount: 0,
    };

    const orderParams: OrderParams = {
      coin: 'BTC',
      isBuy: true,
      size: '1.0',
      orderType: 'market',
    };

    const result = willFlipPosition(currentPosition, orderParams);
    expect(result).toBe(true);
  });
});
