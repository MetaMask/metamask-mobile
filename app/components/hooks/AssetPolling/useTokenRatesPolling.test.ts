import useTokenRatesPolling from './useTokenRatesPolling';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import { RootState } from '../../../reducers';
import { SolScope } from '@metamask/keyring-api';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenRatesController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useTokenRatesPolling', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const state = {
    engine: {
      backgroundState: {
        TokenRatesController: {
          marketData: {},
        },
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: SolScope.Mainnet,
          multichainNetworkConfigurationsByChainId: {},
        },
        NetworkController: {
          selectedNetworkClientId: 'selectedNetworkClientId',
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              rpcEndpoints: [
                {
                  networkClientId: 'selectedNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
            },
            '0x89': {
              chainId: '0x89',
              rpcEndpoints: [
                {
                  networkClientId: 'selectedNetworkClientId2',
                },
              ],
              defaultRpcEndpointIndex: 0,
            },
            '0x5': {
              chainId: '0x5',
              rpcEndpoints: [
                {
                  networkClientId: 'selectedNetworkClientId3',
                },
              ],
              defaultRpcEndpointIndex: 0,
            },
          },
        },
        PreferencesController: {
          useTokenDetection: true,
          tokenNetworkFilter: {
            '0x1': true,
            '0x89': true,
          },
        },
        NetworkEnablementController: {
          enabledNetworkMap: {
            eip155: {
              '0x1': true,
              '0x89': true,
              '0x5': false,
            },
          },
        },
      },
    },
  } as unknown as RootState;

  it('Should poll by provided chain ids, and stop polling on dismount', async () => {
    const { unmount } = renderHookWithProvider(
      () => useTokenRatesPolling({ chainIds: ['0x1'] }),
      { state },
    );

    const mockedTokenRatesController = jest.mocked(
      Engine.context.TokenRatesController,
    );

    expect(mockedTokenRatesController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedTokenRatesController.startPolling).toHaveBeenCalledWith({
      chainIds: ['0x1'],
    });

    expect(
      mockedTokenRatesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(0);
    unmount();
    expect(
      mockedTokenRatesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('Should not poll when evm is not selected', async () => {
    renderHookWithProvider(() => useTokenRatesPolling(), {
      state: {
        ...state,
        engine: {
          ...state.engine,
          backgroundState: {
            ...state.engine.backgroundState,
            MultichainNetworkController: {
              ...state.engine.backgroundState.MultichainNetworkController,
              isEvmSelected: false,
            },
          },
        },
      },
    });

    const mockedTokenRatesController = jest.mocked(
      Engine.context.TokenRatesController,
    );
    expect(mockedTokenRatesController.startPolling).toHaveBeenCalledTimes(0);
  });

  it('polls with provided chain ids', () => {
    renderHookWithProvider(
      () => useTokenRatesPolling({ chainIds: ['0x1', '0x89'] }),
      {
        state,
      },
    );

    const mockedTokenRatesController = jest.mocked(
      Engine.context.TokenRatesController,
    );

    expect(mockedTokenRatesController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedTokenRatesController.startPolling).toHaveBeenCalledWith({
      chainIds: ['0x1', '0x89'],
    });
  });

  describe('Feature flag scenarios', () => {
    it('should poll enabled EVM networks when global network selector is removed', () => {
      const { unmount } = renderHookWithProvider(() => useTokenRatesPolling(), {
        state,
      });

      const mockedTokenRatesController = jest.mocked(
        Engine.context.TokenRatesController,
      );

      expect(mockedTokenRatesController.startPolling).toHaveBeenCalledTimes(1);
      expect(mockedTokenRatesController.startPolling).toHaveBeenCalledWith({
        // group poll popular networks, does not poll custom networks
        chainIds: ['0x1', '0x89'],
      });

      unmount();
      expect(
        mockedTokenRatesController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle empty enabled networks gracefully', () => {
      const stateWithEmptyNetworks = {
        ...state,
        engine: {
          ...state.engine,
          backgroundState: {
            ...state.engine.backgroundState,
            NetworkEnablementController: {
              enabledNetworkMap: {
                eip155: {},
              },
            },
          },
        },
      };

      const { unmount } = renderHookWithProvider(() => useTokenRatesPolling(), {
        state: stateWithEmptyNetworks,
      });

      const mockedTokenRatesController = jest.mocked(
        Engine.context.TokenRatesController,
      );

      expect(mockedTokenRatesController.startPolling).not.toHaveBeenCalled();

      unmount();
      expect(
        mockedTokenRatesController.stopPollingByPollingToken,
      ).not.toHaveBeenCalled();
    });
  });
});
