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
            },
            '0x89': {
              chainId: '0x89',
              rpcEndpoints: [
                {
                  networkClientId: 'selectedNetworkClientId2',
                },
              ],
            },
          },
        },
        PreferencesController: {
          tokenNetworkFilter: {
            [selectedChainId]: true,
            '0x89': true,
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

  it('should poll all network configurations when portfolio view is enabled', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);

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
});
