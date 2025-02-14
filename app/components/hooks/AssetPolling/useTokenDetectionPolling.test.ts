import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useTokenDetectionPolling from './useTokenDetectionPolling';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../util/networks';
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
      chainIds: [selectedChainId],
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

  it('Should poll with specific chainIds when provided', async () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);

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
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

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
                  },
                  '0x89': {
                    chainId: '0x89',
                    rpcEndpoints: [
                      {
                        networkClientId: 'otherNetworkClientId',
                      },
                    ],
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
      chainIds: [currentChainId],
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

    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledTimes(
      1,
    );
    expect(mockedTokenDetectionController.startPolling).toHaveBeenCalledWith({
      chainIds: [selectedChainId],
      address: undefined,
    });

    unmount();
    expect(
      mockedTokenDetectionController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
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
      address: undefined,
    });

    unmount();
    expect(
      mockedTokenDetectionController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });
});
