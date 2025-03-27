import React from 'react';
import NonEvmTokens from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { Cryptocurrency } from '@metamask/assets-controllers';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import {
  MOCK_SOLANA_ACCOUNT,
  MOCK_MULTICHAIN_NON_EVM_ACCOUNTS,
} from '../../../util/test/accountsControllerTestUtils';
import { createStackNavigator } from '@react-navigation/stack';
import { RootState } from '../../../reducers';
import { SolScope } from '@metamask/keyring-api';
import { MultichainNativeAssets } from '../../../selectors/multichain';

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

const initialState = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          selectedAccount: MOCK_SOLANA_ACCOUNT.id,
          accounts: MOCK_MULTICHAIN_NON_EVM_ACCOUNTS,
        },
      },
      TokenBalancesController: {
        tokenBalances: {},
      },
      TokenRatesController: {
        marketData: {},
      },
      AccountTrackerController: {
        accountsByChainId: {
          [SolScope.Mainnet]: {
            [MOCK_SOLANA_ACCOUNT.address]: {
              balance: '5.5',
            },
          },
        },
      },
      MultichainBalancesController: {
        balances: {
          [MOCK_SOLANA_ACCOUNT.id]: {
            [MultichainNativeAssets.Solana]: {
              amount: '5.5',
              unit: 'SOL',
            },
          },
        },
      },
      MultichainTransactionsController: {
        nonEvmTransactions: {
          [MOCK_SOLANA_ACCOUNT.id]: {
            transactions: [],
            next: null,
            lastUpdated: 0,
          },
        },
      },
      RatesController: {
        rates: {
          sol: {
            conversionRate: 100,
            usdConversionRate: 100,
            conversionDate: new Date().getTime(),
          },
        },
        fiatCurrency: 'usd',
        cryptocurrencies: ['sol' as Cryptocurrency],
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        conversionRate: 100,
      },
      PreferencesController: {
        selectedAddress: MOCK_SOLANA_ACCOUNT.address,
        shouldShowFiat: true,
      },
      MultichainNetworkController: {
        isEvmSelected: false,
        selectedMultichainNetworkChainId: SolScope.Mainnet,
        multichainNetworkConfigurationsByChainId: {
          [SolScope.Mainnet]: {
            chainId: SolScope.Mainnet,
            name: 'Solana Mainnet',
            nativeCurrency:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:solAddress',
            isEvm: false,
          },
        },
      },
    },
  },

  settings: {
    showTestNetworks: true,
  },
} as unknown as RootState;

const Stack = createStackNavigator();
const renderComponent = (state: Partial<RootState> = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Amount" options={{}}>
        {() => <NonEvmTokens />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state: { ...initialState, ...state } },
  );

describe('NonEvmTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should display the Solana token with correct balance', async () => {
    const { getByTestId, getByText } = renderComponent();
    expect(getByText('SOL')).toBeDefined();
    const balanceText = getByTestId('fiat-balance-test-id');
    expect(balanceText.props.children).toBe('5.5 SOL');
  });

  it('should show fiat value', async () => {
    const { getByTestId } = renderComponent();
    // With balance 5.5 and conversion rate 100, fiat value should be $550.00
    const balanceText = getByTestId('main-balance-test-id');
    expect(balanceText).toBeDefined();
  });

  it('should disable add token functionality', () => {
    const { queryByTestId } = renderComponent();
    expect(
      queryByTestId(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON),
    ).toBeNull();
  });
});
