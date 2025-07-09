import { selectNetworkEnablementControllerState } from './index';
import { RootState } from '../../reducers';

describe('NetworkEnablementController Selectors', () => {
  const mockState = {
    engine: {
      backgroundState: {
        NetworkEnablementController: {
          enabledNetworkMap: {
            eip155: {
              '0x1': true,
              '0x2105': true,
              '0xe708': true,
            },
            solana: {
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
            },
          },
        },
      },
    },
  } as unknown as RootState;

  describe('selectNetworkEnablementControllerState', () => {
    it('should return the network enablement controller state', () => {
      // Arrange - mockState is already set up

      // Act
      const result = selectNetworkEnablementControllerState(mockState);

      // Assert
      expect(result).toBe(
        mockState.engine.backgroundState.NetworkEnablementController,
      );
      expect(result).toEqual({
        enabledNetworkMap: {
          eip155: {
            '0x1': true,
            '0x2105': true,
            '0xe708': true,
          },
          solana: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
          },
        },
      });
    });

    it('should return undefined when NetworkEnablementController state does not exist', () => {
      // Arrange
      const stateWithoutNetworkEnablement = {
        engine: {
          backgroundState: {
            // NetworkEnablementController is missing
          },
        },
      } as unknown as RootState;

      // Act
      const result = selectNetworkEnablementControllerState(
        stateWithoutNetworkEnablement,
      );

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when backgroundState does not exist', () => {
      // Arrange
      const stateWithoutBackgroundState = {
        engine: {
          // backgroundState is missing
        },
      } as unknown as RootState;

      // Act
      const result = selectNetworkEnablementControllerState(
        stateWithoutBackgroundState,
      );

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when engine state does not exist', () => {
      // Arrange
      const stateWithoutEngine = {
        // engine is missing
      } as unknown as RootState;

      // Act
      const result = selectNetworkEnablementControllerState(stateWithoutEngine);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle empty enabledNetworkMap', () => {
      // Arrange
      const stateWithEmptyMap = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: {},
            },
          },
        },
      } as unknown as RootState;

      // Act
      const result = selectNetworkEnablementControllerState(stateWithEmptyMap);

      // Assert
      expect(result).toEqual({
        enabledNetworkMap: {},
      });
    });
  });
});
