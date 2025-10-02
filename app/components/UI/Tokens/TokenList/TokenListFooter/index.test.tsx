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
import { useSelectedAccountMultichainBalances } from '../../../../hooks/useMultichainBalances';

jest.mock('../../../Ramp/Aggregator/hooks/useRampNetwork', () => jest.fn());
jest.mock('../../../../hooks/useMultichainBalances', () => ({
  useSelectedAccountMultichainBalances: jest.fn(),
}));
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setPrivacyMode: jest.fn(),
    },
  },
  getTotalEvmFiatAccountBalance: jest.fn(() => ({
    ethFiat: 0,
    tokenFiat: 0,
    tokenFiat1dAgo: 0,
    ethFiat1dAgo: 0,
    totalNativeTokenBalance: '0',
    ticker: 'ETH',
  })),
}));
jest.mock('../../../../../components/hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    CARD_ADD_FUNDS_DEPOSIT_CLICKED: 'CARD_ADD_FUNDS_DEPOSIT_CLICKED',
    RAMPS_BUTTON_CLICKED: 'RAMPS_BUTTON_CLICKED',
  },
  useMetrics: jest.fn(() => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  })),
}));

jest.mock('../../../../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: {
    LoadDepositExperience: 'Load Deposit Experience',
  },
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

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: '0x1',
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
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
    (useSelectedAccountMultichainBalances as jest.Mock).mockReturnValue({
      selectedAccountMultichainBalance: {
        totalFiatBalance: 0,
      },
    });
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

  it('does not render the deposit button when total account balance is greater than zero', () => {
    (useSelectedAccountMultichainBalances as jest.Mock).mockReturnValue({
      selectedAccountMultichainBalance: {
        totalFiatBalance: 100,
      },
    });
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  it('tracks the CARD_ADD_FUNDS_DEPOSIT_CLICKED and RAMPS_BUTTON_CLICKED events when the deposit button is pressed', async () => {
    const { getByText } = renderComponent();

    fireEvent.press(getByText(strings('wallet.add_funds')));

    await waitFor(() => {
      expect(MetaMetricsEvents.CARD_ADD_FUNDS_DEPOSIT_CLICKED).toBeDefined();
      expect(MetaMetricsEvents.RAMPS_BUTTON_CLICKED).toBeDefined();
    });
  });
});
