import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useTokenDetectionPolling from './useTokenDetectionPolling';
import { RootState } from '../../../reducers';
import { SolScope } from '@metamask/keyring-api';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenDetectionController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useTokenDetectionPolling', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const selectedAddress = '0x1234567890abcdef';
  const selectedChainId = '0x1' as const;

  const state = {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            selectedAccount: '1',
            accounts: {
              '1': {
                address: selectedAddress,
              },
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
                  networkClientId: 'selectedNetworkClientId2',
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

  it('Should poll by current chain ids/address, and stop polling on dismount', async () => {
    const { unmount } = renderHookWithProvider(
      () => useTokenDetectionPolling(),
      { state },
    );

    const mockedTokenDetectionController = jest.mocked(
      Engine.context.TokenDetectionController,
    );

    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledTimes(
      1,
    );
    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledWith({
      chainIds: [selectedChainId, '0x89'],
      address: selectedAddress,
    });

    expect(
      mockedTokenDetectionController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(0);
    unmount();
    expect(
      mockedTokenDetectionController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('Should not poll when token detection is disabled', async () => {
    renderHookWithProvider(
      () => useTokenDetectionPolling({ chainIds: ['0x1'] }),
      {
        state: {
          ...state,
          engine: {
            ...state.engine,
            backgroundState: {
              ...state.engine.backgroundState,
              PreferencesController: {
                ...state.engine.backgroundState.PreferencesController,
                useTokenDetection: false,
              },
            },
          },
        },
      },
    );

    const mockedTokenDetectionController = jest.mocked(
      Engine.context.TokenDetectionController,
    );
    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledTimes(
      0,
    );
    expect(
      mockedTokenDetectionController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(0);
  });

  it('Should not poll when evm is not selected', async () => {
    renderHookWithProvider(() => useTokenDetectionPolling(), {
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

    const mockedTokenDetectionController = jest.mocked(
      Engine.context.TokenDetectionController,
    );
    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledTimes(
      0,
    );
  });

  it('Should poll with specific chainIds when provided', async () => {
    const specificChainIds = ['0x5' as const];
    const { unmount } = renderHookWithProvider(
      () => useTokenDetectionPolling({ chainIds: specificChainIds }),
      {
        state: {
          ...state,
          engine: {
            ...state.engine,
            backgroundState: {
              ...state.engine.backgroundState,
              NetworkController: {
                selectedNetworkClientId: 'selectedNetworkClientId',
                networkConfigurationsByChainId: {
                  '0x5': {
                    chainId: '0x5',
                    rpcEndpoints: [
                      {
                        networkClientId: 'selectedNetworkClientId',
                      },
                    ],
                    defaultRpcEndpointIndex: 0,
                  },
                },
              },
              NetworkEnablementController: {
                enabledNetworkMap: {
                  eip155: {
                    '0x5': true,
                  },
                },
              },
            },
          },
        },
      },
    );

    const mockedTokenDetectionController = jest.mocked(
      Engine.context.TokenDetectionController,
    );

    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledTimes(
      1,
    );
    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledWith({
      chainIds: ['0x5'],
      address: selectedAddress,
    });

    unmount();
    expect(
      mockedTokenDetectionController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('Should poll with network configurations when no chainIds provided', async () => {
    const currentChainId = '0x1';
    const { unmount } = renderHookWithProvider(
      () => useTokenDetectionPolling(),
      {
        state: {
          ...state,
          engine: {
            ...state.engine,
            backgroundState: {
              ...state.engine.backgroundState,
              NetworkController: {
                selectedNetworkClientId: 'selectedNetworkClientId',
                networkConfigurationsByChainId: {
                  [currentChainId]: {
                    chainId: currentChainId,
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
            },
          },
        },
      },
    );

    const mockedTokenDetectionController = jest.mocked(
      Engine.context.TokenDetectionController,
    );

    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledTimes(
      1,
    );
    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledWith({
      chainIds: [currentChainId, '0x89'],
      address: selectedAddress,
    });

    unmount();
    expect(
      mockedTokenDetectionController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('Should handle missing account address gracefully', async () => {
    const { unmount } = renderHookWithProvider(
      () => useTokenDetectionPolling(),
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
            },
          },
        },
      },
    );

    const mockedTokenDetectionController = jest.mocked(
      Engine.context.TokenDetectionController,
    );

    expect(mockedTokenDetectionController.startPolling).not.toHaveBeenCalled();

    unmount();
    expect(
      mockedTokenDetectionController.stopPollingByPollingToken,
    ).not.toHaveBeenCalled();
  });

  it('should poll only for current network if selected one is not popular', () => {
    const { unmount } = renderHookWithProvider(
      () => useTokenDetectionPolling(),
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
                      address: '0xAcconut1',
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
              NetworkEnablementController: {
                enabledNetworkMap: {
                  eip155: {
                    '0x82750': true,
                  },
                },
              },
            },
          },
        },
      },
    );

    const mockedTokenDetectionController = jest.mocked(
      Engine.context.TokenDetectionController,
    );

    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledTimes(
      1,
    );
    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledWith({
      chainIds: ['0x82750'],
      address: '0xAcconut1',
    });

    unmount();
    expect(
      mockedTokenDetectionController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('polls with provided chain ids and address', () => {
    const providedAddress = '0x1234567890abcdef';
    renderHookWithProvider(
      () =>
        useTokenDetectionPolling({
          chainIds: ['0x1', '0x89'],
          address: providedAddress,
        }),
      {
        state,
      },
    );

    const mockedTokenDetectionController = jest.mocked(
      Engine.context.TokenDetectionController,
    );

    expect(mockedTokenDetectionController.startPolling).toHaveBeenNthCalledWith(
      1,
      {
        chainIds: ['0x1', '0x89'],
        address: providedAddress,
      },
    );
  });

  describe('Network Manager Integration', () => {
    it('should poll enabled EVM networks', () => {
      const { unmount } = renderHookWithProvider(
        () => useTokenDetectionPolling(),
        {
          state,
        },
      );

      const mockedTokenDetectionController = jest.mocked(
        Engine.context.TokenDetectionController,
      );

      expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledTimes(
        1,
      );
      // we will poll all popular evm networks, custom evm networks are not group polled
      expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledWith({
        chainIds: ['0x1', '0x89'],
        address: selectedAddress,
      });

      unmount();
      expect(
        mockedTokenDetectionController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(1);
    });

    it('should poll all enabled networks by default', () => {
      const { unmount } = renderHookWithProvider(
        () => useTokenDetectionPolling(),
        {
          state,
        },
      );

      const mockedTokenDetectionController = jest.mocked(
        Engine.context.TokenDetectionController,
      );

      expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledTimes(
        1,
      );
      // After feature flag removal, polls all enabled networks by default
      expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledWith({
        chainIds: [selectedChainId, '0x89'],
        address: selectedAddress,
      });

      unmount();
      expect(
        mockedTokenDetectionController.stopPollingByPollingToken,
      ).toHaveBeenCalledTimes(1);
    });

    it('should poll popular networks when all networks selected', () => {
      // Use chain IDs that are actually in PopularList: Ethereum Mainnet (0x1), Polygon (0x89), Optimism (0xa)
      const popularNetworks = ['0x1', '0x89', '0xa'];
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
      };

      const { unmount } = renderHookWithProvider(
        () => useTokenDetectionPolling(),
        {
          state: stateWithPopularNetworks,
        },
      );

      const mockedTokenDetectionController = jest.mocked(
        Engine.context.TokenDetectionController,
      );

      expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledTimes(
        1,
      );
      expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledWith({
        chainIds: popularNetworks,
        address: selectedAddress,
      });

      unmount();
      expect(
        mockedTokenDetectionController.stopPollingByPollingToken,
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

      const { unmount } = renderHookWithProvider(
        () => useTokenDetectionPolling(),
        {
          state: stateWithEmptyNetworks,
        },
      );

      const mockedTokenDetectionController = jest.mocked(
        Engine.context.TokenDetectionController,
      );

      expect(
        mockedTokenDetectionController.startPolling,
      ).not.toHaveBeenCalled();

      unmount();
      expect(
        mockedTokenDetectionController.stopPollingByPollingToken,
      ).not.toHaveBeenCalled();
    });
  });
});
