import useCurrencyRatePolling from './useCurrencyRatePolling';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import { RootState } from '../../../reducers';
import { SolScope } from '@metamask/keyring-api';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../util/networks';

jest.mock('../../../core/Engine', () => ({
  context: {
    CurrencyRateController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useCurrencyRatePolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
                defaultRpcEndpointIndex: 0,
              },
              '0x89': {
                chainId: '0x89',
                nativeCurrency: 'POL',
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
                defaultRpcEndpointIndex: 0,
              },
              '0x89': {
                chainId: '0x89',
                nativeCurrency: 'POL',
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
                defaultRpcEndpointIndex: 0,
              },
              '0x89': {
                chainId: '0x89',
                nativeCurrency: 'POL',
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

  it('polls with provided chain ids', () => {
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
              '0x1': {
                nativeCurrency: 'ETH',
                chainId: '0x1',
                rpcEndpoints: [
                  {
                    networkClientId: 'selectedNetworkClientId',
                  },
                ],
                defaultRpcEndpointIndex: 0,
              },
              '0x89': {
                nativeCurrency: 'POL',
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
            tokenNetworkFilter: {
              '0x1': true,
            },
          },
        },
      },
    } as unknown as RootState;

    renderHookWithProvider(
      () => useCurrencyRatePolling({ chainIds: ['0x1', '0x89'] }),
      {
        state,
      },
    );

    const mockedCurrencyRateController = jest.mocked(
      Engine.context.CurrencyRateController,
    );

    expect(mockedCurrencyRateController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedCurrencyRateController.startPolling).toHaveBeenCalledWith({
      nativeCurrencies: ['ETH', 'POL'],
    });
  });

  it('handles chain ids without matching network configurations', () => {
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
              '0x1': {
                nativeCurrency: 'ETH',
                chainId: '0x1',
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
            tokenNetworkFilter: {
              '0x1': true,
            },
          },
        },
      },
    } as unknown as RootState;

    renderHookWithProvider(
      () => useCurrencyRatePolling({ chainIds: ['0x1', '0x89'] }),
      {
        state,
      },
    );

    const mockedCurrencyRateController = jest.mocked(
      Engine.context.CurrencyRateController,
    );

    expect(mockedCurrencyRateController.startPolling).toHaveBeenCalledTimes(1);
    expect(mockedCurrencyRateController.startPolling).toHaveBeenNthCalledWith(
      1,
      {
        nativeCurrencies: ['ETH'],
      },
    );
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
                nativeCurrency: 'ETH',
                rpcEndpoints: [
                  {
                    networkClientId: 'selectedNetworkClientId',
                  },
                ],
                defaultRpcEndpointIndex: 0,
              },
              '0x89': {
                chainId: '0x89',
                nativeCurrency: 'POL',
                rpcEndpoints: [
                  {
                    networkClientId: 'selectedNetworkClientId2',
                  },
                ],
                defaultRpcEndpointIndex: 0,
              },
              '0x5': {
                chainId: '0x5',
                nativeCurrency: 'ETH',
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
              '0x1': true,
              '0x89': true,
              '0x5': true,
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

    it('should poll enabled EVM networks when global network selector is removed and portfolio view is enabled', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
      jest
        .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(true);

      renderHookWithProvider(() => useCurrencyRatePolling(), {
        state: baseState,
      });

      expect(
        jest.mocked(Engine.context.CurrencyRateController.startPolling),
      ).toHaveBeenCalledWith({ nativeCurrencies: ['ETH', 'POL'] });
    });

    it('should poll current chain when portfolio view is disabled', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);

      renderHookWithProvider(() => useCurrencyRatePolling(), {
        state: baseState,
      });

      expect(
        jest.mocked(Engine.context.CurrencyRateController.startPolling),
      ).toHaveBeenCalledWith({ nativeCurrencies: ['ETH'] });
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

      renderHookWithProvider(() => useCurrencyRatePolling(), {
        state: stateWithEmptyNetworks,
      });

      expect(
        jest.mocked(Engine.context.CurrencyRateController.startPolling),
      ).not.toHaveBeenCalled();
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

      renderHookWithProvider(() => useCurrencyRatePolling(), {
        state: stateWithMissingConfigs,
      });

      expect(
        jest.mocked(Engine.context.CurrencyRateController.startPolling),
      ).toHaveBeenCalledWith({ nativeCurrencies: ['ETH'] });
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

      renderHookWithProvider(() => useCurrencyRatePolling(), {
        state: stateWithUndefinedNetworks,
      });

      expect(
        jest.mocked(Engine.context.CurrencyRateController.startPolling),
      ).not.toHaveBeenCalled();
    });
  });
});
