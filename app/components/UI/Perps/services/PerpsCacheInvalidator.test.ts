import { PerpsCacheInvalidator, type CacheType } from './PerpsCacheInvalidator';

describe('PerpsCacheInvalidator', () => {
  beforeEach(() => {
    // Clear all subscribers before each test
    PerpsCacheInvalidator._clearAllSubscribers();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance on multiple calls', () => {
      // The exported PerpsCacheInvalidator is already a singleton
      // We can verify by checking that subscriber counts persist
      const callback = jest.fn();
      PerpsCacheInvalidator.subscribe('positions', callback);

      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(1);
    });
  });

  describe('subscribe()', () => {
    it('adds a subscriber for a cache type', () => {
      const callback = jest.fn();

      PerpsCacheInvalidator.subscribe('positions', callback);

      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(1);
    });

    it('allows multiple subscribers for the same cache type', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      PerpsCacheInvalidator.subscribe('positions', callback1);
      PerpsCacheInvalidator.subscribe('positions', callback2);
      PerpsCacheInvalidator.subscribe('positions', callback3);

      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(3);
    });

    it('allows subscribers for different cache types', () => {
      const positionsCallback = jest.fn();
      const accountCallback = jest.fn();
      const marketsCallback = jest.fn();

      PerpsCacheInvalidator.subscribe('positions', positionsCallback);
      PerpsCacheInvalidator.subscribe('accountState', accountCallback);
      PerpsCacheInvalidator.subscribe('markets', marketsCallback);

      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(1);
      expect(PerpsCacheInvalidator.getSubscriberCount('accountState')).toBe(1);
      expect(PerpsCacheInvalidator.getSubscriberCount('markets')).toBe(1);
    });

    it('returns an unsubscribe function', () => {
      const callback = jest.fn();

      const unsubscribe = PerpsCacheInvalidator.subscribe(
        'positions',
        callback,
      );

      expect(typeof unsubscribe).toBe('function');
    });

    it('unsubscribe function removes the subscriber', () => {
      const callback = jest.fn();

      const unsubscribe = PerpsCacheInvalidator.subscribe(
        'positions',
        callback,
      );
      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(1);

      unsubscribe();
      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(0);
    });

    it('unsubscribe only removes the specific subscriber', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const unsubscribe1 = PerpsCacheInvalidator.subscribe(
        'positions',
        callback1,
      );
      PerpsCacheInvalidator.subscribe('positions', callback2);

      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(2);

      unsubscribe1();
      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(1);

      // callback2 should still be called on invalidation
      PerpsCacheInvalidator.invalidate('positions');
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('handles calling unsubscribe multiple times gracefully', () => {
      const callback = jest.fn();

      const unsubscribe = PerpsCacheInvalidator.subscribe(
        'positions',
        callback,
      );

      unsubscribe();
      unsubscribe(); // Should not throw
      unsubscribe(); // Should not throw

      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(0);
    });
  });

  describe('invalidate()', () => {
    it('calls all subscribers for the specified cache type', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      PerpsCacheInvalidator.subscribe('positions', callback1);
      PerpsCacheInvalidator.subscribe('positions', callback2);

      PerpsCacheInvalidator.invalidate('positions');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('does not call subscribers for other cache types', () => {
      const positionsCallback = jest.fn();
      const accountCallback = jest.fn();

      PerpsCacheInvalidator.subscribe('positions', positionsCallback);
      PerpsCacheInvalidator.subscribe('accountState', accountCallback);

      PerpsCacheInvalidator.invalidate('positions');

      expect(positionsCallback).toHaveBeenCalledTimes(1);
      expect(accountCallback).not.toHaveBeenCalled();
    });

    it('handles invalidate with no subscribers gracefully', () => {
      // Should not throw
      expect(() => {
        PerpsCacheInvalidator.invalidate('positions');
      }).not.toThrow();
    });

    it('continues calling other subscribers if one throws an error', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const successCallback = jest.fn();

      PerpsCacheInvalidator.subscribe('positions', errorCallback);
      PerpsCacheInvalidator.subscribe('positions', successCallback);

      // Should not throw
      expect(() => {
        PerpsCacheInvalidator.invalidate('positions');
      }).not.toThrow();

      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(successCallback).toHaveBeenCalledTimes(1);
    });

    it('can be called multiple times', () => {
      const callback = jest.fn();

      PerpsCacheInvalidator.subscribe('positions', callback);

      PerpsCacheInvalidator.invalidate('positions');
      PerpsCacheInvalidator.invalidate('positions');
      PerpsCacheInvalidator.invalidate('positions');

      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  describe('invalidateAll()', () => {
    it('calls all subscribers for all cache types', () => {
      const positionsCallback = jest.fn();
      const accountCallback = jest.fn();
      const marketsCallback = jest.fn();

      PerpsCacheInvalidator.subscribe('positions', positionsCallback);
      PerpsCacheInvalidator.subscribe('accountState', accountCallback);
      PerpsCacheInvalidator.subscribe('markets', marketsCallback);

      PerpsCacheInvalidator.invalidateAll();

      expect(positionsCallback).toHaveBeenCalledTimes(1);
      expect(accountCallback).toHaveBeenCalledTimes(1);
      expect(marketsCallback).toHaveBeenCalledTimes(1);
    });

    it('handles invalidateAll with no subscribers gracefully', () => {
      // Should not throw
      expect(() => {
        PerpsCacheInvalidator.invalidateAll();
      }).not.toThrow();
    });

    it('continues calling subscribers even if some throw errors', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const positionsCallback = jest.fn();
      const marketsCallback = jest.fn();

      PerpsCacheInvalidator.subscribe('positions', errorCallback);
      PerpsCacheInvalidator.subscribe('positions', positionsCallback);
      PerpsCacheInvalidator.subscribe('markets', marketsCallback);

      expect(() => {
        PerpsCacheInvalidator.invalidateAll();
      }).not.toThrow();

      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(positionsCallback).toHaveBeenCalledTimes(1);
      expect(marketsCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSubscriberCount()', () => {
    it('returns 0 for cache types with no subscribers', () => {
      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(0);
      expect(PerpsCacheInvalidator.getSubscriberCount('accountState')).toBe(0);
      expect(PerpsCacheInvalidator.getSubscriberCount('markets')).toBe(0);
    });

    it('returns correct count after subscribing', () => {
      PerpsCacheInvalidator.subscribe('positions', jest.fn());
      PerpsCacheInvalidator.subscribe('positions', jest.fn());

      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(2);
    });

    it('returns correct count after unsubscribing', () => {
      const unsub1 = PerpsCacheInvalidator.subscribe('positions', jest.fn());
      PerpsCacheInvalidator.subscribe('positions', jest.fn());

      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(2);

      unsub1();
      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(1);
    });
  });

  describe('_clearAllSubscribers()', () => {
    it('removes all subscribers for all cache types', () => {
      PerpsCacheInvalidator.subscribe('positions', jest.fn());
      PerpsCacheInvalidator.subscribe('positions', jest.fn());
      PerpsCacheInvalidator.subscribe('accountState', jest.fn());
      PerpsCacheInvalidator.subscribe('markets', jest.fn());

      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(2);
      expect(PerpsCacheInvalidator.getSubscriberCount('accountState')).toBe(1);
      expect(PerpsCacheInvalidator.getSubscriberCount('markets')).toBe(1);

      PerpsCacheInvalidator._clearAllSubscribers();

      expect(PerpsCacheInvalidator.getSubscriberCount('positions')).toBe(0);
      expect(PerpsCacheInvalidator.getSubscriberCount('accountState')).toBe(0);
      expect(PerpsCacheInvalidator.getSubscriberCount('markets')).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('simulates usePerpsPositionForAsset subscribing and receiving invalidation', () => {
      const clearCache = jest.fn();
      const refetch = jest.fn();

      // Simulate hook subscription
      const unsubPositions = PerpsCacheInvalidator.subscribe(
        'positions',
        () => {
          clearCache();
          refetch();
        },
      );
      const unsubAccount = PerpsCacheInvalidator.subscribe(
        'accountState',
        () => {
          clearCache();
          refetch();
        },
      );

      // Simulate TradingService closing a position
      PerpsCacheInvalidator.invalidate('positions');
      PerpsCacheInvalidator.invalidate('accountState');

      expect(clearCache).toHaveBeenCalledTimes(2);
      expect(refetch).toHaveBeenCalledTimes(2);

      // Cleanup (simulates useEffect cleanup)
      unsubPositions();
      unsubAccount();

      // After cleanup, invalidation should not trigger callbacks
      clearCache.mockClear();
      refetch.mockClear();

      PerpsCacheInvalidator.invalidate('positions');
      expect(clearCache).not.toHaveBeenCalled();
      expect(refetch).not.toHaveBeenCalled();
    });

    it('handles multiple hooks subscribing to the same cache type', () => {
      const hook1Callback = jest.fn();
      const hook2Callback = jest.fn();
      const hook3Callback = jest.fn();

      // Multiple token detail pages open simultaneously
      const unsub1 = PerpsCacheInvalidator.subscribe(
        'positions',
        hook1Callback,
      );
      const unsub2 = PerpsCacheInvalidator.subscribe(
        'positions',
        hook2Callback,
      );
      const unsub3 = PerpsCacheInvalidator.subscribe(
        'positions',
        hook3Callback,
      );

      // Position closed - all hooks should be notified
      PerpsCacheInvalidator.invalidate('positions');

      expect(hook1Callback).toHaveBeenCalledTimes(1);
      expect(hook2Callback).toHaveBeenCalledTimes(1);
      expect(hook3Callback).toHaveBeenCalledTimes(1);

      // One hook unmounts
      unsub2();

      PerpsCacheInvalidator.invalidate('positions');

      expect(hook1Callback).toHaveBeenCalledTimes(2);
      expect(hook2Callback).toHaveBeenCalledTimes(1); // Not called again
      expect(hook3Callback).toHaveBeenCalledTimes(2);

      // Cleanup remaining
      unsub1();
      unsub3();
    });

    it('supports all defined cache types', () => {
      const cacheTypes: CacheType[] = ['positions', 'accountState', 'markets'];

      cacheTypes.forEach((type) => {
        const callback = jest.fn();
        const unsub = PerpsCacheInvalidator.subscribe(type, callback);

        PerpsCacheInvalidator.invalidate(type);
        expect(callback).toHaveBeenCalledTimes(1);

        unsub();
      });
    });
  });
});
