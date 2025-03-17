import useTokenRatesPolling from './useTokenRatesPolling';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import { RootState } from '../../../reducers';
import { SolScope } from '@metamask/keyring-api';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenRatesController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useTokenRatesPolling', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const state = {
    engine: {
      backgroundState: {
        TokenRatesController: {
          marketData: {},
        },
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: SolScope.Mainnet,

          multichainNetworkConfigurationsByChainId: {},
        },
        NetworkController: {
          networkConfigurationsByChainId: {
            '0x1': {},
            '0x89': {},
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

  it('Should poll by provided chain ids, and stop polling on dismount', async () => {
    const { unmount } = renderHookWithProvider(
      () => useTokenRatesPolling({ chainIds: ['0x1'] }),
      { state },
    );

    const mockedTokenRatesController = jest.mocked(
      Engine.context.TokenRatesController,
    );

    expect(mockedTokenRatesController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedTokenRatesController.startPolling).toHaveBeenCalledWith({
      chainId: '0x1',
    });

    expect(
      mockedTokenRatesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(0);
    unmount();
    expect(
      mockedTokenRatesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('should poll only for current network if selected one is not popular', () => {
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
          TokenRatesController: {
            marketData: {
              '0x82750': {},
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

    const { unmount } = renderHookWithProvider(() => useTokenRatesPolling(), {
      state: stateToTest,
    });

    const mockedTokenRatesController = jest.mocked(
      Engine.context.TokenRatesController,
    );

    expect(mockedTokenRatesController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedTokenRatesController.startPolling).toHaveBeenCalledWith({
      chainId: '0x82750',
    });

    expect(
      mockedTokenRatesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(0);
    unmount();
    expect(
      mockedTokenRatesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  });
});
