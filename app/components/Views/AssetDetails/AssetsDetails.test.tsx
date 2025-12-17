import React from 'react';
import { InteractionManager } from 'react-native';
import AssetDetails from '.';
import configureMockStore from 'redux-mock-store';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { backgroundState } from '../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../util/test/network';
import Engine from '../../../core/Engine';
import { TokenI } from '../../UI/Tokens/types';

jest.mock('../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  getDecimalChainId: jest.fn(() => 1),
}));

jest.mock('@react-navigation/compat', () => ({
  withNavigation: (Component: React.ComponentType) => Component,
}));

const MOCK_ADDRESS_1 = '0x0';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokensController: {
      ignoreTokens: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
    },
  },
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    navigate: mockNavigate,
    goBack: mockGoBack,
  })),
}));

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

// Mock all selector modules to avoid dependency chain issues
jest.mock('../../../selectors/accountsController');
jest.mock('../../../selectors/multichainAccounts/accountTreeController');
jest.mock('../../../selectors/smartTransactionsController');

// Import and mock specific selectors after module mocks
import { selectLastSelectedEvmAccount } from '../../../selectors/accountsController';

const mockSelectLastSelectedEvmAccount =
  selectLastSelectedEvmAccount as jest.MockedFunction<
    typeof selectLastSelectedEvmAccount
  >;

// Set up the specific mocks we need
mockSelectLastSelectedEvmAccount.mockReturnValue({
  type: 'eip155:eoa' as const,
  id: 'mock-account-id',
  options: {},
  metadata: {
    name: 'Test Account',
    importTime: Date.now(),
    keyring: {
      type: 'HD Key Tree',
    },
  },
  address: '0x0', // MOCK_ADDRESS_1
  scopes: ['eip155:1'],
  methods: [],
});

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
      TokenBalancesController: {
        tokenBalances: {
          [MOCK_ADDRESS_1]: {
            [CHAIN_IDS.MAINNET]: {
              '0xAddress': '0xde0b6b3a7640000',
            },
          },
        },
      },
      TokensController: {
        tokens: [
          {
            address: '0xAddress',
            symbol: 'TKN',
            decimals: 18,
            aggregators: ['Metamask', 'CMC'],
          },
        ],
        tokensByChainId: {
          [CHAIN_IDS.MAINNET]: [
            {
              address: '0xAddress',
              symbol: 'TKN',
              decimals: 18,
              aggregators: ['Metamask', 'CMC'],
            },
          ],
        },
        allTokens: {
          [CHAIN_IDS.MAINNET]: {
            [MOCK_ADDRESS_1]: [
              {
                address: '0xAddress',
                symbol: 'TKN',
                decimals: 18,
                aggregators: ['Metamask', 'CMC'],
              },
            ],
          },
        },
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: 'id',
          accounts: {
            id: {
              address: MOCK_ADDRESS_1,
            },
          },
        },
      },
      TokenRatesController: {
        contractExchangeRates: {
          '0xAddress': { price: 2 },
        },
        marketData: {
          '0xAddress': { price: 2 },
        },
      },
      CurrencyRateController: {
        conversionRate: 1,
        currentCurrency: 'USD',
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

const store = mockStore(initialState);

const mockAsset = {
  address: '0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed',
  balanceFiat: '$11.89',
  chainId: '0x89',
  decimals: 6,
  image:
    'https://static.cx.metamask.io/api/v1/tokenIcons/137/0x750e4c4984a9e0f12978ea6742bc1c5d248f40ed.png',
  isETH: false,
  isNative: false,
};

describe('AssetDetails', () => {
  const renderComponent = () =>
    render(
      <Provider store={store}>
        <AssetDetails
          route={{
            params: {
              address: '0xAddress',
              chainId: CHAIN_IDS.MAINNET,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />
      </Provider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders token details correctly', () => {
    const { getByText } = renderComponent();

    expect(getByText('Token')).toBeDefined();
    expect(getByText('Token amount')).toBeDefined();
    expect(getByText('Token contract address')).toBeDefined();
    expect(getByText('Token decimal')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Token lists')).toBeDefined();
  });

  it('calls goBack when back button is pressed', () => {
    const { getByTestId } = renderComponent();

    const backButton = getByTestId('button-icon');
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('copies address to clipboard and shows alert', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <AssetDetails
          route={{
            params: {
              address: '0xAddress',
              chainId: CHAIN_IDS.MAINNET,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />
      </Provider>,
    );

    const copyElement = getByText('0xAddre...dress');
    fireEvent.press(copyElement);

    await waitFor(() => {
      expect(
        Engine.context.TokensController.ignoreTokens,
      ).not.toHaveBeenCalled();
    });
  });

  it('navigates to asset hide confirmation on pressing hide button', async () => {
    const { getByText } = renderComponent();

    fireEvent.press(getByText('Hide token'));

    await waitFor(() => {
      expect(
        Engine.context.TokensController.ignoreTokens,
      ).not.toHaveBeenCalled();
    });
  });

  it('hides token and navigates to WalletView when onConfirm is called', async () => {
    const runAfterInteractionsSpy = jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback();
        }
        return {
          then: jest.fn(),
          done: jest.fn(),
          cancel: jest.fn(),
        };
      });

    const { getByText } = renderComponent();

    fireEvent.press(getByText('Hide token'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'AssetHideConfirmation',
          params: expect.objectContaining({
            onConfirm: expect.any(Function),
          }),
        }),
      );
    });

    const onConfirmCallback = mockNavigate.mock.calls[0][1].params.onConfirm;
    onConfirmCallback();

    expect(mockNavigate).toHaveBeenCalledWith('WalletView');
    expect(Engine.context.TokensController.ignoreTokens).toHaveBeenCalledWith(
      ['0xAddress'],
      'mainnet',
    );

    runAfterInteractionsSpy.mockRestore();
  });

  it('renders warning banner if balance is undefined', () => {
    const mockEmptyState = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenBalancesController: {
            tokenBalances: {},
          },
        },
      },
    };

    const mockStoreEmpty = mockStore(mockEmptyState);

    const { getByText } = render(
      <Provider store={mockStoreEmpty}>
        <AssetDetails
          route={{
            params: {
              address: '0xAddress',
              chainId: CHAIN_IDS.MAINNET,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />
      </Provider>,
    );

    expect(getByText('troubleshooting missing balances')).toBeDefined();
  });

  it('renders balance in ETH if primary currency is ETH', () => {
    const { getByText } = renderComponent();
    expect(getByText('1')).toBeDefined();
  });

  it('renders balance in fiat if primary currency is fiat', () => {
    const mockFiatState = {
      ...initialState,
      settings: {
        primaryCurrency: 'fiat',
      },
    };
    const mockStoreFiat = mockStore(mockFiatState);

    const { getByText } = render(
      <Provider store={mockStoreFiat}>
        <AssetDetails
          route={{
            params: {
              address: '0xAddress',
              chainId: CHAIN_IDS.MAINNET,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />
      </Provider>,
    );

    expect(getByText('1')).toBeDefined();
  });
});
