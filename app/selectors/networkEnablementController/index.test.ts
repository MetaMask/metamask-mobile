import {
  selectNetworkEnablementControllerState,
  selectEnabledNetworksByNamespace,
  selectEVMEnabledNetworks,
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
});
