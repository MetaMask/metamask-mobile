import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TokenListFooter } from '.';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../../../locales/i18n';
import useRampNetwork from '../../../Ramp/hooks/useRampNetwork';
import { MetaMetricsEvents } from '../../../../../components/hooks/useMetrics';
import { TokenI } from '../../types';
import { mockNetworkState } from '../../../../../util/test/network';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('../../../Ramp/hooks/useRampNetwork', () => jest.fn());
jest.mock('../../../Ramp/routes/utils', () => ({
  createBuyNavigationDetails: jest.fn(() => ['BuyScreen']),
}));
jest.mock('../../../../../components/hooks/useMetrics', () => ({
  MetaMetricsEvents: { BUY_BUTTON_CLICKED: 'BUY_BUTTON_CLICKED' },
  useMetrics: jest.fn(() => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  })),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const mockStore = configureMockStore();
const MOCK_ADDRESS_1 = '0x0';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      TokensController: {
        tokens: [],
        detectedTokens: [],
      },
      NetworkController: {
        ...mockNetworkState({
          chainId: '0x1',
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
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
      PreferencesController: {
        preferences: {
          useTokenDetection: true,
        },
        tokenNetworkFilter: [
          {
            '0x1': true,
          },
        ],
      },
    },
  },
  settings: {
    primaryCurrency: 'usd',
  },
};

const store = mockStore(initialState);

describe('TokenListFooter', () => {
  const mockTokens = [
    {
      isETH: true,
      symbol: 'ETH',
      balance: '0',
    },
  ] as TokenI[];

  const mockProps = {
    tokens: mockTokens,
    goToAddToken: jest.fn(),
    showDetectedTokens: jest.fn(),
    isAddTokenEnabled: true,
  };

  beforeEach(() => {
    (useRampNetwork as jest.Mock).mockReturnValue([true, true]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = mockProps) =>
    render(
      <Provider store={store}>
        <TokenListFooter {...props} />
      </Provider>,
    );

  it('renders correctly', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the buy button for a native token with zero balance', () => {
    const { getByText } = renderComponent();

    expect(
      getByText(
        strings('wallet.token_is_needed_to_continue', { tokenSymbol: 'ETH' }),
      ),
    ).toBeDefined();
    expect(getByText(strings('wallet.next'))).toBeDefined();
  });

  it('tracks the BUY_BUTTON_CLICKED event when the buy button is pressed', async () => {
    const { getByText } = renderComponent();

    fireEvent.press(getByText(strings('wallet.next')));

    await waitFor(() => {
      expect(MetaMetricsEvents.BUY_BUTTON_CLICKED).toBeDefined();
    });
  });

  it('renders the add tokens footer link and calls goToAddToken when pressed', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.IMPORT_TOKEN_FOOTER_LINK),
    );

    expect(mockProps.goToAddToken).toHaveBeenCalledTimes(1);
  });

  it('disables the add tokens footer link when isAddTokenEnabled is false', () => {
    const { getByTestId } = renderComponent({
      ...mockProps,
      isAddTokenEnabled: false,
    });

    expect(
      getByTestId(WalletViewSelectorsIDs.IMPORT_TOKEN_FOOTER_LINK).props
        .disabled,
    ).toBe(true);
  });
});
