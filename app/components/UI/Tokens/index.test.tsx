import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { fireEvent, waitFor } from '@testing-library/react-native';
import Tokens from './';
import { BN } from 'ethereumjs-util';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import Engine from '../../../core/Engine';
import {
  getAssetTestId,
  IMPORT_TOKEN_BUTTON_ID,
  MAIN_WALLET_VIEW_VIA_TOKENS_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import {
  PORTFOLIO_BUTTON,
  TOTAL_BALANCE_TEXT,
} from '../../../../wdio/screen-objects/testIDs/Components/Tokens.testIds';

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
      TokenListController: {
        tokenList: {},
      },
      TokenRatesController: {
        contractExchangeRates: {
          '0x0': 0.005,
          '0x01': 0.005,
          '0x02': 0.005,
        },
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        conversionRate: 1,
      },
      TokenBalancesController: {
        contractBalances: {
          '0x00': new BN(2),
          '0x01': new BN(2),
          '0x02': new BN(0),
        },
      },
      NetworkController: {
        providerConfig: { chainId: '1' },
      },
      PreferencesController: { useTokenDetection: true },
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
    fireEvent.press(getByTestId(IMPORT_TOKEN_BUTTON_ID));
    expect(mockPush).toHaveBeenCalledWith('AddAsset', { assetType: 'token' });
  });

  it('shows remove menu when remove button is pressed', () => {
    const { getByTestId, queryAllByTestId } = renderComponent(initialState);
    fireEvent.press(queryAllByTestId(getAssetTestId('BAT'))[0], 'longPress');
    expect(getByTestId(MAIN_WALLET_VIEW_VIA_TOKENS_ID)).toBeDefined();
  });

  it('fiat balance must be defined', () => {
    const { getByTestId } = renderComponent(initialState);

    expect(getByTestId(TOTAL_BALANCE_TEXT)).toBeDefined();
  });
  it('portfolio button should render correctly', () => {
    const { getByTestId } = renderComponent(initialState);

    expect(getByTestId(PORTFOLIO_BUTTON)).toBeDefined();
  });
});
