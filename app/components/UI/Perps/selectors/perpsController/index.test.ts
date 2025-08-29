import { RootState } from '../../../../../reducers';
import type { AccountState, DepositStatus } from '../../controllers/types';
import {
  selectPerpsProvider,
  selectPerpsAccountState,
  selectPerpsDepositState,
  selectPerpsEligibility,
  selectPerpsNetwork,
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
    } as unknown as RootState);

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
        totalBalance: '5000',
        marginUsed: '1000',
        unrealizedPnl: '50',
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
        totalBalance: '0',
        marginUsed: '0',
        unrealizedPnl: '0',
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
        totalBalance: '6000',
        marginUsed: '1000',
        unrealizedPnl: '500',
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
        totalBalance: '4500',
        marginUsed: '2000',
        unrealizedPnl: '-500',
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
        status: 'idle',
        currentTxHash: null,
        error: null,
      });
    });

    it('returns deposit state from PerpsController', () => {
      // Arrange
      const mockState = createMockState({
        depositStatus: 'depositing',
        currentDepositTxHash: '0x123',
        depositError: null,
      });

      // Act
      const result = selectPerpsDepositState(mockState);

      // Assert
      expect(result).toEqual({
        status: 'depositing',
        currentTxHash: '0x123',
        error: null,
      });
    });

    it('handles error state', () => {
      // Arrange
      const mockState = createMockState({
        depositStatus: 'error',
        currentDepositTxHash: null,
        depositError: 'Transaction failed',
      });

      // Act
      const result = selectPerpsDepositState(mockState);

      // Assert
      expect(result.status).toBe('error');
      expect(result.error).toBe('Transaction failed');
      expect(result.currentTxHash).toBeNull();
    });

    it('handles success state', () => {
      // Arrange
      const mockState = createMockState({
        depositStatus: 'success',
        currentDepositTxHash: '0x456',
        depositError: null,
      });

      // Act
      const result = selectPerpsDepositState(mockState);

      // Assert
      expect(result.status).toBe('success');
      expect(result.currentTxHash).toBe('0x456');
      expect(result.error).toBeNull();
    });

    it('handles missing optional fields with defaults', () => {
      // Arrange
      const mockState = createMockState({
        depositStatus: 'depositing',
        // Missing currentDepositTxHash and depositError
      });

      // Act
      const result = selectPerpsDepositState(mockState);

      // Assert
      expect(result).toEqual({
        status: 'depositing',
        currentTxHash: null,
        error: null,
      });
    });

    it('uses idle status when depositStatus is undefined', () => {
      // Arrange
      const mockState = createMockState({
        // depositStatus is not defined
        currentDepositTxHash: '0x789',
        depositError: null,
      });

      // Act
      const result = selectPerpsDepositState(mockState);

      // Assert
      expect(result).toEqual({
        status: 'idle',
        currentTxHash: '0x789',
        error: null,
      });
    });

    it('handles all deposit status values', () => {
      // Test each possible status
      const statuses: DepositStatus[] = [
        'idle',
        'preparing',
        'depositing',
        'success',
        'error',
      ];

      statuses.forEach((status) => {
        const mockState = createMockState({
          depositStatus: status,
          currentDepositTxHash: '0xabc',
          depositError: status === 'error' ? 'Error message' : null,
        });

        const result = selectPerpsDepositState(mockState);

        expect(result.status).toBe(status);
        expect(result.currentTxHash).toBe('0xabc');
        expect(result.error).toBe(status === 'error' ? 'Error message' : null);
      });
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
        depositStatus: 'idle' as DepositStatus,
        currentDepositTxHash: null,
        depositError: null,
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
        depositStatus: 'success',
        currentDepositTxHash: '0xnested',
        depositError: null,
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
        status: 'success',
        currentTxHash: '0xnested',
        error: null,
      });
      expect(eligibility).toBe(true);
      expect(network).toBe('testnet');
    });
  });
});
