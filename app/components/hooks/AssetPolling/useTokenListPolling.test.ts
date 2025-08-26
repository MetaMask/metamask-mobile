import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useTokenListPolling from './useTokenListPolling';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../util/networks';
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
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

    const { unmount } = renderHookWithProvider(() => useTokenListPolling(), {
      state,
    });

    const mockedTokenListController = jest.mocked(
      Engine.context.TokenListController,
    );
    const calledAmount = networks.isPortfolioViewEnabled() ? 2 : 1;
    expect(mockedTokenListController.startPolling).toHaveBeenCalledTimes(
      calledAmount,
    );
    expect(mockedTokenListController.startPolling).toHaveBeenCalledWith({
      chainId: selectedChainId,
    });

    expect(
      mockedTokenListController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(0);
    unmount();
    expect(
      mockedTokenListController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(calledAmount);
  });

  it('Should poll all networks when portfolio view is enabled and global selector is enabled', async () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
    jest
      .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
      .mockReturnValue(false);

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
    expect(mockedTokenListController.startPolling).toHaveBeenCalledWith({
      chainId: '0x89',
    });

    unmount();
    expect(
      mockedTokenListController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(2);
  });

  it('should poll only for current network if selected one is not popular', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
    jest
      .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
      .mockReturnValue(false);

    const stateToTest = {
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
          PreferencesController: {
            useTokenDetection: true,
            tokenNetworkFilter: {
              '0x82750': true,
            },
          },
        },
      },
    } as unknown as RootState;

    const { unmount } = renderHookWithProvider(() => useTokenListPolling(), {
      state: stateToTest,
    });

    const mockedTokenListController = jest.mocked(
      Engine.context.TokenListController,
    );

    expect(mockedTokenListController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedTokenListController.startPolling).toHaveBeenCalledWith({
      chainId: '0x82750',
    });
    expect(mockedTokenListController.startPolling).toHaveBeenCalledWith({
      chainId: '0x82750',
    });

    unmount();
    expect(
      mockedTokenListController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('Should not poll when evm is not selected', async () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

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
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

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

  describe('Feature flag scenarios', () => {
    it('should poll enabled EVM networks when global network selector is removed and portfolio view is enabled', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
      jest
        .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(true);

      const { unmount } = renderHookWithProvider(() => useTokenListPolling(), {
        state,
      });

      const mockedTokenListController = jest.mocked(
        Engine.context.TokenListController,
      );

      // We only group poll popular networks, custom networks are not group polled
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

    it('should poll current chain when portfolio view is disabled', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

      const { unmount } = renderHookWithProvider(() => useTokenListPolling(), {
        state,
      });

      const mockedTokenListController = jest.mocked(
        Engine.context.TokenListController,
      );

      expect(mockedTokenListController.startPolling).toHaveBeenCalledTimes(1);
      expect(mockedTokenListController.startPolling).toHaveBeenCalledWith({
        chainId: selectedChainId,
      });

      unmount();
      expect(
        mockedTokenListController.stopPollingByPollingToken,
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

      const { unmount } = renderHookWithProvider(() => useTokenListPolling(), {
        state: stateWithPopularNetworks,
      });

      const mockedTokenListController = jest.mocked(
        Engine.context.TokenListController,
      );

      expect(mockedTokenListController.startPolling).toHaveBeenCalledTimes(3);
      expect(mockedTokenListController.startPolling).toHaveBeenCalledWith({
        chainId: '0x1',
      });
      expect(mockedTokenListController.startPolling).toHaveBeenCalledWith({
        chainId: '0x89',
      });
      expect(mockedTokenListController.startPolling).toHaveBeenCalledWith({
        chainId: '0xa',
      });

      unmount();
      expect(
        mockedTokenListController.stopPollingByPollingToken,
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
});
