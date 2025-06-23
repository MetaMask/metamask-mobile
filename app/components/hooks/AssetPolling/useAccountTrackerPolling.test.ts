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
      2,
    );
    expect(mockedAccountTrackerController.startPolling).toHaveBeenCalledWith({
      networkClientIds: ['otherNetworkClientId'],
    });

    unmount();
    expect(
      mockedAccountTrackerController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(2);
  });

  it('should use provided network client IDs when specified, even with portfolio view enabled', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);

    const specificNetworkClientIds = [
      { networkClientId: 'specificNetworkClientId' },
    ];

    const { unmount } = renderHookWithProvider(
      () =>
        useAccountTrackerPolling({
          networkClientIds: specificNetworkClientIds,
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

  it('should return accountsByChainId from the state', () => {
    const { result } = renderHookWithProvider(
      () => useAccountTrackerPolling(),
      {
        state,
      },
    );

    expect(result.current.accountsByChainId).toEqual({
      '0x1': {},
      '0x2': {},
    });
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
                        networkClientId: 'otherNetworkClientId',
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
      networkClientIds: ['otherNetworkClientId'],
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
});
