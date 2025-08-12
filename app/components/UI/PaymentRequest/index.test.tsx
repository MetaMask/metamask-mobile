import React from 'react';
import {
  render,
  fireEvent,
  act,
  userEvent,
} from '@testing-library/react-native';
import PaymentRequest from './index';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { SolScope } from '@metamask/keyring-api';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import Routes from '../../../constants/navigation/Routes';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../util/networks';
import ethLogo from '../../../assets/images/eth-logo.png';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
}));

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState: {
      CurrencyRateController: {
        conversionRate: 1,
        currentCurrency: 'USD',
      },
      TokenRatesController: {
        contractExchangeRates: {},
        marketData: {
          '0x1': {
            '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc': {
              price: 1,
            },
          },
        },
      },
      TokensController: {
        marketData: {
          '0x1': {
            '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc': {
              price: 1,
            },
          },
        },
        allTokens: {
          '0x1': {
            '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272': [],
          },
        },
      },
      NetworkController: {
        provider: {
          ticker: 'ETH',
          chainId: '1',
        },
      },
      MultichainNetworkController: {
        isEvmSelected: true,
        selectedMultichainNetworkChainId: SolScope.Mainnet,

        multichainNetworkConfigurationsByChainId: {},
      },
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        internalAccounts: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
          selectedAccount: '30786334-3935-4563-b064-363339643939',
        },
      },
      TokenListController: {
        tokensChainsCache: {
          '0x1': {
            data: [
              {
                address: '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc',
                symbol: 'BAT',
                decimals: 18,
                name: 'Basic Attention Token',
                iconUrl:
                  'https://assets.coingecko.com/coins/images/677/thumb/basic-attention-token.png?1547034427',
                type: 'erc20',
              },
            ],
          },
        },
      },
      PreferencesController: {
        ipfsGateway: {},
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

let mockSetShowError: jest.Mock;
let mockShowError = false;

beforeEach(() => {
  mockSetShowError = jest.fn((value) => {
    mockShowError = value;
  });
  (React.useState as jest.Mock).mockImplementation((state) => [
    state,
    mockSetShowError,
  ]);
});

const store = mockStore(initialState);

const mockNavigation = {
  setOptions: jest.fn(),
  setParams: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockRoute = {
  params: {
    dispatch: jest.fn(),
  },
};

const renderComponent = (props = {}) =>
  render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>
        <PaymentRequest
          navigation={mockNavigation}
          route={mockRoute}
          networkImageSource=""
          {...props}
        />
      </ThemeContext.Provider>
    </Provider>,
  );

describe('PaymentRequest', () => {
  it('renders correctly', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with network picker when feature flag is enabled', () => {
    jest
      .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
      .mockReturnValue(true);

    const { toJSON } = renderComponent({
      chainId: '0x1',
      networkImageSource: ethLogo,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays the correct title for asset selection', () => {
    const { getByText } = renderComponent();
    expect(getByText('Choose an asset to request')).toBeTruthy();
  });

  it('allows searching for assets', () => {
    const { getByPlaceholderText } = renderComponent();
    const searchInput = getByPlaceholderText('Search assets');
    fireEvent.changeText(searchInput, 'ETH');
    expect(searchInput.props.value).toBe('ETH');
  });

  it('switches to amount input mode when an asset is selected', async () => {
    const { getByText } = renderComponent({ navigation: mockNavigation });

    await userEvent.press(getByText('ETH'));

    expect(getByText('Enter amount')).toBeTruthy();
    expect(mockNavigation.setParams).toHaveBeenCalledWith({
      mode: 'amount',
      dispatch: expect.any(Function),
    });
  });

  it('updates amount when input changes', async () => {
    const { getByText, getByPlaceholderText } = renderComponent();

    // First, select an asset
    await userEvent.press(getByText('ETH'));

    const amountInput = getByPlaceholderText('0.00');
    await userEvent.type(amountInput, '1.5');

    expect(amountInput.props.value).toBe('1.5');
  });

  it('displays an error when an invalid amount is entered', async () => {
    const { getByText, getByPlaceholderText, queryByText } = renderComponent();

    (React.useState as jest.Mock).mockImplementation(() => [
      mockShowError,
      mockSetShowError,
    ]);

    mockSetShowError(true);

    await userEvent.press(getByText('ETH'));

    const amountInput = getByPlaceholderText('0.00');
    const nextButton = getByText('Next');

    await act(async () => {
      fireEvent.changeText(amountInput, '0');
      fireEvent.press(nextButton);
    });

    expect(mockSetShowError).toHaveBeenCalledWith(true);
    expect(queryByText('Invalid request, please try again')).toBeTruthy();
  });

  describe('handleNetworkPickerPress', () => {
    it('should navigate to network selector modal when feature flag is enabled', () => {
      jest
        .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(true);

      const mockMetrics = {
        trackEvent: jest.fn(),
        createEventBuilder: jest.fn(() => ({
          addProperties: jest.fn(() => ({
            build: jest.fn(() => 'builtEvent'),
          })),
        })),
      };

      const { getByTestId } = renderComponent({
        metrics: mockMetrics,
        chainId: '0x1',
        networkImageSource: ethLogo,
      });

      const networkPicker = getByTestId(
        WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER,
      );

      act(() => {
        fireEvent.press(networkPicker);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.NETWORK_SELECTOR,
        },
      );
    });

    it('should not render network picker when feature flag is disabled', () => {
      // Feature flag is already set to false in beforeEach
      const { queryByTestId } = renderComponent({
        chainId: '0x1',
        networkImageSource: ethLogo,
      });

      const networkPicker = queryByTestId(
        WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER,
      );

      expect(networkPicker).toBeNull();
    });
  });
});
