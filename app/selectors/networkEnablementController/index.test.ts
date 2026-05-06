import {
  selectNetworkEnablementControllerState,
  selectEnabledNetworksByNamespace,
  selectEVMEnabledNetworks,
  selectNonEVMEnabledNetworks,
} from './index';
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
              '0xe708': false,
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
    it('returns the network enablement controller state', () => {
      const result = selectNetworkEnablementControllerState(mockState);

      expect(result).toBe(
        mockState.engine.backgroundState.NetworkEnablementController,
      );
      expect(result).toEqual({
        enabledNetworkMap: {
          eip155: {
            '0x1': true,
            '0x2105': true,
            '0xe708': false,
          },
          solana: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
          },
        },
      });
    });

    it('returns undefined when NetworkEnablementController state does not exist', () => {
      const stateWithoutNetworkEnablement = {
        engine: {
          backgroundState: {},
        },
      } as unknown as RootState;

      const result = selectNetworkEnablementControllerState(
        stateWithoutNetworkEnablement,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when backgroundState does not exist', () => {
      const stateWithoutBackgroundState = {
        engine: {},
      } as unknown as RootState;

      const result = selectNetworkEnablementControllerState(
        stateWithoutBackgroundState,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when engine state does not exist', () => {
      const stateWithoutEngine = {} as unknown as RootState;

      const result = selectNetworkEnablementControllerState(stateWithoutEngine);

      expect(result).toBeUndefined();
    });

    it('handles empty enabledNetworkMap', () => {
      const stateWithEmptyMap = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: {},
            },
          },
        },
      } as unknown as RootState;

      const result = selectNetworkEnablementControllerState(stateWithEmptyMap);

      expect(result).toEqual({
        enabledNetworkMap: {},
      });
    });
  });

  describe('selectEnabledNetworksByNamespace', () => {
    it('returns enabled networks map by namespace', () => {
      const result = selectEnabledNetworksByNamespace(mockState);

      expect(result).toEqual({
        eip155: {
          '0x1': true,
          '0x2105': true,
          '0xe708': false,
        },
        solana: {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
        },
      });
    });

    it('returns empty object when enabledNetworkMap is empty', () => {
      const stateWithEmptyMap = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: {},
            },
          },
        },
      } as unknown as RootState;

      const result = selectEnabledNetworksByNamespace(stateWithEmptyMap);

      expect(result).toEqual({});
    });
  });

  describe('selectEVMEnabledNetworks', () => {
    it('returns only enabled EVM networks as chain IDs', () => {
      const result = selectEVMEnabledNetworks(mockState);

      expect(result).toEqual(['0x1', '0x2105']);
    });

    it('returns empty array when no EVM networks are enabled', () => {
      const stateWithDisabledEVM = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: {
                eip155: {
                  '0x1': false,
                  '0x2105': false,
                },
                solana: {
                  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectEVMEnabledNetworks(stateWithDisabledEVM);

      expect(result).toEqual([]);
    });

    it('returns empty array when eip155 namespace is undefined', () => {
      const stateWithoutEIP155 = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: {
                solana: {
                  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectEVMEnabledNetworks(stateWithoutEIP155);

      expect(result).toEqual([]);
    });

    it('returns empty array when enabledNetworksByNamespace is undefined', () => {
      const stateWithoutMap = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {},
          },
        },
      } as unknown as RootState;

      const result = selectEVMEnabledNetworks(stateWithoutMap);

      expect(result).toEqual([]);
    });

    it('returns empty array when eip155 object is empty', () => {
      const stateWithEmptyEIP155 = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: {
                eip155: {},
                solana: {
                  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectEVMEnabledNetworks(stateWithEmptyEIP155);

      expect(result).toEqual([]);
    });

    it('handles mixed enabled and disabled EVM networks', () => {
      const stateWithMixedEVM = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: {
                eip155: {
                  '0x1': true,
                  '0x2105': false,
                  '0xe708': true,
                  '0x89': false,
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectEVMEnabledNetworks(stateWithMixedEVM);

      expect(result).toEqual(['0x1', '0xe708']);
    });
  });

  describe('selectNonEVMEnabledNetworks', () => {
    it('returns enabled non-EVM networks across namespaces', () => {
      // Arrange / Act
      const result = selectNonEVMEnabledNetworks(mockState);

      // Assert
      expect(result).toEqual(['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp']);
    });

    it('excludes eip155 (EVM) namespace even if enabled', () => {
      // Arrange
      const stateWithMixed = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: {
                eip155: {
                  '0x1': true,
                },
                solana: {
                  'solana:mainnet': true,
                },
              },
            },
          },
        },
      } as unknown as RootState;

      // Act
      const result = selectNonEVMEnabledNetworks(stateWithMixed);

      // Assert
      expect(result).toEqual(['solana:mainnet']);
    });

    it('handles multiple non-EVM namespaces with mixed enabled flags', () => {
      // Arrange
      const stateWithMultiple = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: {
                eip155: {
                  '0x1': true,
                  '0x2105': false,
                },
                solana: {
                  'solana:mainnet': true,
                  'solana:testnet': false,
                },
                cosmos: {
                  'cosmos:cosmoshub-4': true,
                  'cosmos:osmosis-1': false,
                },
              },
            },
          },
        },
      } as unknown as RootState;

      // Act
      const result = selectNonEVMEnabledNetworks(stateWithMultiple);

      // Assert
      expect(result.sort()).toEqual(
        ['solana:mainnet', 'cosmos:cosmoshub-4'].sort(),
      );
    });

    it('returns empty array when there are no non-EVM namespaces', () => {
      // Arrange
      const stateOnlyEvm = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: {
                eip155: {
                  '0x1': true,
                },
              },
            },
          },
        },
      } as unknown as RootState;

      // Act
      const result = selectNonEVMEnabledNetworks(stateOnlyEvm);

      // Assert
      expect(result).toEqual([]);
    });

    it('returns empty array when enabledNetworkMap is undefined', () => {
      // Arrange
      const stateWithoutMap = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {},
          },
        },
      } as unknown as RootState;

      // Act
      const result = selectNonEVMEnabledNetworks(stateWithoutMap);

      // Assert
      expect(result).toEqual([]);
    });

    it('returns empty array when non-EVM namespaces are present but empty', () => {
      // Arrange
      const stateWithEmptyNonEvm = {
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: {
                solana: {},
              },
            },
          },
        },
      } as unknown as RootState;

      // Act
      const result = selectNonEVMEnabledNetworks(stateWithEmptyNonEvm);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
