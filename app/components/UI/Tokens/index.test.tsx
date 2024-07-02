import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { fireEvent, waitFor } from '@testing-library/react-native';
import Tokens from './';
import { BN } from 'ethereumjs-util';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import Engine from '../../../core/Engine';
import { getAssetTestId } from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../../app/core/AppConstants';
import Routes from '../../../../app/constants/navigation/Routes';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

const mockEngine = Engine;

jest.mock('../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    TokensController: {
      ignoreTokens: jest.fn(() => Promise.resolve()),
    },
  },
}));

const initialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
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
    // ETH and BAT should display

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
    // All three should display
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to Asset screen when token is pressed', () => {
    const { getByText } = renderComponent(initialState);
    fireEvent.press(getByText('Ethereum'));
    expect(mockNavigate).toHaveBeenCalledWith('Asset', {
      ...initialState.engine.backgroundState.TokensController.tokens[0],
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

  it('fiat balance must be defined', () => {
    const { getByTestId } = renderComponent(initialState);

    expect(
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
    ).toBeDefined();
  });
  it('portfolio button should render correctly', () => {
    const { getByTestId } = renderComponent(initialState);

    expect(getByTestId(WalletViewSelectorsIDs.PORTFOLIO_BUTTON)).toBeDefined();
  });
  it('navigates to Portfolio url when portfolio button is pressed', () => {
    const { getByTestId } = renderComponent(initialState);

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.PORTFOLIO_BUTTON));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      params: {
        newTabUrl: `${AppConstants.PORTFOLIO.URL}/?metamaskEntry=mobile`,
        timestamp: 123,
      },
      screen: Routes.BROWSER.VIEW,
    });
  });
  it('should display unable to find conversion rate', async () => {
    const state = {
      engine: {
        backgroundState: {
          ...initialBackgroundState,
          TokensController: {
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
  it('navigates to Portfolio Stake url when stake button is pressed', () => {
    const { getByTestId } = renderComponent(initialState);

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      params: {
        newTabUrl: `${AppConstants.STAKE.URL}?metamaskEntry=mobile`,
        timestamp: 123,
      },
      screen: Routes.BROWSER.VIEW,
    });
  });
});
