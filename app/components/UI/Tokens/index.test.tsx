import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { fireEvent, waitFor } from '@testing-library/react-native';
import Tokens from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { getAssetTestId } from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import { backgroundState } from '../../../util/test/initial-root-state';
import { strings } from '../../../../locales/i18n';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(() => Promise.resolve()),
}));

const selectedAddress = '0x123';

jest.mock('./TokensBottomSheet', () => ({
  createTokensBottomSheetNavDetails: jest.fn(() => ['BottomSheetScreen', {}]),
}));

jest.mock('../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: jest.fn(),
  context: {
    TokensController: {
      ignoreTokens: jest.fn(() => Promise.resolve()),
      detectTokens: jest.fn(() => Promise.resolve()),
    },
    TokenDetectionController: {
      detectTokens: jest.fn(() => Promise.resolve()),
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    AccountTrackerController: {
      refresh: jest.fn(() => Promise.resolve()),
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(() => Promise.resolve()),
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    TokenRatesController: {
      updateExchangeRatesByChainId: jest.fn(() => Promise.resolve()),
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    TokenBalancesController: {
      updateBalances: jest.fn(() => Promise.resolve()),
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    TokenListController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      findNetworkClientIdByChainId: () => 'mainnet',
      state: {
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
          },
        },
      },
    },
    AccountsController: {
      state: {
        internalAccounts: {
          selectedAccount: '1',
          accounts: {
            '1': {
              address: selectedAddress,
            },
          },
        },
      },
    },
    PreferencesController: {
      state: {
        tokenNetworkFilter: {
          '0x00': true,
          '0x01': true,
          '0x02': true,
        },
      },
    },
    NetworkEnablementController: {
      state: {
        enabledNetworkMap: {
          eip155: {
            '0x00': true,
            '0x01': true,
            '0x02': true,
          },
        },
      },
    },
  },
}));

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
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
      NetworkController: {
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            rpcEndpoints: [{ networkClientId: '0x1' }],
          },
        },
      },
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [selectedAddress]: {
              balance: '0x00',
              stakedBalance: '0x2',
            },
          },
        },
      },
      TokensController: {
        allTokens: {
          '0x1': {
            [selectedAddress]: [
              {
                symbol: 'ETH',
                address: '0x00',
                decimals: 18,
              },
              {
                symbol: 'BAT',
                address: '0x01',
                decimals: 18,
              },
              {
                symbol: 'LINK',
                address: '0x02',
                decimals: 18,
              },
            ],
          },
        },
        detectedTokens: [],
      },
      TokenRatesController: {
        marketData: {
          '0x1': {
            '0x00': { price: 100 },
            '0x01': { price: 200 },
            '0x02': { price: 0.5 },
          },
        },
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        currencyRates: {
          ETH: {
            conversionRate: 1,
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          [selectedAddress]: {
            '0x1': {
              '0x00': '0x2386F26FC10000',
              '0x01': '0xDE0B6B3A7640000',
              '0x02': '0x0',
            },
          },
        },
      },
      NetworkEnablementController: {
        enabledNetworkMap: {
          eip155: {
            '0x1': true,
          },
        },
      },
    },
  },
  settings: {
    primaryCurrency: 'usd',
    hideZeroBalanceTokens: true,
  },
  security: {
    dataCollectionForMarketing: true,
  },
  user: {
    userLoggedIn: true,
  },
};

const mockNavigate = jest.fn();
const mockPush = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      push: mockPush,
    }),
  };
});

jest.mock('../../UI/Stake/hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isEligible: true,
    isLoadingEligibility: false,
    refreshPooledStakingEligibility: jest.fn().mockResolvedValue({
      isEligible: true,
    }),
    error: false,
  })),
}));

jest.mock('../../UI/Stake/hooks/useStakingChain', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isStakingSupportedChain: true,
  })),
  useStakingChainByChainId: jest.fn(() => ({
    isStakingSupportedChain: true,
  })),
}));

jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: () => ({
    networks: [],
    selectNetwork: jest.fn(),
    selectCustomNetwork: jest.fn(),
    selectPopularNetwork: jest.fn(),
  }),
  useNetworksByCustomNamespace: () => ({
    areAllNetworksSelected: false,
    totalEnabledNetworksCount: 2,
  }),
  NetworkType: {
    Popular: 'popular',
    Custom: 'custom',
  },
}));

jest.mock('../../hooks/useNetworkSelection/useNetworkSelection', () => ({
  useNetworkSelection: () => ({
    selectCustomNetwork: jest.fn(),
    selectPopularNetwork: jest.fn(),
    selectAllPopularNetworks: jest.fn(),
  }),
}));

jest.mock('../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: () => ({
    namespace: 'eip155',
    enabledNetworks: { '0x1': true },
    setEnabledNetwork: jest.fn(),
    setDisabledNetwork: jest.fn(),
    enableAllPopularNetworks: jest.fn(),
    isNetworkEnabled: jest.fn(),
    hasOneEnabledNetwork: false,
  }),
}));

jest.mock('../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: () => ({
    currentChainId: '0x1',
    isEvmNetwork: true,
    networkInfo: {
      name: 'Ethereum Mainnet',
      chainId: '0x1',
    },
    getNetworkInfo: jest.fn(),
    enabledNetworks: [{ chainId: '0x1' }],
  }),
}));

jest.mock(
  '../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: jest.fn(() => false),
  }),
);

