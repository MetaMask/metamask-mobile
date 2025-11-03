import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useTokenListPolling from './useTokenListPolling';
import { RootState } from '../../../reducers';
import { SolScope } from '@metamask/keyring-api';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenListController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useTokenListPolling', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const selectedChainId = '0x1' as const;
  const state = {
    engine: {
      backgroundState: {
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: SolScope.Mainnet,
          multichainNetworkConfigurationsByChainId: {},
        },
        NetworkController: {
          selectedNetworkClientId: 'selectedNetworkClientId',
          networkConfigurationsByChainId: {
            [selectedChainId]: {
              chainId: selectedChainId,
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
              '0x5': true,
            },
          },
        },
      },
    },
  } as unknown as RootState;

  it('Should poll by selected chain id, and stop polling on dismount', async () => {
    const { unmount } = renderHookWithProvider(() => useTokenListPolling(), {
      state,
    });

    const mockedTokenListController = jest.mocked(
      Engine.context.TokenListController,
    );
    expect(mockedTokenListController.startPolling).toHaveBeenCalledTimes(2);
    expect(mockedTokenListController.startPolling).toHaveBeenCalledWith({
      chainId: selectedChainId,
    });

    expect(
      mockedTokenListController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(0);
    unmount();
    expect(
      mockedTokenListController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(2);
  });

  it('polls enabled EVM networks', () => {
    const { unmount } = renderHookWithProvider(() => useTokenListPolling(), {
      state,
    });

    const mockedTokenListController = jest.mocked(
      Engine.context.TokenListController,
    );

    expect(mockedTokenListController.startPolling).toHaveBeenCalledTimes(2);
    expect(mockedTokenListController.startPolling).toHaveBeenCalledWith({
      chainId: '0x1',
    });
    expect(mockedTokenListController.startPolling).toHaveBeenCalledWith({
      chainId: '0x89',
    });

    unmount();
    expect(
      mockedTokenListController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(2);
  });

  it('Should not poll when evm is not selected', async () => {
    renderHookWithProvider(() => useTokenListPolling(), {
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

    const mockedTokenListController = jest.mocked(
      Engine.context.TokenListController,
    );
    expect(mockedTokenListController.startPolling).toHaveBeenCalledTimes(0);
  });

  it('polls with provided chain ids', () => {
    renderHookWithProvider(
      () => useTokenListPolling({ chainIds: ['0x1', '0x89'] }),
      {
        state,
      },
    );

    const mockedTokenListController = jest.mocked(
      Engine.context.TokenListController,
    );

    expect(mockedTokenListController.startPolling).toHaveBeenCalledTimes(2);
    expect(mockedTokenListController.startPolling).toHaveBeenNthCalledWith(1, {
      chainId: '0x1',
    });
    expect(mockedTokenListController.startPolling).toHaveBeenNthCalledWith(2, {
      chainId: '0x89',
    });
  });

  it('handles empty enabled networks gracefully', () => {
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

    const { unmount } = renderHookWithProvider(() => useTokenListPolling(), {
      state: stateWithEmptyNetworks,
    });

    const mockedTokenListController = jest.mocked(
      Engine.context.TokenListController,
    );

    expect(mockedTokenListController.startPolling).toHaveBeenCalledTimes(0);

    unmount();
    expect(
      mockedTokenListController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(0);
  });
});
