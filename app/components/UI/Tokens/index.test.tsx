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

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(() => Promise.resolve()),
}));

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
      startPollingByNetworkClientId: jest.fn(() => Promise.resolve()),
    },
    TokenRatesController: {
      updateExchangeRates: jest.fn(() => Promise.resolve()),
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
  },
}));

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      TokensController: {
        tokens: [
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
        contractBalances: {
          '0x00': new BN(2),
          '0x01': new BN(2),
          '0x02': new BN(0),
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
  afterEach(() => {
    mockNavigate.mockClear();
    mockPush.mockClear();
  });

  it('should render correctly', () => {
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
              0x1: {
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
          TokenBalancesController: {
            contractBalances: {
              '0x02': new BN(1),
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

    await waitFor(() => {
      expect(
        Engine.context.TokenDetectionController.detectTokens,
      ).toHaveBeenCalled();
      expect(
        Engine.context.AccountTrackerController.refresh,
      ).toHaveBeenCalled();
      expect(
        Engine.context.CurrencyRateController.startPollingByNetworkClientId,
      ).toHaveBeenCalled();
      expect(
        Engine.context.TokenRatesController.updateExchangeRates,
      ).toHaveBeenCalled();
    });
  });

  it('triggers bottom sheet when sort controls are pressed', async () => {
    const { getByText } = renderComponent(initialState);

    await fireEvent.press(getByText('Sort by'));

    await waitFor(() => {
      expect(createTokensBottomSheetNavDetails).toHaveBeenCalledWith({});
    });
  });
});
