import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useTokenBalancesPolling from './useTokenBalancesPolling';
import { RootState } from '../../../reducers';
import { SolScope } from '@metamask/keyring-api';
import { usePollingNetworks } from './use-polling-networks';
import { NetworkConfiguration } from '@metamask/network-controller';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenBalancesController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

jest.mock('./use-polling-networks');

describe('useTokenBalancesPolling', () => {
  const mockUsePollingNetworks = usePollingNetworks as jest.MockedFunction<
    typeof usePollingNetworks
  >;

  const createMockNetworkConfig = (
    chainId: string,
    networkClientId: string,
  ): NetworkConfiguration =>
    ({
      chainId,
      rpcEndpoints: [{ networkClientId }],
      defaultRpcEndpointIndex: 0,
    } as NetworkConfiguration);

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
    mockUsePollingNetworks.mockReturnValue([
      createMockNetworkConfig(selectedChainId, 'selectedNetworkClientId'),
    ]);

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
      chainIds: [selectedChainId],
    });

    unmount();
    expect(
      mockedTokenBalancesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('should poll all network configurations when portfolio view is enabled and global network selector is not removed', () => {
    mockUsePollingNetworks.mockReturnValue([
      createMockNetworkConfig(selectedChainId, 'selectedNetworkClientId'),
      createMockNetworkConfig('0x89', 'selectedNetworkClientId2'),
    ]);

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
      chainIds: [selectedChainId, '0x89'],
    });

    unmount();
    expect(
      mockedTokenBalancesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('should use provided chainIds when specified, even with portfolio view enabled', () => {
    // Mock usePollingNetworks to return some networks, but they should be ignored due to chainIds override
    mockUsePollingNetworks.mockReturnValue([
      createMockNetworkConfig(selectedChainId, 'selectedNetworkClientId'),
    ]);

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
      chainIds: ['0x5'],
    });

    unmount();
    expect(
      mockedTokenBalancesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('should poll only for current network if selected one is not popular', () => {
    mockUsePollingNetworks.mockReturnValue([
      createMockNetworkConfig('0x82750', 'selectedNetworkClientId'),
    ]);

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
      chainIds: ['0x82750'],
    });

    unmount();
    expect(
      mockedTokenBalancesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('Should not poll when evm is not selected', async () => {
    mockUsePollingNetworks.mockReturnValue([]);

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
    // Mock usePollingNetworks to return some networks, but they should be ignored due to chainIds override
    mockUsePollingNetworks.mockReturnValue([
      createMockNetworkConfig(selectedChainId, 'selectedNetworkClientId'),
    ]);

    renderHookWithProvider(
      () => useTokenBalancesPolling({ chainIds: ['0x1', '0x89'] }),
      {
        state,
      },
    );

    const mockedTokenBalancesController = jest.mocked(
      Engine.context.TokenBalancesController,
    );

    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
      chainIds: ['0x1', '0x89'],
    });
  });

  describe('Feature flag scenarios', () => {
    it('should poll enabled EVM networks when global network selector is removed and portfolio view is enabled', () => {
      mockUsePollingNetworks.mockReturnValue([
        createMockNetworkConfig('0x1', 'selectedNetworkClientId'),
        createMockNetworkConfig('0x89', 'selectedNetworkClientId2'),
      ]);

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
        1,
      );
      expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
        chainIds: ['0x1', '0x89'],
      });

      unmount();
      expect(
        mockedTokenBalancesController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(1);
    });

    it('should poll current chain when portfolio view is disabled', () => {
      mockUsePollingNetworks.mockReturnValue([
        createMockNetworkConfig(selectedChainId, 'selectedNetworkClientId'),
      ]);

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
        chainIds: [selectedChainId],
      });

      unmount();
      expect(
        mockedTokenBalancesController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(1);
    });

    it('should poll popular networks when all networks selected and global selector enabled', () => {
      mockUsePollingNetworks.mockReturnValue([
        createMockNetworkConfig('0x1', 'selectedNetworkClientId'),
        createMockNetworkConfig('0x89', 'selectedNetworkClientId'),
        createMockNetworkConfig('0xa', 'selectedNetworkClientId'),
      ]);

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
        1,
      );
      expect(mockedTokenBalancesController.startPolling).toHaveBeenCalledWith({
        chainIds: ['0x1', '0x89', '0xa'],
      });

      unmount();
      expect(
        mockedTokenBalancesController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle empty enabled networks gracefully', () => {
      mockUsePollingNetworks.mockReturnValue([]);

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
