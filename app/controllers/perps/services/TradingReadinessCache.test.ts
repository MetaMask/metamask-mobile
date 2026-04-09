import {
  TradingReadinessCache,
  PerpsSigningCache,
} from './TradingReadinessCache';

describe('TradingReadinessCache / PerpsSigningCache', () => {
  // Both exports reference the same singleton instance
  describe('Singleton Pattern', () => {
    it('TradingReadinessCache and PerpsSigningCache are the same instance', () => {
      expect(TradingReadinessCache).toBe(PerpsSigningCache);
    });
  });

  beforeEach(() => {
    // Clear all cache entries before each test
    TradingReadinessCache.clearAll();
  });

  describe('DEX Abstraction (Legacy API)', () => {
    const network = 'mainnet' as const;
    const userAddress = '0x1234567890123456789012345678901234567890';

    describe('get()', () => {
      it('returns undefined when no entry exists', () => {
        const result = TradingReadinessCache.get(network, userAddress);
        expect(result).toBeUndefined();
      });

      it('returns entry with correct structure when set', () => {
        TradingReadinessCache.set(network, userAddress, {
          attempted: true,
          enabled: true,
        });

        const result = TradingReadinessCache.get(network, userAddress);
        expect(result).toEqual({
          attempted: true,
          enabled: true,
          timestamp: expect.any(Number),
        });
      });

      it('normalizes address to lowercase for cache key', () => {
        const mixedCaseAddress = '0xAbCdEf1234567890123456789012345678901234';
        TradingReadinessCache.set(network, mixedCaseAddress, {
          attempted: true,
          enabled: false,
        });

        // Should be accessible with lowercase address
        const result = TradingReadinessCache.get(
          network,
          mixedCaseAddress.toLowerCase(),
        );
        expect(result).toBeDefined();
        expect(result?.attempted).toBe(true);
      });
    });

    describe('set()', () => {
      it('creates new entry when none exists', () => {
        expect(TradingReadinessCache.size()).toBe(0);

        TradingReadinessCache.set(network, userAddress, {
          attempted: true,
          enabled: true,
        });

        expect(TradingReadinessCache.size()).toBe(1);
      });

      it('updates timestamp on each set', () => {
        // Use fake timers to control timestamp
        jest.useFakeTimers();
        const startTime = Date.now();

        TradingReadinessCache.set(network, userAddress, {
          attempted: true,
          enabled: false,
        });
        const firstTimestamp = TradingReadinessCache.get(
          network,
          userAddress,
        )?.timestamp;

        // Advance time by 100ms
        jest.advanceTimersByTime(100);

        TradingReadinessCache.set(network, userAddress, {
          attempted: true,
          enabled: true,
        });
        const secondTimestamp = TradingReadinessCache.get(
          network,
          userAddress,
        )?.timestamp;

        expect(firstTimestamp).toBeGreaterThanOrEqual(startTime);
        expect(secondTimestamp).toBeGreaterThan(firstTimestamp as number);

        jest.useRealTimers();
      });

      it('differentiates between mainnet and testnet', () => {
        TradingReadinessCache.set('mainnet', userAddress, {
          attempted: true,
          enabled: true,
        });
        TradingReadinessCache.set('testnet', userAddress, {
          attempted: true,
          enabled: false,
        });

        expect(TradingReadinessCache.get('mainnet', userAddress)?.enabled).toBe(
          true,
        );
        expect(TradingReadinessCache.get('testnet', userAddress)?.enabled).toBe(
          false,
        );
      });
    });
  });

  describe('Builder Fee API', () => {
    const network = 'testnet' as const;
    const userAddress = '0xBuilderFeeUser123456789012345678901234';

    describe('getBuilderFee()', () => {
      it('returns undefined when no entry exists', () => {
        const result = PerpsSigningCache.getBuilderFee(network, userAddress);
        expect(result).toBeUndefined();
      });

      it('returns builder fee state when set', () => {
        PerpsSigningCache.setBuilderFee(network, userAddress, {
          attempted: true,
          success: true,
        });

        const result = PerpsSigningCache.getBuilderFee(network, userAddress);
        expect(result).toEqual({
          attempted: true,
          success: true,
        });
      });
    });

    describe('setBuilderFee()', () => {
      it('creates entry if it does not exist', () => {
        PerpsSigningCache.setBuilderFee(network, userAddress, {
          attempted: true,
          success: false,
        });

        const result = PerpsSigningCache.getBuilderFee(network, userAddress);
        expect(result?.attempted).toBe(true);
        expect(result?.success).toBe(false);
      });

      it('updates existing entry without affecting other fields', () => {
        // Set DEX abstraction first
        TradingReadinessCache.set(network, userAddress, {
          attempted: true,
          enabled: true,
        });

        // Set builder fee
        PerpsSigningCache.setBuilderFee(network, userAddress, {
          attempted: true,
          success: true,
        });

        // Both should be preserved
        const dexResult = TradingReadinessCache.get(network, userAddress);
        const builderResult = PerpsSigningCache.getBuilderFee(
          network,
          userAddress,
        );

        expect(dexResult?.enabled).toBe(true);
        expect(builderResult?.success).toBe(true);
      });
    });
  });

  describe('Referral API', () => {
    const network = 'mainnet' as const;
    const userAddress = '0xReferralUser1234567890123456789012345';

    describe('getReferral()', () => {
      it('returns undefined when no entry exists', () => {
        const result = PerpsSigningCache.getReferral(network, userAddress);
        expect(result).toBeUndefined();
      });

      it('returns referral state when set', () => {
        PerpsSigningCache.setReferral(network, userAddress, {
          attempted: true,
          success: false,
        });

        const result = PerpsSigningCache.getReferral(network, userAddress);
        expect(result).toEqual({
          attempted: true,
          success: false,
        });
      });
    });

    describe('setReferral()', () => {
      it('creates entry if it does not exist', () => {
        PerpsSigningCache.setReferral(network, userAddress, {
          attempted: true,
          success: true,
        });

        const result = PerpsSigningCache.getReferral(network, userAddress);
        expect(result?.attempted).toBe(true);
        expect(result?.success).toBe(true);
      });
    });
  });

  describe('In-Flight Lock Methods', () => {
    const network = 'mainnet' as const;
    const userAddress = '0xInFlightUser12345678901234567890123456';

    describe('isInFlight()', () => {
      it('returns undefined when no in-flight operation', () => {
        const result = PerpsSigningCache.isInFlight(
          'dexAbstraction',
          network,
          userAddress,
        );
        expect(result).toBeUndefined();
      });

      it('returns promise when operation is in-flight', () => {
        PerpsSigningCache.setInFlight('dexAbstraction', network, userAddress);

        const result = PerpsSigningCache.isInFlight(
          'dexAbstraction',
          network,
          userAddress,
        );
        expect(result).toBeInstanceOf(Promise);
      });

      it('differentiates by operation type', () => {
        // Use unique addresses to avoid state pollution from other tests
        const uniqueAddress = '0xUniqueAddressForDifferentiationTest123';

        // Set only builderFee in-flight
        const completeBuilder = PerpsSigningCache.setInFlight(
          'builderFee',
          network,
          uniqueAddress,
        );

        // Different operation type should not be in-flight
        expect(
          PerpsSigningCache.isInFlight(
            'dexAbstraction',
            network,
            uniqueAddress,
          ),
        ).toBeUndefined();
        expect(
          PerpsSigningCache.isInFlight('builderFee', network, uniqueAddress),
        ).toBeInstanceOf(Promise);

        // Clean up
        completeBuilder();
      });

      it('normalizes address to lowercase', () => {
        const mixedCaseAddress = '0xMixedCaseUser123456789012345678901234';
        PerpsSigningCache.setInFlight(
          'referral',
          network,
          mixedCaseAddress.toUpperCase(),
        );

        const result = PerpsSigningCache.isInFlight(
          'referral',
          network,
          mixedCaseAddress.toLowerCase(),
        );
        expect(result).toBeInstanceOf(Promise);
      });
    });

    describe('setInFlight()', () => {
      it('returns a completion function', () => {
        const complete = PerpsSigningCache.setInFlight(
          'dexAbstraction',
          network,
          userAddress,
        );
        expect(typeof complete).toBe('function');
      });

      it('calling completion function removes in-flight status', () => {
        const complete = PerpsSigningCache.setInFlight(
          'dexAbstraction',
          network,
          userAddress,
        );

        // Should be in-flight
        expect(
          PerpsSigningCache.isInFlight('dexAbstraction', network, userAddress),
        ).toBeDefined();

        // Complete the operation
        complete();

        // Should no longer be in-flight
        expect(
          PerpsSigningCache.isInFlight('dexAbstraction', network, userAddress),
        ).toBeUndefined();
      });

      it('calling completion function resolves waiting promises', async () => {
        const complete = PerpsSigningCache.setInFlight(
          'builderFee',
          network,
          userAddress,
        );

        const waitingPromise = PerpsSigningCache.isInFlight(
          'builderFee',
          network,
          userAddress,
        );

        // Start waiting
        let resolved = false;
        const waitPromise = waitingPromise?.then(() => {
          resolved = true;
        });

        // Should not be resolved yet
        expect(resolved).toBe(false);

        // Complete the operation
        complete();

        // Wait for resolution
        await waitPromise;
        expect(resolved).toBe(true);
      });

      it('handles multiple concurrent waiters', async () => {
        const complete = PerpsSigningCache.setInFlight(
          'referral',
          network,
          userAddress,
        );

        const waitingPromise = PerpsSigningCache.isInFlight(
          'referral',
          network,
          userAddress,
        );

        // Multiple waiters
        const results: boolean[] = [];
        const waiter1 = waitingPromise?.then(() => results.push(true));
        const waiter2 = waitingPromise?.then(() => results.push(true));
        const waiter3 = waitingPromise?.then(() => results.push(true));

        // Complete and wait
        complete();
        await Promise.all([waiter1, waiter2, waiter3]);

        expect(results).toHaveLength(3);
        expect(results.every((r) => r === true)).toBe(true);
      });
    });
  });

  describe('General Methods', () => {
    const mainnetAddress = '0xMainnetUser1234567890123456789012345';
    const testnetAddress = '0xTestnetUser1234567890123456789012345';

    describe('clearDexAbstraction()', () => {
      it('clears only DEX abstraction state, preserving other states', () => {
        // Setup all three operation states
        TradingReadinessCache.set('mainnet', mainnetAddress, {
          attempted: true,
          enabled: true,
        });
        PerpsSigningCache.setBuilderFee('mainnet', mainnetAddress, {
          attempted: true,
          success: true,
        });
        PerpsSigningCache.setReferral('mainnet', mainnetAddress, {
          attempted: true,
          success: true,
        });

        // Clear only DEX abstraction
        TradingReadinessCache.clearDexAbstraction('mainnet', mainnetAddress);

        // DEX abstraction should be reset
        const dexResult = TradingReadinessCache.get('mainnet', mainnetAddress);
        expect(dexResult?.attempted).toBe(false);
        expect(dexResult?.enabled).toBe(false);

        // Builder fee and referral should be preserved
        expect(
          PerpsSigningCache.getBuilderFee('mainnet', mainnetAddress)?.success,
        ).toBe(true);
        expect(
          PerpsSigningCache.getReferral('mainnet', mainnetAddress)?.success,
        ).toBe(true);

        // Entry should still exist
        expect(TradingReadinessCache.size()).toBe(1);
      });

      it('does nothing when entry does not exist', () => {
        TradingReadinessCache.clearDexAbstraction('mainnet', mainnetAddress);
        expect(TradingReadinessCache.size()).toBe(0);
      });
    });

    describe('clearBuilderFee()', () => {
      it('clears only builder fee state, preserving other states', () => {
        // Setup all three operation states
        TradingReadinessCache.set('mainnet', mainnetAddress, {
          attempted: true,
          enabled: true,
        });
        PerpsSigningCache.setBuilderFee('mainnet', mainnetAddress, {
          attempted: true,
          success: true,
        });
        PerpsSigningCache.setReferral('mainnet', mainnetAddress, {
          attempted: true,
          success: true,
        });

        // Clear only builder fee
        TradingReadinessCache.clearBuilderFee('mainnet', mainnetAddress);

        // Builder fee should be reset
        const builderResult = PerpsSigningCache.getBuilderFee(
          'mainnet',
          mainnetAddress,
        );
        expect(builderResult?.attempted).toBe(false);
        expect(builderResult?.success).toBe(false);

        // DEX abstraction and referral should be preserved
        expect(
          TradingReadinessCache.get('mainnet', mainnetAddress)?.enabled,
        ).toBe(true);
        expect(
          PerpsSigningCache.getReferral('mainnet', mainnetAddress)?.success,
        ).toBe(true);
      });

      it('does nothing when entry does not exist', () => {
        TradingReadinessCache.clearBuilderFee('mainnet', mainnetAddress);
        expect(TradingReadinessCache.size()).toBe(0);
      });
    });

    describe('clearReferral()', () => {
      it('clears only referral state, preserving other states', () => {
        // Setup all three operation states
        TradingReadinessCache.set('mainnet', mainnetAddress, {
          attempted: true,
          enabled: true,
        });
        PerpsSigningCache.setBuilderFee('mainnet', mainnetAddress, {
          attempted: true,
          success: true,
        });
        PerpsSigningCache.setReferral('mainnet', mainnetAddress, {
          attempted: true,
          success: true,
        });

        // Clear only referral
        TradingReadinessCache.clearReferral('mainnet', mainnetAddress);

        // Referral should be reset
        const referralResult = PerpsSigningCache.getReferral(
          'mainnet',
          mainnetAddress,
        );
        expect(referralResult?.attempted).toBe(false);
        expect(referralResult?.success).toBe(false);

        // DEX abstraction and builder fee should be preserved
        expect(
          TradingReadinessCache.get('mainnet', mainnetAddress)?.enabled,
        ).toBe(true);
        expect(
          PerpsSigningCache.getBuilderFee('mainnet', mainnetAddress)?.success,
        ).toBe(true);
      });

      it('does nothing when entry does not exist', () => {
        TradingReadinessCache.clearReferral('mainnet', mainnetAddress);
        expect(TradingReadinessCache.size()).toBe(0);
      });
    });

    describe('clear()', () => {
      it('removes entire cache entry (all signing states)', () => {
        TradingReadinessCache.set('mainnet', mainnetAddress, {
          attempted: true,
          enabled: true,
        });
        PerpsSigningCache.setBuilderFee('mainnet', mainnetAddress, {
          attempted: true,
          success: true,
        });
        TradingReadinessCache.set('testnet', testnetAddress, {
          attempted: true,
          enabled: false,
        });

        expect(TradingReadinessCache.size()).toBe(2);

        TradingReadinessCache.clear('mainnet', mainnetAddress);

        expect(TradingReadinessCache.size()).toBe(1);
        // Entire entry including builder fee should be gone
        expect(
          TradingReadinessCache.get('mainnet', mainnetAddress),
        ).toBeUndefined();
        expect(
          PerpsSigningCache.getBuilderFee('mainnet', mainnetAddress),
        ).toBeUndefined();
        expect(
          TradingReadinessCache.get('testnet', testnetAddress),
        ).toBeDefined();
      });

      it('does nothing when entry does not exist', () => {
        TradingReadinessCache.set('mainnet', mainnetAddress, {
          attempted: true,
          enabled: true,
        });

        expect(TradingReadinessCache.size()).toBe(1);

        // Clear non-existent entry
        TradingReadinessCache.clear('testnet', testnetAddress);

        expect(TradingReadinessCache.size()).toBe(1);
      });
    });

    describe('clearAll()', () => {
      it('removes all cache entries', () => {
        TradingReadinessCache.set('mainnet', mainnetAddress, {
          attempted: true,
          enabled: true,
        });
        TradingReadinessCache.set('testnet', testnetAddress, {
          attempted: true,
          enabled: false,
        });
        PerpsSigningCache.setBuilderFee('mainnet', mainnetAddress, {
          attempted: true,
          success: true,
        });

        expect(TradingReadinessCache.size()).toBe(2);

        TradingReadinessCache.clearAll();

        expect(TradingReadinessCache.size()).toBe(0);
      });
    });

    describe('getAll()', () => {
      it('returns a copy of all cache entries', () => {
        TradingReadinessCache.set('mainnet', mainnetAddress, {
          attempted: true,
          enabled: true,
        });

        const allEntries = TradingReadinessCache.getAll();

        expect(allEntries).toBeInstanceOf(Map);
        expect(allEntries.size).toBe(1);

        // Verify it's a copy (modifying returned map doesn't affect cache)
        allEntries.clear();
        expect(TradingReadinessCache.size()).toBe(1);
      });
    });

    describe('size()', () => {
      it('returns correct count of entries', () => {
        expect(TradingReadinessCache.size()).toBe(0);

        TradingReadinessCache.set('mainnet', mainnetAddress, {
          attempted: true,
          enabled: true,
        });
        expect(TradingReadinessCache.size()).toBe(1);

        TradingReadinessCache.set('testnet', mainnetAddress, {
          attempted: true,
          enabled: false,
        });
        expect(TradingReadinessCache.size()).toBe(2);
      });
    });

    describe('debugState()', () => {
      it('returns empty string for empty cache', () => {
        const state = TradingReadinessCache.debugState();
        expect(state).toBe('(empty)');
      });

      it('returns formatted string with all entries', () => {
        TradingReadinessCache.set('mainnet', mainnetAddress, {
          attempted: true,
          enabled: true,
        });
        PerpsSigningCache.setBuilderFee('mainnet', mainnetAddress, {
          attempted: true,
          success: false,
        });
        PerpsSigningCache.setReferral('mainnet', mainnetAddress, {
          attempted: false,
          success: false,
        });

        const state = TradingReadinessCache.debugState();

        expect(state).toContain('mainnet:');
        expect(state).toContain('dex=true/true');
        expect(state).toContain('builder=true/false');
        expect(state).toContain('referral=false/false');
      });
    });
  });

  describe('Integration Scenarios', () => {
    const userAddress = '0xIntegrationUser12345678901234567890123';

    it('tracks all three signing operations for same user/network', () => {
      const network = 'mainnet' as const;

      // Set all three operations
      TradingReadinessCache.set(network, userAddress, {
        attempted: true,
        enabled: true,
      });
      PerpsSigningCache.setBuilderFee(network, userAddress, {
        attempted: true,
        success: true,
      });
      PerpsSigningCache.setReferral(network, userAddress, {
        attempted: true,
        success: false,
      });

      // All should be retrievable
      expect(TradingReadinessCache.get(network, userAddress)?.enabled).toBe(
        true,
      );
      expect(
        PerpsSigningCache.getBuilderFee(network, userAddress)?.success,
      ).toBe(true);
      expect(PerpsSigningCache.getReferral(network, userAddress)?.success).toBe(
        false,
      );

      // Single entry in cache (all operations share same entry)
      expect(TradingReadinessCache.size()).toBe(1);
    });

    it('handles concurrent in-flight operations of different types', async () => {
      const network = 'mainnet' as const;

      // Start all three operations
      const completeDex = PerpsSigningCache.setInFlight(
        'dexAbstraction',
        network,
        userAddress,
      );
      const completeBuilder = PerpsSigningCache.setInFlight(
        'builderFee',
        network,
        userAddress,
      );
      const completeReferral = PerpsSigningCache.setInFlight(
        'referral',
        network,
        userAddress,
      );

      // All should be in-flight
      expect(
        PerpsSigningCache.isInFlight('dexAbstraction', network, userAddress),
      ).toBeDefined();
      expect(
        PerpsSigningCache.isInFlight('builderFee', network, userAddress),
      ).toBeDefined();
      expect(
        PerpsSigningCache.isInFlight('referral', network, userAddress),
      ).toBeDefined();

      // Complete them in different order
      completeBuilder();
      expect(
        PerpsSigningCache.isInFlight('builderFee', network, userAddress),
      ).toBeUndefined();
      expect(
        PerpsSigningCache.isInFlight('dexAbstraction', network, userAddress),
      ).toBeDefined();

      completeDex();
      completeReferral();

      // All should be cleared
      expect(
        PerpsSigningCache.isInFlight('dexAbstraction', network, userAddress),
      ).toBeUndefined();
      expect(
        PerpsSigningCache.isInFlight('referral', network, userAddress),
      ).toBeUndefined();
    });

    it('isolates cache between different users on same network', () => {
      const network = 'mainnet' as const;
      const user1 = '0xUser1000000000000000000000000000000001';
      const user2 = '0xUser2000000000000000000000000000000002';

      TradingReadinessCache.set(network, user1, {
        attempted: true,
        enabled: true,
      });
      TradingReadinessCache.set(network, user2, {
        attempted: true,
        enabled: false,
      });

      expect(TradingReadinessCache.get(network, user1)?.enabled).toBe(true);
      expect(TradingReadinessCache.get(network, user2)?.enabled).toBe(false);
    });

    it('isolates cache between networks for same user', () => {
      TradingReadinessCache.set('mainnet', userAddress, {
        attempted: true,
        enabled: true,
      });
      TradingReadinessCache.set('testnet', userAddress, {
        attempted: true,
        enabled: false,
      });

      expect(TradingReadinessCache.get('mainnet', userAddress)?.enabled).toBe(
        true,
      );
      expect(TradingReadinessCache.get('testnet', userAddress)?.enabled).toBe(
        false,
      );

      // Two separate entries
      expect(TradingReadinessCache.size()).toBe(2);
    });
  });
});
