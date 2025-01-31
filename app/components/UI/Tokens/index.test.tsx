import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { fireEvent, waitFor } from '@testing-library/react-native';
import Tokens from './';
import { BN } from 'ethereumjs-util';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { getAssetTestId } from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import { backgroundState } from '../../../util/test/initial-root-state';
import { strings } from '../../../../locales/i18n';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import Engine from '../../../core/Engine';
import { createTokensBottomSheetNavDetails } from './TokensBottomSheet';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../util/networks';
// eslint-disable-next-line import/no-namespace
import * as multichain from '../../../selectors/multichain';

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(() => Promise.resolve()),
}));

const selectedAddress = '0x123';

jest.mock('./TokensBottomSheet', () => ({
  createTokensBottomSheetNavDetails: jest.fn(() => ['BottomSheetScreen', {}]),
}));

jest.mock('../../../core/Engine', () => ({
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    TokensController: {
      ignoreTokens: jest.fn(() => Promise.resolve()),
      detectTokens: jest.fn(() => Promise.resolve()),
    },
    TokenDetectionController: {
      detectTokens: jest.fn(() => Promise.resolve()),
    },
    AccountTrackerController: {
      refresh: jest.fn(() => Promise.resolve()),
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(() => Promise.resolve()),
    },
    TokenRatesController: {
      updateExchangeRatesByChainId: jest.fn(() => Promise.resolve()),
    },
    TokenBalancesController: {
      updateBalances: jest.fn(() => Promise.resolve()),
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
  },
}));

