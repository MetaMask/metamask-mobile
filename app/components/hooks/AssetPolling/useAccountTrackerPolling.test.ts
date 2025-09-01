import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useAccountTrackerPolling from './useAccountTrackerPolling';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../util/networks';
import { RootState } from '../../../reducers';
import { SolScope } from '@metamask/keyring-api';

jest.mock('../../../core/Engine', () => ({
  context: {
    AccountTrackerController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useAccountTrackerPolling', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

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
                  networkClientId: 'otherNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
            },
          },
        },
        AccountTrackerController: {
          accountsByChainId: {
            '0x1': {},
            '0x2': {},
          },
        },
        PreferencesController: {
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
            },
          },
        },
      },
    },
  } as unknown as RootState;

  it('should poll all network configurations when portfolio view is enabled', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);

    const { unmount } = renderHookWithProvider(
      () => useAccountTrackerPolling(),
      { state },
    );

    const mockedAccountTrackerController = jest.mocked(
      Engine.context.AccountTrackerController,
    );

    expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledTimes(
      1,
    );
    expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledWith({
      networkClientIds: ['selectedNetworkClientId', 'otherNetworkClientId'],
    });

    unmount();
    expect(
      mockedAccountTrackerController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('should use provided network client IDs when specified, even with portfolio view enabled', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);

    const { unmount } = renderHookWithProvider(
      () =>
        useAccountTrackerPolling({
          networkClientIds: ['specificNetworkClientId'],
        }),
      { state },
    );

    const mockedAccountTrackerController = jest.mocked(
      Engine.context.AccountTrackerController,
    );

    expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledTimes(
      1,
    );
    expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledWith({
      networkClientIds: ['specificNetworkClientId'],
    });

    unmount();
    expect(
      mockedAccountTrackerController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('should poll only for current network if selected one is not popular', () => {
    const { unmount } = renderHookWithProvider(
      () => useAccountTrackerPolling(),
      {
        state: {
          engine: {
            backgroundState: {
              MultichainNetworkController: {
                isEvmSelected: true,
                selectedMultichainNetworkChainId: SolScope.Mainnet,

                multichainNetworkConfigurationsByChainId: {},
              },
              NetworkController: {
                selectedNetworkClientId: 'otherNetworkClientId',
                networkConfigurationsByChainId: {
                  '0x89': {
                    chainId: '0x89',
                    rpcEndpoints: [
                      {
                        networkClientId: 'otherNetworkClientId',
                      },
                    ],
                    defaultRpcEndpointIndex: 0,
                  },
                  '0x82750': {
                    chainId: '0x82750',
                    rpcEndpoints: [
                      {
                        networkClientId: 'otherNetworkClientId2',
                      },
                    ],
                    defaultRpcEndpointIndex: 0,
                  },
                },
              },
              AccountTrackerController: {
                accountsByChainId: {
                  '0x89': {},
                  '0x82750': {},
                },
              },
              PreferencesController: {
                tokenNetworkFilter: {
                  '0x82750': true,
                  '0x89': true,
                },
              },
              NetworkEnablementController: {
                enabledNetworkMap: {
                  eip155: {
                    '0x82750': true,
                    '0x89': false,
                  },
                },
              },
            },
          },
        } as unknown as RootState,
      },
    );

    const mockedAccountTrackerController = jest.mocked(
      Engine.context.AccountTrackerController,
    );

    expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledTimes(
      1,
    );
    expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledWith({
      networkClientIds: ['otherNetworkClientId2'],
    });

    unmount();
    expect(
      mockedAccountTrackerController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('Should not poll when evm is not selected', async () => {
    renderHookWithProvider(() => useAccountTrackerPolling(), {
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

    const mockedAccountTrackerController = jest.mocked(
      Engine.context.AccountTrackerController,
    );
    expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledTimes(
      0,
    );
  });

  it('polls with provided network client ids', () => {
    renderHookWithProvider(
      () =>
        useAccountTrackerPolling({
          networkClientIds: [
            'specificNetworkClientId1',
            'specificNetworkClientId2',
          ],
        }),
      {
        state,
      },
    );

    const mockedAccountTrackerController = jest.mocked(
      Engine.context.AccountTrackerController,
    );

    expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledTimes(
      1,
    );
    expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledWith({
      networkClientIds: [
        'specificNetworkClientId1',
        'specificNetworkClientId2',
      ],
    });
  });

  describe('Feature flag scenarios', () => {
    const baseState = {
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
              '0xa': {
                chainId: '0xa',
                rpcEndpoints: [
                  {
                    networkClientId: 'selectedNetworkClientId3',
                  },
                ],
                defaultRpcEndpointIndex: 0,
              },
            },
          },
          AccountTrackerController: {
            accountsByChainId: {
              '0x1': {},
              '0x89': {},
              '0xa': {},
            },
          },
          PreferencesController: {
            tokenNetworkFilter: {
              '0x1': true,
              '0x89': true,
              '0xa': true,
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              eip155: {
                '0x1': true,
                '0x89': true,
                '0xa': true,
              },
            },
          },
        },
      },
    } as unknown as RootState;

    it('should poll enabled EVM networks when global network selector is removed and portfolio view is enabled', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
      jest
        .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(true);

      const { unmount } = renderHookWithProvider(
        () => useAccountTrackerPolling(),
        { state: baseState },
      );

      const mockedAccountTrackerController = jest.mocked(
        Engine.context.AccountTrackerController,
      );

      expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledTimes(
        1,
      );
      expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledWith({
        networkClientIds: [
          'selectedNetworkClientId',
          'selectedNetworkClientId2',
          'selectedNetworkClientId3',
        ],
      });

      unmount();
      expect(
        mockedAccountTrackerController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(1);
    });

    it('should poll current chain when portfolio view is disabled', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

      const { unmount } = renderHookWithProvider(
        () => useAccountTrackerPolling(),
        { state: baseState },
      );

      const mockedAccountTrackerController = jest.mocked(
        Engine.context.AccountTrackerController,
      );

      expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledTimes(
        1,
      );
      expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledWith({
        networkClientIds: ['selectedNetworkClientId'],
      });

      unmount();
      expect(
        mockedAccountTrackerController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle empty enabled networks gracefully', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
      jest
        .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(true);

      const stateWithEmptyNetworks = {
        ...baseState,
        engine: {
          ...baseState.engine,
          backgroundState: {
            ...baseState.engine.backgroundState,
            NetworkEnablementController: {
              enabledNetworkMap: {
                eip155: {},
              },
            },
          },
        },
      };

      const { unmount } = renderHookWithProvider(
        () => useAccountTrackerPolling(),
        { state: stateWithEmptyNetworks },
      );

      const mockedAccountTrackerController = jest.mocked(
        Engine.context.AccountTrackerController,
      );

      expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledTimes(
        0,
      );

      unmount();
      expect(
        mockedAccountTrackerController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(0);
    });

    it('should handle missing network configurations gracefully', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
      jest
        .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(true);

      const stateWithMissingConfigs = {
        ...baseState,
        engine: {
          ...baseState.engine,
          backgroundState: {
            ...baseState.engine.backgroundState,
            NetworkEnablementController: {
              enabledNetworkMap: {
                eip155: {
                  '0x1': true,
                  '0x999': true, // Network not in configurations
                },
              },
            },
          },
        },
      };

      const { unmount } = renderHookWithProvider(
        () => useAccountTrackerPolling(),
        { state: stateWithMissingConfigs },
      );

      const mockedAccountTrackerController = jest.mocked(
        Engine.context.AccountTrackerController,
      );

      expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledTimes(
        1,
      );
      expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledWith({
        networkClientIds: ['selectedNetworkClientId'],
      });

      unmount();
      expect(
        mockedAccountTrackerController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined enabled networks gracefully', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
      jest
        .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(true);

      const stateWithUndefinedNetworks = {
        ...baseState,
        engine: {
          ...baseState.engine,
          backgroundState: {
            ...baseState.engine.backgroundState,
            NetworkEnablementController: {
              enabledNetworkMap: {
                // No eip155 namespace
                solana: {
                  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
                },
              },
            },
          },
        },
      };

      const { unmount } = renderHookWithProvider(
        () => useAccountTrackerPolling(),
        { state: stateWithUndefinedNetworks },
      );

      const mockedAccountTrackerController = jest.mocked(
        Engine.context.AccountTrackerController,
      );

      expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledTimes(
        0,
      );

      unmount();
      expect(
        mockedAccountTrackerController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(0);
    });

    it('should handle undefined selectedNetworkClientId gracefully', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

      const stateWithUndefinedClientId = {
        ...baseState,
        engine: {
          ...baseState.engine,
          backgroundState: {
            ...baseState.engine.backgroundState,
            NetworkController: {
              ...baseState.engine.backgroundState.NetworkController,
              selectedNetworkClientId: undefined,
            },
          },
        },
      };

      const { unmount } = renderHookWithProvider(
        () => useAccountTrackerPolling(),
        { state: stateWithUndefinedClientId },
      );

      const mockedAccountTrackerController = jest.mocked(
        Engine.context.AccountTrackerController,
      );

      expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledTimes(
        0,
      );

      unmount();
      expect(
        mockedAccountTrackerController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(0);
    });
  });
});
