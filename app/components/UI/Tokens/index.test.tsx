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
import AppConstants from '../../../../app/core/AppConstants';
import Routes from '../../../../app/constants/navigation/Routes';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import Engine from '../../../core/Engine';
import { createTokensBottomSheetNavDetails } from './TokensBottomSheet';
import useStakingEligibility from '../Stake/hooks/useStakingEligibility';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../util/networks';

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

jest.mock('../../UI/Stake/constants', () => ({
  isPooledStakingFeatureEnabled: jest.fn().mockReturnValue(true),
}));

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

jest.mock('../Stake/hooks/useStakingChain', () => ({
  useStakingChainByChainId: () => ({
    isStakingSupportedChain: true,
  }),
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

  it('renders stake button correctly', () => {
    const { getByTestId } = renderComponent(initialState);

    expect(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON)).toBeDefined();
  });

  it('navigates to Web view when stake button is pressed and user is not eligible', async () => {
    (useStakingEligibility as jest.Mock).mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      refreshPooledStakingEligibility: jest
        .fn()
        .mockResolvedValue({ isEligible: false }),
      error: false,
    });
    const { getByTestId } = renderComponent(initialState);

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        params: {
          newTabUrl: `${AppConstants.STAKE.URL}?metamaskEntry=mobile`,
          timestamp: 123,
        },
        screen: Routes.BROWSER.VIEW,
      });
    });
  });

  it('navigates to Stake Input screen when stake button is pressed and user is eligible', async () => {
    (useStakingEligibility as jest.Mock).mockReturnValue({
      isEligible: true,
      isLoadingEligibility: false,
      refreshPooledStakingEligibility: jest
        .fn()
        .mockResolvedValue({ isEligible: true }),
      error: false,
    });
    const { getByTestId } = renderComponent(initialState);

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STAKING.STAKE,
      });
    });
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

  it('navigates to Stake Input screen only when eligible', async () => {
    (useStakingEligibility as jest.Mock).mockReturnValue({
      isEligible: true,
      isLoadingEligibility: false,
      refreshPooledStakingEligibility: jest
        .fn()
        .mockResolvedValue({ isEligible: true }),
      error: false,
    });

    const { getByTestId } = renderComponent(initialState);

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STAKING.STAKE,
      });
    });
  });

  it('does not navigate to Stake Input screen if not eligible', async () => {
    (useStakingEligibility as jest.Mock).mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      refreshPooledStakingEligibility: jest
        .fn()
        .mockResolvedValue({ isEligible: false }),
      error: false,
    });

    const { getByTestId } = renderComponent(initialState);

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STAKING.STAKE,
      });
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
    beforeEach(() => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
    });

    it('should match the snapshot when portfolio view is enabled  ', () => {
      const { toJSON } = renderComponent(initialState);
      expect(toJSON()).toMatchSnapshot();
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

    it('should filter zero balance tokens when hideZeroBalanceTokens is enabled', () => {
      const stateWithZeroBalances = {
        ...initialState,
        settings: {
          hideZeroBalanceTokens: true,
        },
        engine: {
          backgroundState: {
            ...initialState.engine.backgroundState,
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
                      isNative: false,
                      chainId: '0x1',
                    },
                    {
                      address: '0x456',
                      symbol: 'NON_ZERO',
                      decimals: 18,
                      balance: '1000000000000000000',
                      balanceFiat: '$100',
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
      expect(queryByText('ZERO')).toBeNull();
      expect(queryByText('NON_ZERO')).toBeDefined();
    });
  });
});
