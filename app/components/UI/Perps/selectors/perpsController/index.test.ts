import { RootState } from '../../../../../reducers';
import type { AccountState } from '../../controllers/types';
import { InitializationState } from '../../controllers/PerpsController';
import {
  selectPerpsProvider,
  selectPerpsAccountState,
  selectPerpsDepositState,
  selectPerpsEligibility,
  selectPerpsNetwork,
  selectIsFirstTimePerpsUser,
  selectPerpsInitializationState,
} from './index';

describe('PerpsController Selectors', () => {
  // Helper function to create a mock state with optional PerpsController properties
  const createMockState = (
    perpsController?: Record<string, unknown>,
  ): RootState =>
    ({
      engine: {
        backgroundState: {
          PerpsController: perpsController ?? {
            activeProvider: 'defaultProvider',
          },
        },
      },
    }) as unknown as RootState;

  describe('selectPerpsProvider', () => {
    it('returns the active provider from PerpsController state', () => {
      // Arrange
      const expectedProvider = 'testProvider';
      const mockState = createMockState({
        activeProvider: expectedProvider,
      });

      // Act
      const result = selectPerpsProvider(mockState);

      // Assert
      expect(result).toBe(expectedProvider);
    });

    it('returns undefined when activeProvider is not set', () => {
      // Arrange
      const mockState = createMockState({
        // activeProvider is not defined
      });

      // Act
      const result = selectPerpsProvider(mockState);

      // Assert
      expect(result).toBeUndefined();
    });

    it('memoizes the result when called with the same state', () => {
      // Arrange
      const mockState = createMockState({
        activeProvider: 'memoizedProvider',
      });

      // Act
      const result1 = selectPerpsProvider(mockState);
      const result2 = selectPerpsProvider(mockState);

      // Assert
      expect(result1).toBe(result2);
      expect(result1).toBe('memoizedProvider');
    });

    it('returns new value when activeProvider changes', () => {
      // Arrange
      const mockState1 = createMockState({ activeProvider: 'provider1' });
      const mockState2 = createMockState({ activeProvider: 'provider2' });

      // Act
      const result1 = selectPerpsProvider(mockState1);
      const result2 = selectPerpsProvider(mockState2);

      // Assert
      expect(result1).toBe('provider1');
      expect(result2).toBe('provider2');
      expect(result1).not.toBe(result2);
    });
  });

  describe('selectPerpsAccountState', () => {
    it('returns account state from PerpsController', () => {
      // Arrange
      const mockAccountState: AccountState = {
        availableBalance: '3000',
        marginUsed: '1000',
        unrealizedPnl: '50',
        returnOnEquity: '10.0',
        totalBalance: '5500',
      };

      const mockState = createMockState({
        accountState: mockAccountState,
      });

      // Act
      const result = selectPerpsAccountState(mockState);

      // Assert
      expect(result).toEqual(mockAccountState);
    });

    it('returns null when accountState is undefined', () => {
      // Arrange
      const mockState = createMockState({
        accountState: undefined,
      });

      // Act
      const result = selectPerpsAccountState(mockState);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when PerpsController is undefined', () => {
      // Arrange
      const mockState = createMockState();

      // Act
      const result = selectPerpsAccountState(mockState);

      // Assert
      expect(result).toBeNull();
    });

    it('handles zero balance account state', () => {
      // Arrange
      const mockAccountState: AccountState = {
        availableBalance: '0',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
        totalBalance: '0',
      };

      const mockState = createMockState({
        accountState: mockAccountState,
      });

      // Act
      const result = selectPerpsAccountState(mockState);

      // Assert
      expect(result).toEqual(mockAccountState);
      expect(result?.availableBalance).toBe('0');
      expect(result?.totalBalance).toBe('0');
    });

    it('handles account with positive PnL', () => {
      // Arrange
      const positivePnlState: AccountState = {
        availableBalance: '5000',
        marginUsed: '1000',
        unrealizedPnl: '500',
        returnOnEquity: '100.0',
        totalBalance: '6000',
      };

      const mockState = createMockState({
        accountState: positivePnlState,
      });

      // Act
      const result = selectPerpsAccountState(mockState);

      // Assert
      expect(result?.unrealizedPnl).toBe('500');
      expect(Number(result?.unrealizedPnl)).toBeGreaterThan(0);
    });

    it('handles account with negative PnL', () => {
      // Arrange
      const negativePnlState: AccountState = {
        availableBalance: '3000',
        marginUsed: '2000',
        unrealizedPnl: '-500',
        returnOnEquity: '-25.0',
        totalBalance: '4000',
      };

      const mockState = createMockState({
        accountState: negativePnlState,
      });

      // Act
      const result = selectPerpsAccountState(mockState);

      // Assert
      expect(result?.unrealizedPnl).toBe('-500');
      expect(Number(result?.unrealizedPnl)).toBeLessThan(0);
    });
  });

  describe('selectPerpsDepositState', () => {
    it('returns default state when PerpsController is undefined', () => {
      // Arrange
      const mockState = createMockState();

      // Act
      const result = selectPerpsDepositState(mockState);

      // Assert
      expect(result).toEqual({
        inProgress: false,
        lastResult: null,
      });
    });

    it('returns deposit state from PerpsController', () => {
      // Arrange
      const mockState = createMockState({
        depositInProgress: true,
        lastDepositResult: null,
      });

      // Act
      const result = selectPerpsDepositState(mockState);

      // Assert
      expect(result).toEqual({
        inProgress: true,
        lastResult: null,
      });
    });

    it('handles error state', () => {
      // Arrange
      const mockState = createMockState({
        depositInProgress: false,
        lastDepositResult: {
          success: false,
          error: 'Transaction failed',
        },
      });

      // Act
      const result = selectPerpsDepositState(mockState);

      // Assert
      expect(result.inProgress).toBe(false);
      expect(result.lastResult).toEqual({
        success: false,
        error: 'Transaction failed',
      });
    });

    it('handles success state', () => {
      // Arrange
      const mockState = createMockState({
        depositInProgress: false,
        lastDepositResult: {
          success: true,
          txHash: '0x456',
        },
      });

      // Act
      const result = selectPerpsDepositState(mockState);

      // Assert
      expect(result.inProgress).toBe(false);
      expect(result.lastResult).toEqual({
        success: true,
        txHash: '0x456',
      });
    });

    it('handles missing optional fields with defaults', () => {
      // Arrange
      const mockState = createMockState({
        depositInProgress: true,
        // Missing lastDepositResult
      });

      // Act
      const result = selectPerpsDepositState(mockState);

      // Assert
      expect(result).toEqual({
        inProgress: true,
        lastResult: null,
      });
    });

    it('uses defaults when deposit state is undefined', () => {
      // Arrange
      const mockState = createMockState({
        // depositInProgress and lastDepositResult not defined
      });

      // Act
      const result = selectPerpsDepositState(mockState);

      // Assert
      expect(result).toEqual({
        inProgress: false,
        lastResult: null,
      });
    });

    it('handles all deposit state combinations', () => {
      // Test in progress state
      let mockState = createMockState({
        depositInProgress: true,
        lastDepositResult: null,
      });

      let result = selectPerpsDepositState(mockState);
      expect(result.inProgress).toBe(true);
      expect(result.lastResult).toBeNull();

      // Test success state
      mockState = createMockState({
        depositInProgress: false,
        lastDepositResult: {
          success: true,
          txHash: '0xabc',
        },
      });

      result = selectPerpsDepositState(mockState);
      expect(result.inProgress).toBe(false);
      expect(result.lastResult?.success).toBe(true);
      expect(result.lastResult?.txHash).toBe('0xabc');

      // Test error state
      mockState = createMockState({
        depositInProgress: false,
        lastDepositResult: {
          success: false,
          error: 'Error message',
        },
      });

      result = selectPerpsDepositState(mockState);
      expect(result.inProgress).toBe(false);
      expect(result.lastResult?.success).toBe(false);
      expect(result.lastResult?.error).toBe('Error message');
    });
  });

  describe('selectPerpsEligibility', () => {
    it('returns true when isEligible is true', () => {
      // Arrange
      const mockState = createMockState({
        isEligible: true,
      });

      // Act
      const result = selectPerpsEligibility(mockState);

      // Assert
      expect(result).toBe(true);
    });

    it('returns false when isEligible is false', () => {
      // Arrange
      const mockState = createMockState({
        isEligible: false,
      });

      // Act
      const result = selectPerpsEligibility(mockState);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false when isEligible is undefined', () => {
      // Arrange
      const mockState = createMockState({
        // isEligible is not defined
      });

      // Act
      const result = selectPerpsEligibility(mockState);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false when PerpsController is undefined', () => {
      // Arrange
      const mockState = createMockState();

      // Act
      const result = selectPerpsEligibility(mockState);

      // Assert
      expect(result).toBe(false);
    });

    it('handles truthy values correctly', () => {
      // Test various truthy values - selector returns the actual value, not boolean
      const truthyValues = [true, 1, 'true', {}, []];

      truthyValues.forEach((value) => {
        const mockState = createMockState({
          isEligible: value,
        });

        const result = selectPerpsEligibility(mockState);

        // The selector returns the actual truthy value, not converted to boolean
        expect(result).toBe(value);
      });
    });

    it('handles falsy values correctly', () => {
      // Test various falsy values
      const falsyValues = [false, 0, '', null, undefined];

      falsyValues.forEach((value) => {
        const mockState = createMockState({
          isEligible: value,
        });

        const result = selectPerpsEligibility(mockState);

        expect(result).toBe(false);
      });
    });
  });

  describe('selectPerpsNetwork', () => {
    it('returns testnet when isTestnet is true', () => {
      // Arrange
      const mockState = createMockState({
        isTestnet: true,
      });

      // Act
      const result = selectPerpsNetwork(mockState);

      // Assert
      expect(result).toBe('testnet');
    });

    it('returns mainnet when isTestnet is false', () => {
      // Arrange
      const mockState = createMockState({
        isTestnet: false,
      });

      // Act
      const result = selectPerpsNetwork(mockState);

      // Assert
      expect(result).toBe('mainnet');
    });

    it('returns mainnet when isTestnet is undefined', () => {
      // Arrange
      const mockState = createMockState({
        // isTestnet is not defined
      });

      // Act
      const result = selectPerpsNetwork(mockState);

      // Assert
      expect(result).toBe('mainnet');
    });

    it('returns mainnet when PerpsController is undefined', () => {
      // Arrange
      const mockState = createMockState();

      // Act
      const result = selectPerpsNetwork(mockState);

      // Assert
      expect(result).toBe('mainnet');
    });

    it('handles truthy values as testnet', () => {
      // Test truthy values that should result in testnet
      const truthyValues = [true, 1, 'true', {}, []];

      truthyValues.forEach((value) => {
        const mockState = createMockState({
          isTestnet: value,
        });

        const result = selectPerpsNetwork(mockState);

        expect(result).toBe('testnet');
      });
    });

    it('handles falsy values as mainnet', () => {
      // Test falsy values that should result in mainnet
      const falsyValues = [false, 0, '', null, undefined];

      falsyValues.forEach((value) => {
        const mockState = createMockState({
          isTestnet: value,
        });

        const result = selectPerpsNetwork(mockState);

        expect(result).toBe('mainnet');
      });
    });

    it('properly handles network switching', () => {
      // Test mainnet state
      const mainnetState = createMockState({
        isTestnet: false,
      });

      const mainnetResult = selectPerpsNetwork(mainnetState);
      expect(mainnetResult).toBe('mainnet');

      // Test testnet state
      const testnetState = createMockState({
        isTestnet: true,
      });

      const testnetResult = selectPerpsNetwork(testnetState);
      expect(testnetResult).toBe('testnet');
    });
  });

  describe('selector memoization and composition', () => {
    it('all selectors use createSelector for memoization', () => {
      // Given - a state that will be used multiple times
      const mockState = createMockState({
        activeProvider: 'testProvider',
        accountState: {
          availableBalance: '1000',
          totalBalance: '1000',
          marginUsed: '0',
          unrealizedPnl: '0',
        },
        depositInProgress: false,
        lastDepositResult: null,
        isEligible: true,
        isTestnet: false,
      });

      // When - calling selectors multiple times with same state
      const provider1 = selectPerpsProvider(mockState);
      const provider2 = selectPerpsProvider(mockState);

      const account1 = selectPerpsAccountState(mockState);
      const account2 = selectPerpsAccountState(mockState);

      const deposit1 = selectPerpsDepositState(mockState);
      const deposit2 = selectPerpsDepositState(mockState);

      const eligibility1 = selectPerpsEligibility(mockState);
      const eligibility2 = selectPerpsEligibility(mockState);

      const network1 = selectPerpsNetwork(mockState);
      const network2 = selectPerpsNetwork(mockState);

      // Then - primitive values should be equal
      expect(provider1).toBe(provider2);
      expect(eligibility1).toBe(eligibility2);
      expect(network1).toBe(network2);

      // Object references should be the same due to memoization
      expect(account1).toBe(account2);
      expect(deposit1).toBe(deposit2);
    });

    it('selectors correctly extract nested state paths', () => {
      // Given - a complex state structure
      const complexState = createMockState({
        activeProvider: 'nestedProvider',
        accountState: {
          availableBalance: '5000',
          totalBalance: '6000',
          marginUsed: '1000',
          unrealizedPnl: '100',
        },
        depositInProgress: false,
        lastDepositResult: {
          success: true,
          txHash: '0xnested',
        },
        isEligible: true,
        isTestnet: true,
        // Other properties that should be ignored
        someOtherProperty: 'ignored',
        anotherProperty: { nested: 'also ignored' },
      });

      // When - using selectors
      const provider = selectPerpsProvider(complexState);
      const account = selectPerpsAccountState(complexState);
      const deposit = selectPerpsDepositState(complexState);
      const eligibility = selectPerpsEligibility(complexState);
      const network = selectPerpsNetwork(complexState);

      // Then - they extract only the relevant data
      expect(provider).toBe('nestedProvider');
      expect(account).toEqual({
        availableBalance: '5000',
        totalBalance: '6000',
        marginUsed: '1000',
        unrealizedPnl: '100',
      });
      expect(deposit).toEqual({
        inProgress: false,
        lastResult: {
          success: true,
          txHash: '0xnested',
        },
      });
      expect(eligibility).toBe(true);
      expect(network).toBe('testnet');
    });
  });

  describe('selectIsFirstTimePerpsUser', () => {
    it('returns true when isFirstTimeUser is true for testnet', () => {
      // Arrange
      const mockState = createMockState({
        isFirstTimeUser: {
          testnet: true,
          mainnet: false,
        },
        isTestnet: true,
      });

      // Act
      const result = selectIsFirstTimePerpsUser(mockState);

      // Assert
      expect(result).toBe(true);
    });

    it('returns false when isFirstTimeUser is false for testnet', () => {
      // Arrange
      const mockState = createMockState({
        isFirstTimeUser: {
          testnet: false,
          mainnet: true,
        },
        isTestnet: true,
      });

      // Act
      const result = selectIsFirstTimePerpsUser(mockState);

      // Assert
      expect(result).toBe(false);
    });

    it('returns true when isFirstTimeUser is true for mainnet', () => {
      // Arrange
      const mockState = createMockState({
        isFirstTimeUser: {
          testnet: false,
          mainnet: true,
        },
        isTestnet: false,
      });

      // Act
      const result = selectIsFirstTimePerpsUser(mockState);

      // Assert
      expect(result).toBe(true);
    });

    it('returns false when isFirstTimeUser is false for mainnet', () => {
      // Arrange
      const mockState = createMockState({
        isFirstTimeUser: {
          testnet: true,
          mainnet: false,
        },
        isTestnet: false,
      });

      // Act
      const result = selectIsFirstTimePerpsUser(mockState);

      // Assert
      expect(result).toBe(false);
    });

    it('returns true when isFirstTimeUser is undefined (default state)', () => {
      // Arrange
      const mockState = createMockState({
        isTestnet: true,
        // isFirstTimeUser is undefined
      });

      // Act
      const result = selectIsFirstTimePerpsUser(mockState);

      // Assert
      // Should return true for undefined state (first time user)
      expect(result).toBe(true);
    });

    it('returns true when PerpsController state is undefined', () => {
      // Arrange
      const mockState = createMockState(undefined);

      // Act
      const result = selectIsFirstTimePerpsUser(mockState);

      // Assert
      // Should return true when no state exists (first time user)
      expect(result).toBe(true);
    });

    it('handles missing network state gracefully for testnet', () => {
      // Arrange
      const mockState = createMockState({
        isFirstTimeUser: {
          mainnet: false,
          // testnet is undefined
        },
        isTestnet: true,
      });

      // Act
      const result = selectIsFirstTimePerpsUser(mockState);

      // Assert
      // Should return true for undefined testnet state
      expect(result).toBe(true);
    });

    it('handles missing network state gracefully for mainnet', () => {
      // Arrange
      const mockState = createMockState({
        isFirstTimeUser: {
          testnet: false,
          // mainnet is undefined
        },
        isTestnet: false,
      });

      // Act
      const result = selectIsFirstTimePerpsUser(mockState);

      // Assert
      // Should return true for undefined mainnet state
      expect(result).toBe(true);
    });
  });

  describe('selectPerpsInitializationState', () => {
    it('returns UNINITIALIZED when perpsControllerState is undefined', () => {
      // Arrange
      const mockState = {
        engine: {
          backgroundState: {
            PerpsController: undefined,
          },
        },
      } as unknown as RootState;

      // Act
      const result = selectPerpsInitializationState(mockState);

      // Assert
      expect(result).toBe(InitializationState.UNINITIALIZED);
    });
  });
});