const mockTokens = {
  '0x1': {
    [selectedAddress]: [
      {
        name: 'Ethereum',
        symbol: 'ETH',
        address: '0x0',
        decimals: 18,
        isETH: true,
        isStaked: false,
        balanceFiat: '< $0.01',
        iconUrl: '',
      },
      {
        name: 'Bat',
        symbol: 'BAT',
        address: '0x01',
        decimals: 18,
        balanceFiat: '$0',
        iconUrl: '',
      },
      {
        name: 'Link',
        symbol: 'LINK',
        address: '0x02',
        decimals: 18,
        balanceFiat: '$0',
        iconUrl: '',
      },
    ],
  },
};
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
      TokensController: {
        tokens: [
          {
            name: 'Ethereum',
            symbol: 'ETH',
            address: '0x0',
            decimals: 18,
            isETH: true,
            isStaked: false,
            balanceFiat: '< $0.01',
            iconUrl: '',
          },
          {
            name: 'Bat',
            symbol: 'BAT',
            address: '0x01',
            decimals: 18,
            balanceFiat: '$0',
            iconUrl: '',
          },
          {
            name: 'Link',
            symbol: 'LINK',
            address: '0x02',
            decimals: 18,
            balanceFiat: '$0',
            iconUrl: '',
          },
        ],
        allTokens: {
          '0x1': {
            [selectedAddress]: [
              {
                name: 'Ethereum',
                symbol: 'ETH',
                address: '0x0',
                decimals: 18,
                isETH: true,

                balanceFiat: '< $0.01',
                iconUrl: '',
              },
              {
                name: 'Bat',
                symbol: 'BAT',
                address: '0x01',
                decimals: 18,
                balanceFiat: '$0',
                iconUrl: '',
              },
              {
                name: 'Link',
                symbol: 'LINK',
                address: '0x02',
                decimals: 18,
                balanceFiat: '$0',
                iconUrl: '',
              },
            ],
          },
        },
        detectedTokens: [],
      },
      TokenRatesController: {
        marketData: {
          '0x1': {
            '0x0': { price: 0.005 },
            '0x01': { price: 0.005 },
            '0x02': { price: 0.005 },
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
              '0x00': new BN(2),
              '0x01': new BN(2),
              '0x02': new BN(0),
            },
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

const Stack = createStackNavigator();
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (state: any = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Amount" options={{}}>
        {(props) => (
          <Tokens
            tokens={state.engine.backgroundState.TokensController.tokens}
            {...props}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('Tokens', () => {
  beforeEach(() => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);
  });

  afterEach(() => {
    mockNavigate.mockClear();
    mockPush.mockClear();
  });

  it('should render correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should hide zero balance tokens when setting is on', async () => {
    const { toJSON, getByText, queryByText } = renderComponent(initialState);

    expect(getByText('Ethereum')).toBeDefined();
    await waitFor(() => expect(getByText('Bat')).toBeDefined());
    expect(queryByText('Link')).toBeNull();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should show all balance tokens when hideZeroBalanceTokens setting is off', async () => {
    const { toJSON, getByText } = renderComponent({
      ...initialState,
      settings: {
        primaryCurrency: 'usd',
        hideZeroBalanceTokens: false,
      },
    });

    expect(getByText('Ethereum')).toBeDefined();
    await waitFor(() => expect(getByText('Bat')).toBeDefined());
    expect(getByText('Link')).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to Asset screen when token is pressed', () => {
    const { getByText } = renderComponent(initialState);
    fireEvent.press(getByText('Ethereum'));
    expect(mockNavigate).toHaveBeenCalledWith('Asset', {
      ...initialState.engine.backgroundState.TokensController.tokens[0],
      tokenFiatAmount: NaN,
    });
  });

  it('navigates to AddAsset screen when Add Tokens button is pressed', () => {
    const { getByTestId } = renderComponent(initialState);
    fireEvent.press(getByTestId(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON));
    expect(mockPush).toHaveBeenCalledWith('AddAsset', { assetType: 'token' });
  });

  it('shows remove menu when remove button is pressed', () => {
    const { getByTestId, queryAllByTestId } = renderComponent(initialState);
    fireEvent.press(queryAllByTestId(getAssetTestId('BAT'))[0], 'longPress');
    expect(getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER)).toBeDefined();
  });

  it('should display unable to find conversion rate', async () => {
    const state = {
      engine: {
        backgroundState: {
          ...backgroundState,
          TokensController: {
            detectedTokens: [],
            allTokens: mockTokens,
            tokens: [
              {
                name: 'Link',
                symbol: 'LINK',
                address: '0x02',
                decimals: 18,
                balanceFiat: '$0',
                iconUrl: '',
              },
            ],
          },
          TokenRatesController: {
            marketData: {
              '0x1': {
                '0x02': undefined,
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
          AccountsController: {
            internalAccounts: {
              selectedAccount: '1',
              accounts: {
                '1': {
                  address: selectedAddress,
                },
              },
            },
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
          TokenBalancesController: {
            tokenBalances: {
              [selectedAddress]: {
                '0x1': {
                  '0x02': new BN(1),
                },
              },
            },
          },
        },
      },
    };
    const { findByText } = renderComponent(state);

    expect(
      await findByText(strings('wallet.unable_to_find_conversion_rate')),
    ).toBeDefined();
  });

  it('should refresh tokens and call necessary controllers', async () => {
    const { getByTestId } = renderComponent(initialState);

    fireEvent.scroll(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
      {
        nativeEvent: {
          contentOffset: { y: 100 }, // Simulate scroll offset
          contentSize: { height: 1000, width: 500 }, // Total size of scrollable content
          layoutMeasurement: { height: 800, width: 500 }, // Size of the visible content area
        },
      },
    );

    fireEvent(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
      'refresh',
      {
        refreshing: true,
      },
    );

    await waitFor(
      () => {
        expect(
          Engine.context.TokenDetectionController.detectTokens,
        ).toHaveBeenCalled();
        expect(
          Engine.context.TokenBalancesController.updateBalances,
        ).toHaveBeenCalled();
        expect(
          Engine.context.AccountTrackerController.refresh,
        ).toHaveBeenCalled();
        expect(
          Engine.context.CurrencyRateController.updateExchangeRate,
        ).toHaveBeenCalled();
        expect(
          Engine.context.TokenRatesController.updateExchangeRatesByChainId,
        ).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it('triggers bottom sheet when sort controls are pressed', async () => {
    const { getByTestId } = renderComponent(initialState);

    await fireEvent.press(getByTestId(WalletViewSelectorsIDs.SORT_BY));

    await waitFor(() => {
      expect(createTokensBottomSheetNavDetails).toHaveBeenCalledWith({});
    });
  });

  it('calls onRefresh and updates state', async () => {
    const { getByTestId } = renderComponent(initialState);

    fireEvent(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
      'refresh',
      {
        refreshing: true,
      },
    );

    await waitFor(() => {
      expect(
        Engine.context.TokenDetectionController.detectTokens,
      ).toHaveBeenCalled();
      expect(
        Engine.context.AccountTrackerController.refresh,
      ).toHaveBeenCalled();
      expect(
        Engine.context.CurrencyRateController.updateExchangeRate,
      ).toHaveBeenCalled();
      expect(
        Engine.context.TokenRatesController.updateExchangeRatesByChainId,
      ).toHaveBeenCalled();
    });
  });

  it('hides zero balance tokens when hideZeroBalanceTokens is enabled', () => {
    const { queryByText } = renderComponent(initialState);

    expect(queryByText('Link')).toBeNull(); // Zero balance token should not be visible
  });

  it('triggers sort controls when sort button is pressed', async () => {
    const { getByTestId } = renderComponent(initialState);

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.SORT_BY));

    await waitFor(() => {
      expect(createTokensBottomSheetNavDetails).toHaveBeenCalledWith({});
    });
  });

  describe('Portfolio View', () => {
    let selectAccountTokensAcrossChainsSpy: jest.SpyInstance;

    beforeEach(() => {
      selectAccountTokensAcrossChainsSpy = jest.spyOn(
        multichain,
        'selectAccountTokensAcrossChains',
      );
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
    });

    afterEach(() => {
      selectAccountTokensAcrossChainsSpy.mockRestore();
    });

    it('should match the snapshot when portfolio view is enabled', () => {
      const { toJSON } = renderComponent(initialState);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should call selectAccountTokensAcrossChains when enabled', () => {
      renderComponent(initialState);
      expect(selectAccountTokensAcrossChainsSpy).toHaveBeenCalled();
    });

    it('should not call selectAccountTokensAcrossChains when disabled', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);
      renderComponent(initialState);
      expect(selectAccountTokensAcrossChainsSpy).not.toHaveBeenCalled();
    });

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

      const { queryByText } = renderComponent(multiNetworkState);
      expect(queryByText('ETH')).toBeDefined();
      expect(queryByText('MATIC')).toBeNull();
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
