/**
 * Unit tests for HyperLiquid Order Book Processor
 */

import type { BboWsEvent, L2BookResponse } from '@nktkas/hyperliquid';
import type { PriceUpdate } from '../controllers/types';
import {
  processBboData,
  processL2BookData,
  type OrderBookCacheEntry,
  type ProcessBboDataParams,
  type ProcessL2BookDataParams,
} from './hyperLiquidOrderBookProcessor';

describe('hyperLiquidOrderBookProcessor', () => {
  let mockOrderBookCache: Map<string, OrderBookCacheEntry>;
  let mockCachedPriceData: Map<string, PriceUpdate>;
  let mockCreatePriceUpdate: jest.Mock;
  let mockNotifySubscribers: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderBookCache = new Map();
    mockCachedPriceData = new Map();
    mockCreatePriceUpdate = jest.fn((symbol: string, price: string) => ({
      symbol,
      price,
      timestamp: Date.now(),
    }));
    mockNotifySubscribers = jest.fn();
  });

  describe('processL2BookData', () => {
    it('processes valid L2 book data with bid and ask', () => {
      const symbol = 'BTC';
      const data: L2BookResponse = {
        coin: 'BTC',
        time: Date.now(),
        levels: [
          [{ px: '49900', sz: '1.5', n: 3 }], // Bid level
          [{ px: '50100', sz: '2.0', n: 5 }], // Ask level
        ],
      };

      mockCachedPriceData.set('BTC', {
        symbol: 'BTC',
        price: '50000',
        timestamp: Date.now(),
      });

      const params: ProcessL2BookDataParams = {
        symbol,
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      const cacheEntry = mockOrderBookCache.get('BTC');
      expect(cacheEntry).toBeDefined();
      expect(cacheEntry?.bestBid).toBe('49900');
      expect(cacheEntry?.bestAsk).toBe('50100');
      expect(cacheEntry?.spread).toBe('200.00000');
      expect(cacheEntry?.lastUpdated).toBeGreaterThan(0);
      expect(mockCreatePriceUpdate).toHaveBeenCalledWith('BTC', '50000');
      expect(mockNotifySubscribers).toHaveBeenCalledTimes(1);
    });

    it('returns early when symbol does not match', () => {
      const data: L2BookResponse = {
        coin: 'ETH',
        time: Date.now(),
        levels: [
          [{ px: '3000', sz: '1.0', n: 2 }],
          [{ px: '3100', sz: '1.0', n: 2 }],
        ],
      };

      const params: ProcessL2BookDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      expect(mockOrderBookCache.size).toBe(0);
      expect(mockCreatePriceUpdate).not.toHaveBeenCalled();
      expect(mockNotifySubscribers).not.toHaveBeenCalled();
    });

    it('returns early when levels data is missing', () => {
      const data = {
        coin: 'BTC',
        time: Date.now(),
        levels: undefined,
      } as unknown as L2BookResponse;

      const params: ProcessL2BookDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      expect(mockOrderBookCache.size).toBe(0);
      expect(mockCreatePriceUpdate).not.toHaveBeenCalled();
      expect(mockNotifySubscribers).not.toHaveBeenCalled();
    });

    it('returns early when both bid and ask are missing', () => {
      const data: L2BookResponse = {
        coin: 'BTC',
        time: Date.now(),
        levels: [[], []],
      };

      const params: ProcessL2BookDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      expect(mockOrderBookCache.size).toBe(0);
      expect(mockCreatePriceUpdate).not.toHaveBeenCalled();
      expect(mockNotifySubscribers).not.toHaveBeenCalled();
    });

    it('processes data with only bid present', () => {
      const data: L2BookResponse = {
        coin: 'BTC',
        time: Date.now(),
        levels: [[{ px: '49900', sz: '1.5', n: 3 }], []],
      };

      mockCachedPriceData.set('BTC', {
        symbol: 'BTC',
        price: '50000',
        timestamp: Date.now(),
      });

      const params: ProcessL2BookDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      const cacheEntry = mockOrderBookCache.get('BTC');
      expect(cacheEntry).toBeDefined();
      expect(cacheEntry?.bestBid).toBe('49900');
      expect(cacheEntry?.bestAsk).toBeUndefined();
      expect(cacheEntry?.spread).toBeUndefined();
      expect(mockNotifySubscribers).toHaveBeenCalledTimes(1);
    });

    it('processes data with only ask present', () => {
      const data: L2BookResponse = {
        coin: 'BTC',
        time: Date.now(),
        levels: [[], [{ px: '50100', sz: '2.0', n: 5 }]],
      };

      mockCachedPriceData.set('BTC', {
        symbol: 'BTC',
        price: '50000',
        timestamp: Date.now(),
      });

      const params: ProcessL2BookDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      const cacheEntry = mockOrderBookCache.get('BTC');
      expect(cacheEntry).toBeDefined();
      expect(cacheEntry?.bestBid).toBeUndefined();
      expect(cacheEntry?.bestAsk).toBe('50100');
      expect(cacheEntry?.spread).toBeUndefined();
      expect(mockNotifySubscribers).toHaveBeenCalledTimes(1);
    });

    it('returns early when no cached price data exists for symbol', () => {
      const data: L2BookResponse = {
        coin: 'BTC',
        time: Date.now(),
        levels: [
          [{ px: '49900', sz: '1.5', n: 3 }],
          [{ px: '50100', sz: '2.0', n: 5 }],
        ],
      };

      const params: ProcessL2BookDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      expect(mockOrderBookCache.get('BTC')).toBeDefined();
      expect(mockCreatePriceUpdate).not.toHaveBeenCalled();
      expect(mockNotifySubscribers).not.toHaveBeenCalled();
    });

    it('handles null cachedPriceData gracefully', () => {
      const data: L2BookResponse = {
        coin: 'BTC',
        time: Date.now(),
        levels: [
          [{ px: '49900', sz: '1.5', n: 3 }],
          [{ px: '50100', sz: '2.0', n: 5 }],
        ],
      };

      const params: ProcessL2BookDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: null,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      expect(mockOrderBookCache.get('BTC')).toBeDefined();
      expect(mockCreatePriceUpdate).not.toHaveBeenCalled();
      expect(mockNotifySubscribers).not.toHaveBeenCalled();
    });

    it('calculates spread correctly with valid bid and ask', () => {
      const data: L2BookResponse = {
        coin: 'BTC',
        time: Date.now(),
        levels: [
          [{ px: '50000', sz: '1.0', n: 1 }],
          [{ px: '50005', sz: '1.0', n: 1 }],
        ],
      };

      mockCachedPriceData.set('BTC', {
        symbol: 'BTC',
        price: '50000',
        timestamp: Date.now(),
      });

      const params: ProcessL2BookDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      const cacheEntry = mockOrderBookCache.get('BTC');
      expect(cacheEntry?.spread).toBe('5.00000');
    });

    it('sets spread to undefined when only bid is present', () => {
      const data: L2BookResponse = {
        coin: 'ETH',
        time: Date.now(),
        levels: [[{ px: '3000', sz: '1.0', n: 1 }], []],
      };

      mockCachedPriceData.set('ETH', {
        symbol: 'ETH',
        price: '3000',
        timestamp: Date.now(),
      });

      const params: ProcessL2BookDataParams = {
        symbol: 'ETH',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      const cacheEntry = mockOrderBookCache.get('ETH');
      expect(cacheEntry?.spread).toBeUndefined();
    });

    it('updates cached price data with newly created price update', () => {
      const existingPrice: PriceUpdate = {
        symbol: 'BTC',
        price: '50000',
        timestamp: Date.now() - 1000,
      };

      const newPrice: PriceUpdate = {
        symbol: 'BTC',
        price: '50000',
        timestamp: Date.now(),
      };

      mockCachedPriceData.set('BTC', existingPrice);
      mockCreatePriceUpdate.mockReturnValue(newPrice);

      const data: L2BookResponse = {
        coin: 'BTC',
        time: Date.now(),
        levels: [
          [{ px: '49900', sz: '1.5', n: 3 }],
          [{ px: '50100', sz: '2.0', n: 5 }],
        ],
      };

      const params: ProcessL2BookDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      expect(mockCachedPriceData.get('BTC')).toEqual(newPrice);
      expect(mockCachedPriceData.get('BTC')?.timestamp).toBeGreaterThan(
        existingPrice.timestamp,
      );
    });

    it('updates order book cache with timestamp', () => {
      const beforeTimestamp = Date.now();

      const data: L2BookResponse = {
        coin: 'SOL',
        time: Date.now(),
        levels: [
          [{ px: '100', sz: '10', n: 1 }],
          [{ px: '101', sz: '10', n: 1 }],
        ],
      };

      mockCachedPriceData.set('SOL', {
        symbol: 'SOL',
        price: '100',
        timestamp: Date.now(),
      });

      const params: ProcessL2BookDataParams = {
        symbol: 'SOL',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      const cacheEntry = mockOrderBookCache.get('SOL');
      expect(cacheEntry?.lastUpdated).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(cacheEntry?.lastUpdated).toBeLessThanOrEqual(Date.now());
    });

    it('calls notifySubscribers only when price data is updated', () => {
      const data: L2BookResponse = {
        coin: 'BTC',
        time: Date.now(),
        levels: [
          [{ px: '49900', sz: '1.5', n: 3 }],
          [{ px: '50100', sz: '2.0', n: 5 }],
        ],
      };

      mockCachedPriceData.set('BTC', {
        symbol: 'BTC',
        price: '50000',
        timestamp: Date.now(),
      });

      const params: ProcessL2BookDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      expect(mockNotifySubscribers).toHaveBeenCalledTimes(1);
    });

    it('does not call notifySubscribers when cached price data is null', () => {
      const data: L2BookResponse = {
        coin: 'BTC',
        time: Date.now(),
        levels: [
          [{ px: '49900', sz: '1.5', n: 3 }],
          [{ px: '50100', sz: '2.0', n: 5 }],
        ],
      };

      const params: ProcessL2BookDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: null,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processL2BookData(params);

      expect(mockNotifySubscribers).not.toHaveBeenCalled();
    });

    it('processes multiple symbols independently', () => {
      mockCachedPriceData.set('BTC', {
        symbol: 'BTC',
        price: '50000',
        timestamp: Date.now(),
      });
      mockCachedPriceData.set('ETH', {
        symbol: 'ETH',
        price: '3000',
        timestamp: Date.now(),
      });

      const btcData: L2BookResponse = {
        coin: 'BTC',
        time: Date.now(),
        levels: [
          [{ px: '49900', sz: '1.5', n: 3 }],
          [{ px: '50100', sz: '2.0', n: 5 }],
        ],
      };

      const ethData: L2BookResponse = {
        coin: 'ETH',
        time: Date.now(),
        levels: [
          [{ px: '2990', sz: '5.0', n: 2 }],
          [{ px: '3010', sz: '5.0', n: 2 }],
        ],
      };

      processL2BookData({
        symbol: 'BTC',
        data: btcData,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      });

      processL2BookData({
        symbol: 'ETH',
        data: ethData,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      });

      const btcCache = mockOrderBookCache.get('BTC');
      const ethCache = mockOrderBookCache.get('ETH');

      expect(btcCache?.bestBid).toBe('49900');
      expect(btcCache?.bestAsk).toBe('50100');
      expect(ethCache?.bestBid).toBe('2990');
      expect(ethCache?.bestAsk).toBe('3010');
      expect(mockNotifySubscribers).toHaveBeenCalledTimes(2);
    });
  });

  describe('processBboData', () => {
    it('processes valid BBO data with bid and ask', () => {
      const symbol = 'BTC';
      const data: BboWsEvent = {
        coin: 'BTC',
        time: Date.now(),
        bbo: [
          { px: '49900', sz: '1.5', n: 3 }, // Bid
          { px: '50100', sz: '2.0', n: 5 }, // Ask
        ],
      };

      mockCachedPriceData.set('BTC', {
        symbol: 'BTC',
        price: '50000',
        timestamp: Date.now(),
      });

      const params: ProcessBboDataParams = {
        symbol,
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processBboData(params);

      const cacheEntry = mockOrderBookCache.get('BTC');
      expect(cacheEntry).toBeDefined();
      expect(cacheEntry?.bestBid).toBe('49900');
      expect(cacheEntry?.bestAsk).toBe('50100');
      expect(cacheEntry?.spread).toBe('200.00000');
      expect(cacheEntry?.lastUpdated).toBeGreaterThan(0);
      expect(mockCreatePriceUpdate).toHaveBeenCalledWith('BTC', '50000');
      expect(mockNotifySubscribers).toHaveBeenCalledTimes(1);
    });

    it('returns early when coin does not match symbol', () => {
      const data: BboWsEvent = {
        coin: 'ETH',
        time: Date.now(),
        bbo: [
          { px: '2990', sz: '5.0', n: 2 },
          { px: '3010', sz: '5.0', n: 2 },
        ],
      };

      const params: ProcessBboDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processBboData(params);

      expect(mockOrderBookCache.size).toBe(0);
      expect(mockCreatePriceUpdate).not.toHaveBeenCalled();
      expect(mockNotifySubscribers).not.toHaveBeenCalled();
    });

    it('returns early when both bid and ask are missing', () => {
      const data = {
        coin: 'BTC',
        time: Date.now(),
        bbo: [undefined, undefined],
      } as unknown as BboWsEvent;

      const params: ProcessBboDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processBboData(params);

      expect(mockOrderBookCache.size).toBe(0);
      expect(mockCreatePriceUpdate).not.toHaveBeenCalled();
      expect(mockNotifySubscribers).not.toHaveBeenCalled();
    });

    it('updates order book cache but does not notify when no cached price exists', () => {
      const data: BboWsEvent = {
        coin: 'BTC',
        time: Date.now(),
        bbo: [
          { px: '49900', sz: '1.5', n: 3 },
          { px: '50100', sz: '2.0', n: 5 },
        ],
      };

      const params: ProcessBboDataParams = {
        symbol: 'BTC',
        data,
        orderBookCache: mockOrderBookCache,
        cachedPriceData: mockCachedPriceData,
        createPriceUpdate: mockCreatePriceUpdate,
        notifySubscribers: mockNotifySubscribers,
      };

      processBboData(params);

      expect(mockOrderBookCache.get('BTC')).toBeDefined();
      expect(mockCreatePriceUpdate).not.toHaveBeenCalled();
      expect(mockNotifySubscribers).not.toHaveBeenCalled();
    });
  });
});
