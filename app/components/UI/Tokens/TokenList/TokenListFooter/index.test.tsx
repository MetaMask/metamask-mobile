import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TokenListFooter } from '.';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import useRampNetwork from '../../../Ramp/Aggregator/hooks/useRampNetwork';
import { MetaMetricsEvents } from '../../../../../components/hooks/useMetrics';
import { mockNetworkState } from '../../../../../util/test/network';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('../../../Ramp/Aggregator/hooks/useRampNetwork', () => jest.fn());
jest.mock('../../../Ramp/Aggregator/routes/utils', () => ({
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
        ...backgroundState.TokensController,
        tokens: [],
        detectedTokens: [],
        allTokens: {
          '0x1': {
            [MOCK_ADDRESS_1]: [
              {
                symbol: 'ETH',
                address: '0x00',
                decimals: 18,
                isETH: true,
                balance: '0',
              },
              {
                symbol: 'BAT',
                address: '0x01',
                decimals: 18,
                isETH: false,
                balance: '0',
              },
              {
                symbol: 'LINK',
                address: '0x02',
                decimals: 18,
                isETH: false,
                balance: '0',
              },
            ],
          },
        },
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
  beforeEach(() => {
    (useRampNetwork as jest.Mock).mockReturnValue([true, true]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (initialStore = store) =>
    render(
      <Provider store={initialStore}>
        <TokenListFooter />
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
        strings('wallet.token_is_needed_to_continue', {
          tokenSymbol: 'Ethereum',
        }),
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
});
