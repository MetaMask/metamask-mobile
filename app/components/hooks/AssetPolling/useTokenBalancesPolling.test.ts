import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useTokenBalancesPolling from './useTokenBalancesPolling';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../util/networks';
import { RootState } from '../../../reducers';
import { SolScope } from '@metamask/keyring-api';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenBalancesController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useTokenBalancesPolling', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const selectedChainId = '0x1' as const;
  const state = {
    engine: {
      backgroundState: {
        TokenBalancesController: {
          tokenBalances: {},
        },
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
          tokenNetworkFilter: {
            [selectedChainId]: true,
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

  it('should poll by selected chain id when portfolio view is disabled', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

    const { unmount } = renderHookWithProvider(
      () => useTokenBalancesPolling(),
      {
        state,
      },
    );

    const mockedTokenBalancesController = jest.mocked(
      Engine.context.TokenBalancesController,
    );

    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
      chainId: selectedChainId,
    });

    unmount();
    expect(
      mockedTokenBalancesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('should poll all network configurations when portfolio view is enabled and global network selector is not removed', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
    jest
      .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
      .mockReturnValue(false);

    const { unmount } = renderHookWithProvider(
      () => useTokenBalancesPolling(),
      {
        state,
      },
    );

    const mockedTokenBalancesController = jest.mocked(
      Engine.context.TokenBalancesController,
    );

    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(2); // For both chain IDs
    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
      chainId: selectedChainId,
    });
    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
      chainId: '0x89',
    });

    unmount();
    expect(
      mockedTokenBalancesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(2);
  });

  it('should use provided chainIds when specified, even with portfolio view enabled', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);

    const specificChainIds = ['0x5' as const];
    const { unmount } = renderHookWithProvider(
      () => useTokenBalancesPolling({ chainIds: specificChainIds }),
      { state },
    );

    const mockedTokenBalancesController = jest.mocked(
      Engine.context.TokenBalancesController,
    );

    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
      chainId: '0x5',
    });

    unmount();
    expect(
      mockedTokenBalancesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('should poll only for current network if selected one is not popular', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
    jest
      .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
      .mockReturnValue(false);

    const { unmount } = renderHookWithProvider(
      () => useTokenBalancesPolling(),
      {
        state: {
          ...state,
          engine: {
            ...state.engine,
            backgroundState: {
              ...state.engine.backgroundState,
              AccountsController: {
                internalAccounts: {
                  selectedAccount: '1',
                  accounts: {
                    '1': {
                      address: undefined,
                    },
                  },
                },
              },
              NetworkController: {
                selectedNetworkClientId: 'selectedNetworkClientId',
                networkConfigurationsByChainId: {
                  '0x82750': {
                    chainId: '0x82750',
                    rpcEndpoints: [
                      {
                        networkClientId: 'selectedNetworkClientId',
                      },
                    ],
                    defaultRpcEndpointIndex: 0,
                  },
                },
              },
              MultichainNetworkController: {
                isEvmSelected: true,
                selectedMultichainNetworkChainId: SolScope.Mainnet,
                multichainNetworkConfigurationsByChainId: {},
              },
            },
          },
        },
      },
    );

    const mockedTokenBalancesController = jest.mocked(
      Engine.context.TokenBalancesController,
    );

    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
      chainId: '0x82750',
    });

    unmount();
    expect(
      mockedTokenBalancesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('Should not poll when evm is not selected', async () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

    renderHookWithProvider(() => useTokenBalancesPolling(), {
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

    const mockedTokenBalancesController = jest.mocked(
      Engine.context.TokenBalancesController,
    );
    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(0);
  });

  it('polls with provided chain ids', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

    renderHookWithProvider(
      () => useTokenBalancesPolling({ chainIds: ['0x1', '0x89'] }),
      {
        state,
      },
    );

    const mockedTokenBalancesController = jest.mocked(
      Engine.context.TokenBalancesController,
    );

    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(2);
    expect(mockedTokenBalancesController.startPolling).toHaveBeenNthCalledWith(
      1,
      {
        chainId: '0x1',
      },
    );
    expect(mockedTokenBalancesController.startPolling).toHaveBeenNthCalledWith(
      2,
      {
        chainId: '0x89',
      },
    );
  });

  describe('Feature flag scenarios', () => {
    it('should poll enabled EVM networks when global network selector is removed and portfolio view is enabled', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
      jest
        .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(true);

      const { unmount } = renderHookWithProvider(
        () => useTokenBalancesPolling(),
        {
          state,
        },
      );

      const mockedTokenBalancesController = jest.mocked(
        Engine.context.TokenBalancesController,
      );

      // We only poll multiple popular networks, custom networks do not included in multiple polling
      expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(
        2,
      );
      expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
        chainId: '0x1',
      });
      expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
        chainId: '0x89',
      });

      unmount();
      expect(
        mockedTokenBalancesController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(2);
    });

    it('should poll current chain when portfolio view is disabled', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

      const { unmount } = renderHookWithProvider(
        () => useTokenBalancesPolling(),
        {
          state,
        },
      );

      const mockedTokenBalancesController = jest.mocked(
        Engine.context.TokenBalancesController,
      );

      expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(
        1,
      );
      expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
        chainId: selectedChainId,
      });

      unmount();
      expect(
        mockedTokenBalancesController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(1);
    });

    it('should poll popular networks when all networks selected and global selector enabled', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
      jest
        .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(false);

      // Use chain IDs that are actually in PopularList: Ethereum Mainnet (0x1), Polygon (0x89), Optimism (0xa)
      const stateWithPopularNetworks = {
        ...state,
        engine: {
          ...state.engine,
          backgroundState: {
            ...state.engine.backgroundState,
            NetworkController: {
              ...state.engine.backgroundState.NetworkController,
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1' as const,
                  rpcEndpoints: [
                    {
                      networkClientId: 'selectedNetworkClientId',
                    },
                  ],
                  defaultRpcEndpointIndex: 0,
                },
                '0x89': {
                  chainId: '0x89' as const,
                  rpcEndpoints: [
                    {
                      networkClientId: 'selectedNetworkClientId',
                    },
                  ],
                  defaultRpcEndpointIndex: 0,
                },
                '0xa': {
                  chainId: '0xa' as const,
                  rpcEndpoints: [
                    {
                      networkClientId: 'selectedNetworkClientId',
                    },
                  ],
                  defaultRpcEndpointIndex: 0,
                },
              },
            },
            PreferencesController: {
              ...state.engine.backgroundState.PreferencesController,
              tokenNetworkFilter: {
                '0x1': 'true',
                '0x89': 'true',
                '0xa': 'true',
              },
            },
          },
        },
      };

      const { unmount } = renderHookWithProvider(
        () => useTokenBalancesPolling(),
        {
          state: stateWithPopularNetworks,
        },
      );

      const mockedTokenBalancesController = jest.mocked(
        Engine.context.TokenBalancesController,
      );

      expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(
        3,
      );
      expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
        chainId: '0x1',
      });
      expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
        chainId: '0x89',
      });
      expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
        chainId: '0xa',
      });

      unmount();
      expect(
        mockedTokenBalancesController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(3);
    });

    it('should handle empty enabled networks gracefully', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
      jest
        .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(true);

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

      const { unmount } = renderHookWithProvider(
        () => useTokenBalancesPolling(),
        {
          state: stateWithEmptyNetworks,
        },
      );

      const mockedTokenBalancesController = jest.mocked(
        Engine.context.TokenBalancesController,
      );

      expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(
        0,
      );

      unmount();
      expect(
        mockedTokenBalancesController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(0);
    });
  });
});