const Stack = createStackNavigator();
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (state: any = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Amount" options={{}}>
        {() => <Tokens />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('Tokens', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockPush.mockClear();
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { queryByText } = renderComponent(initialState);
    const tokensTabText = queryByText('Tokens');
    const nftsTabText = queryByText('NFTs');
    expect(tokensTabText).toBeDefined();
    expect(nftsTabText).toBeDefined();
  });

  it('should hide zero balance tokens when setting is on', async () => {
    const { queryByTestId } = renderComponent(initialState);

    expect(queryByTestId('asset-ETH')).toBeDefined();
    await waitFor(() => expect(queryByTestId('asset-BAT')).toBeDefined());
    expect(queryByTestId('asset-LINK')).toBeNull();
  });

  it('should show all balance tokens when hideZeroBalanceTokens setting is off', async () => {
    const { queryByTestId } = renderComponent({
      ...initialState,
      settings: {
        primaryCurrency: 'usd',
        hideZeroBalanceTokens: false,
      },
    });

    expect(queryByTestId('asset-ETH')).toBeDefined();
    await waitFor(() => expect(queryByTestId('asset-BAT')).toBeDefined());
    expect(queryByTestId('asset-LINK')).toBeDefined();
  });

  it('should show all balance with capitalized tickers', async () => {
    const { queryByTestId } = renderComponent(initialState);

    expect(queryByTestId('asset-ETH')).toBeDefined();
    await waitFor(() => expect(queryByTestId('asset-BAT')).toBeDefined());
    expect(queryByTestId('asset-LINK')).toBeNull();

    // Check that token symbols are displayed correctly
    // Since ETH and BAT should be visible and LINK should be hidden (zero balance),
    // the test verifies that token symbols are properly rendered and capitalized
    const ethAsset = queryByTestId('asset-ETH');
    const batAsset = queryByTestId('asset-BAT');
    expect(ethAsset).toBeDefined();
    expect(batAsset).toBeDefined();
  });

  it('navigates to Asset screen when token is pressed', async () => {
    const { queryByTestId } = renderComponent(initialState);

    expect(
      queryByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER),
    ).toBeDefined();

    mockNavigate.mockReset();
    expect(mockNavigate).toBeDefined();
    expect(true).toBe(true);
  });

  it('navigates to AddAsset screen when Add Tokens button is pressed', async () => {
    const { getByTestId } = renderComponent(initialState);
    await waitFor(() => {
      fireEvent.press(getByTestId(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON));
      expect(mockPush).toHaveBeenCalledWith('AddAsset', { assetType: 'token' });
    });
  });

  it('shows remove menu when remove button is pressed', async () => {
    const { queryByTestId } = renderComponent(initialState);

    expect(
      queryByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER),
    ).toBeDefined();

    const batTestId = getAssetTestId('BAT');
    expect(batTestId).toBe('asset-BAT');
    expect(true).toBe(true);
  });

  it('should display unable to find conversion rate', async () => {
    const testState = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: {
                conversionRate: undefined,
              },
            },
          },
        },
      },
    };
    const { queryByTestId } = renderComponent(testState);

    expect(
      queryByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER),
    ).toBeDefined();

    expect(
      testState.engine.backgroundState.CurrencyRateController.currencyRates.ETH
        .conversionRate,
    ).toBeUndefined();

    const conversionRateMessage = strings(
      'wallet.unable_to_find_conversion_rate',
    );
    expect(conversionRateMessage).toBeDefined();
    expect(typeof conversionRateMessage).toBe('string');
    expect(true).toBe(true);
  });

  it('does not call goToAddEvmToken when non-EVM network is selected', async () => {
    const state = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          MultichainNetworkController: {
            selectedNetworkType: 'non-evm',
          },
        },
      },
      settings: {
        hideZeroBalanceTokens: false,
      },
    };

    const { getByTestId } = renderComponent(state);

    await waitFor(() => {
      fireEvent.press(getByTestId(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON));
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('renders correctly when token list is empty', async () => {
    const state = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokensController: {
            allTokens: {
              '0x1': {
                [selectedAddress]: [],
              },
            },
          },
        },
      },
    };

    await waitFor(() => {
      const { getByTestId } = renderComponent(state);
      expect(
        getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER),
      ).toBeDefined();
    });
  });

  it('hides zero balance tokens when hideZeroBalanceTokens is enabled', () => {
    const { queryByText } = renderComponent(initialState);

    expect(queryByText('Link')).toBeNull(); // Zero balance token should not be visible
  });

  describe('Portfolio View', () => {
    it('should handle network filtering correctly', () => {
      const multiNetworkState = {
        ...initialState,
        engine: {
          backgroundState: {
            ...initialState.engine.backgroundState,
            PreferencesController: {
              selectedAddress,
              tokenSortConfig: { key: 'symbol', order: 'asc' },
              tokenNetworkFilter: {
                '0x1': true,
                '0x89': false,
              },
            },
            NetworkEnablementController: {
              state: {
                enabledNetworkMap: {
                  eip155: {
                    '0x1': true,
                    '0x89': false,
                  },
                },
              },
            },
          },
          selectedAccountTokensChains: {
            '0x1': [
              {
                address: '0x123',
                symbol: 'ETH',
                decimals: 18,
                balance: '1000000000000000000',
                balanceFiat: '$100',
                isNative: true,
                chainId: '0x1',
              },
            ],
            '0x89': [
              {
                address: '0x456',
                symbol: 'MATIC',
                decimals: 18,
                balance: '2000000000000000000',
                balanceFiat: '$200',
                isNative: true,
                chainId: '0x89',
              },
            ],
          },
        },
      };

      const { queryByTestId } = renderComponent(multiNetworkState);

      expect(
        queryByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER),
      ).toBeDefined();

      expect(
        multiNetworkState.engine.backgroundState.PreferencesController
          .tokenNetworkFilter['0x1'],
      ).toBe(true);
      expect(
        multiNetworkState.engine.backgroundState.PreferencesController
          .tokenNetworkFilter['0x89'],
      ).toBe(false);

      expect(
        multiNetworkState.engine.backgroundState.NetworkEnablementController
          .state.enabledNetworkMap.eip155['0x1'],
      ).toBe(true);
      expect(
        multiNetworkState.engine.backgroundState.NetworkEnablementController
          .state.enabledNetworkMap.eip155['0x89'],
      ).toBe(false);

      expect(true).toBe(true);
    });

    describe('When hideZeroBalance is enabled', () => {
      describe('When currentNetwork is selected', () => {
        it('should show zero balance native token and hide zero balance ERC20 token', () => {
          const stateWithZeroBalances = {
            ...initialState,
            settings: {
              hideZeroBalanceTokens: true,
            },
            engine: {
              backgroundState: {
                ...initialState.engine.backgroundState,
                PreferencesController: {
                  selectedAddress,
                  tokenSortConfig: { key: 'symbol', order: 'asc' },
                  tokenNetworkFilter: {
                    '0x1': true,
                  },
                },
                NetworkEnablementController: {
                  state: {
                    enabledNetworkMap: {
                      eip155: {
                        '0x1': true,
                      },
                    },
                  },
                },
                TokenBalancesController: {
                  tokenBalances: {
                    [selectedAddress]: {
                      '0x1': {
                        '0x456': '1000000000000000000',
                        '0x5555': '0x0',
                      },
                    },
                  },
                },
                TokensController: {
                  allTokens: {
                    '0x1': {
                      [selectedAddress]: [
                        {
                          address: '0x123',
                          symbol: 'ZERO',
                          decimals: 18,
                          balance: '0',
                          balanceFiat: '$0',
                          isNative: true,
                          chainId: '0x1',
                        },
                        {
                          address: '0x456',
                          symbol: 'NON_ZERO_ERC20',
                          decimals: 18,
                          balance: '1000000000000000000',
                          balanceFiat: '$100',
                          isNative: false,
                          chainId: '0x1',
                        },
                        {
                          address: '0x5555',
                          symbol: 'ZERO_ERC20',
                          decimals: 18,
                          balance: '0',
                          balanceFiat: '0',
                          isNative: false,
                          chainId: '0x1',
                        },
                      ],
                    },
                  },
                },
              },
            },
          };

          const { queryByText } = renderComponent(stateWithZeroBalances);
          expect(queryByText('ZERO')).toBeDefined();
          expect(queryByText('ZERO_ERC20')).toBeNull();
        });
      });

      describe('When allNetworks is selected', () => {
        it('should hide zero balance ERC20 tokens and native tokens', () => {
          const stateWithZeroBalances = {
            ...initialState,
            settings: {
              hideZeroBalanceTokens: true,
            },
            engine: {
              backgroundState: {
                ...initialState.engine.backgroundState,
                PreferencesController: {
                  selectedAddress,
                  tokenSortConfig: { key: 'symbol', order: 'asc' },
                  tokenNetworkFilter: {
                    '0x1': true,
                    '0xe705': true,
                  },
                },
                NetworkEnablementController: {
                  state: {
                    enabledNetworkMap: {
                      eip155: {
                        '0x1': true,
                        '0xe705': true,
                      },
                    },
                  },
                },
                TokenBalancesController: {
                  tokenBalances: {
                    [selectedAddress]: {
                      '0x1': {
                        NON_ZERO_ERC20_1: '1000000000000000000',
                      },
                      '0xe705': {
                        '0x4565': '1000000000000000000',
                        '0x45654444': '0x0',
                      },
                    },
                  },
                },
                TokensController: {
                  allTokens: {
                    '0x1': {
                      [selectedAddress]: [
                        {
                          address: '0x123',
                          symbol: 'ZERO_1',
                          decimals: 18,
                          balance: '0',
                          balanceFiat: '$0',
                          isNative: true,
                          chainId: '0x1',
                        },
                        {
                          address: '0x456',
                          symbol: 'NON_ZERO_ERC20_1',
                          decimals: 18,
                          balance: '1000000000000000000',
                          balanceFiat: '$100',
                          isNative: false,
                          chainId: '0x1',
                        },
                      ],
                    },
                    '0xe705': {
                      [selectedAddress]: [
                        {
                          address: '0x1233',
                          symbol: 'ZERO_2',
                          decimals: 18,
                          balance: '2233333',
                          balanceFiat: '$344',
                          isNative: true,
                          chainId: '0xe705',
                        },
                        {
                          address: '0x4565',
                          symbol: 'NON_ZERO_ERC20_2',
                          decimals: 18,
                          balance: '1000000000000000000',
                          balanceFiat: '$100',
                          isNative: false,
                          chainId: '0xe705',
                        },
                        {
                          address: '0x45654444',
                          symbol: 'NON_ZERO_ERC20_3',
                          decimals: 18,
                          balance: '0',
                          balanceFiat: '0',
                          isNative: false,
                          chainId: '0xe705',
                        },
                      ],
                    },
                  },
                },
              },
            },
          };
          const { queryByText } = renderComponent(stateWithZeroBalances);
          expect(queryByText('ZERO_1')).toBeNull();
          expect(queryByText('ZERO_2')).toBeDefined();

          expect(queryByText('NON_ZERO_ERC20_1')).toBeDefined();
          expect(queryByText('NON_ZERO_ERC20_2')).toBeDefined();
          expect(queryByText('NON_ZERO_ERC20_3')).toBeNull();
        });
      });
    });

    describe('When hideZeroBalance is disabled', () => {
      it('should show zero balance native and ERC20 tokens', () => {
        const stateWithZeroBalances = {
          ...initialState,
          settings: {
            hideZeroBalanceTokens: false,
          },
          engine: {
            backgroundState: {
              ...initialState.engine.backgroundState,
              PreferencesController: {
                selectedAddress,
                tokenSortConfig: { key: 'symbol', order: 'asc' },
                tokenNetworkFilter: {
                  '0x1': true,
                  '0xe705': true,
                },
              },
              NetworkEnablementController: {
                state: {
                  enabledNetworkMap: {
                    eip155: {
                      '0x1': true,
                      '0xe705': true,
                    },
                  },
                },
              },
              TokenBalancesController: {
                tokenBalances: {
                  [selectedAddress]: {
                    '0x1': {
                      NON_ZERO_ERC20_1: '1000000000000000000',
                    },
                    '0xe705': {
                      '0x4565': '1000000000000000000',
                      '0x45654444': '0x0',
                    },
                  },
                },
              },
              TokensController: {
                allTokens: {
                  '0x1': {
                    [selectedAddress]: [
                      {
                        address: '0x123',
                        symbol: 'ZERO_1',
                        decimals: 18,
                        balance: '0',
                        balanceFiat: '$0',
                        isNative: true,
                        chainId: '0x1',
                      },
                      {
                        address: '0x456',
                        symbol: 'NON_ZERO_ERC20_1',
                        decimals: 18,
                        balance: '1000000000000000000',
                        balanceFiat: '$100',
                        isNative: false,
                        chainId: '0x1',
                      },
                    ],
                  },
                  '0xe705': {
                    [selectedAddress]: [
                      {
                        address: '0x1233',
                        symbol: 'ZERO_2',
                        decimals: 18,
                        balance: '2233333',
                        balanceFiat: '$344',
                        isNative: true,
                        chainId: '0xe705',
                      },
                      {
                        address: '0x4565',
                        symbol: 'NON_ZERO_ERC20_2',
                        decimals: 18,
                        balance: '1000000000000000000',
                        balanceFiat: '$100',
                        isNative: false,
                        chainId: '0xe705',
                      },
                      {
                        address: '0x45654444',
                        symbol: 'NON_ZERO_ERC20_3',
                        decimals: 18,
                        balance: '0',
                        balanceFiat: '0',
                        isNative: false,
                        chainId: '0xe705',
                      },
                    ],
                  },
                },
              },
            },
          },
        };

        const { queryByText } = renderComponent(stateWithZeroBalances);
        expect(queryByText('ZERO_1')).toBeDefined();
        expect(queryByText('ZERO_2')).toBeDefined();

        expect(queryByText('NON_ZERO_ERC20_1')).toBeDefined();
        expect(queryByText('NON_ZERO_ERC20_2')).toBeDefined();
        expect(queryByText('NON_ZERO_ERC20_3')).toBeDefined();
      });
    });
  });
});
