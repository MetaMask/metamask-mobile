import useCurrencyRatePolling from './useCurrencyRatePolling';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import { RootState } from '../../../reducers';
import { SolScope } from '@metamask/keyring-api';

jest.mock('../../../core/Engine', () => ({
  context: {
    CurrencyRateController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useCurrencyRatePolling', () => {
  it('Should poll by the native currencies in network state', async () => {
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
                nativeCurrency: 'ETH',
                rpcEndpoints: [
                  {
                    networkClientId: 'selectedNetworkClientId',
                  },
                ],
              },
              '0x89': {
                chainId: '0x89',
                nativeCurrency: 'POL',
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
              '0x1': true,
              '0x89': true,
            },
          },
        },
      },
    } as unknown as RootState;

    renderHookWithProvider(() => useCurrencyRatePolling(), { state });

    expect(
      jest.mocked(Engine.context.CurrencyRateController.startPolling),
    ).toHaveBeenCalledWith({ nativeCurrencies: ['ETH', 'POL'] });
  });

  it('should poll only for current network if selected one is not popular', async () => {
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
              '0x82750': {
                nativeCurrency: 'SCROLL',
                chainId: '0x82750',
                rpcEndpoints: [
                  {
                    networkClientId: 'selectedNetworkClientId',
                  },
                ],
              },
              '0x89': {
                chainId: '0x89',
                nativeCurrency: 'POL',
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
              '0x82750': true,
              '0x89': true,
            },
          },
        },
      },
    } as unknown as RootState;

    renderHookWithProvider(() => useCurrencyRatePolling(), { state });

    expect(
      jest.mocked(Engine.context.CurrencyRateController.startPolling),
    ).toHaveBeenCalledWith({ nativeCurrencies: ['SCROLL'] });
  });

  it('Should not poll when evm is not selected', async () => {
    const state = {
      engine: {
        backgroundState: {
          MultichainNetworkController: {
            isEvmSelected: false,
            selectedMultichainNetworkChainId: SolScope.Mainnet,

            multichainNetworkConfigurationsByChainId: {},
          },
          NetworkController: {
            selectedNetworkClientId: 'selectedNetworkClientId',
            networkConfigurationsByChainId: {
              '0x82750': {
                nativeCurrency: 'SCROLL',
                chainId: '0x82750',
                rpcEndpoints: [
                  {
                    networkClientId: 'selectedNetworkClientId',
                  },
                ],
              },
              '0x89': {
                chainId: '0x89',
                nativeCurrency: 'POL',
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
              '0x82750': true,
              '0x89': true,
            },
          },
        },
      },
    } as unknown as RootState;

    renderHookWithProvider(() => useCurrencyRatePolling(), { state });

    const mockedCurrencyRateController = jest.mocked(
      Engine.context.CurrencyRateController,
    );
    expect(mockedCurrencyRateController.startPolling).toHaveBeenCalledTimes(0);
  });
});
