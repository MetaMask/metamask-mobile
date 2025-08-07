import { RootState } from '../../../../../reducers';
import { selectPerpsProvider } from './index';

describe('PerpsController Selectors', () => {
  // Helper function to create a mock state
  const createMockState = (activeProvider?: string): RootState =>
    ({
      engine: {
        backgroundState: {
          PerpsController: {
            activeProvider: activeProvider ?? 'defaultProvider',
          },
        },
      },
    } as RootState);

  describe('selectPerpsProvider', () => {
    it('returns the active provider from PerpsController state', () => {
      // Arrange
      const expectedProvider = 'testProvider';
      const mockState = createMockState(expectedProvider);

      // Act
      const result = selectPerpsProvider(mockState);

      // Assert
      expect(result).toBe(expectedProvider);
    });

    it('returns undefined when activeProvider is not set', () => {
      // Arrange
      const mockState = {
        engine: {
          backgroundState: {
            PerpsController: {
              // activeProvider is not defined
            },
          },
        },
      } as RootState;

      // Act
      const result = selectPerpsProvider(mockState);

      // Assert
      expect(result).toBeUndefined();
    });

    it('memoizes the result when called with the same state', () => {
      // Arrange
      const mockState = createMockState('memoizedProvider');

      // Act
      const result1 = selectPerpsProvider(mockState);
      const result2 = selectPerpsProvider(mockState);

      // Assert
      expect(result1).toBe(result2);
      expect(result1).toBe('memoizedProvider');
    });

    it('returns new value when activeProvider changes', () => {
      // Arrange
      const mockState1 = createMockState('provider1');
      const mockState2 = createMockState('provider2');

      // Act
      const result1 = selectPerpsProvider(mockState1);
      const result2 = selectPerpsProvider(mockState2);

      // Assert
      expect(result1).toBe('provider1');
      expect(result2).toBe('provider2');
      expect(result1).not.toBe(result2);
    });
  });
});
