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
          useTokenDetection: true,
          tokenNetworkFilter: {
            '0x1': true,
            '0x89': true,
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

  it('Should poll all networks when portfolio view is enabled', async () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);

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
});
