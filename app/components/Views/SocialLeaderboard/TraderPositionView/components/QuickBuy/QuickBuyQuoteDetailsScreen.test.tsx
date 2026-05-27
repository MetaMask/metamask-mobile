import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuyQuoteDetailsScreen from './QuickBuyQuoteDetailsScreen';
import { useQuickBuyContext } from './useQuickBuyContext';

jest.mock('./useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('./components/QuickBuySubScreenHeader', () => {
  const ReactMock = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      onBack,
      onClose,
    }: {
      title: string;
      onBack: () => void;
      onClose: () => void;
    }) =>
      ReactMock.createElement(
        ReactMock.Fragment,
        null,
        ReactMock.createElement(Text, { testID: 'mock-header-title' }, title),
        ReactMock.createElement(
          TouchableOpacity,
          { testID: 'mock-back-button', onPress: onBack },
          null,
        ),
        ReactMock.createElement(
          TouchableOpacity,
          { testID: 'mock-close-button', onPress: onClose },
          null,
        ),
      ),
  };
});

jest.mock('./components/QuickBuyQuoteCountdown', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(Text, { testID: 'mock-countdown' }, 'countdown'),
  };
});

jest.mock(
  '../../../../../../component-library/components-temp/KeyValueRow',
  () => {
    const ReactMock = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ field }: { field: { label: { text?: string } } }) =>
        ReactMock.createElement(
          View,
          { testID: `key-value-row-${field.label.text}` },
          null,
        ),
    };
  },
);

const buildContext = (overrides = {}) => ({
  activeQuote: undefined,
  sourceToken: undefined,
  destToken: undefined,
  formattedNetworkFee: '$1.23',
  formattedSlippage: '0.5%',
  formattedMinimumReceived: '0.99 ETH',
  formattedMinimumReceivedFiat: '$3,200',
  formattedRate: '1 USDC = 0.0003 ETH',
  quotesLastFetchedAt: Date.now(),
  refreshCount: 0,
  quoteRefreshRateMs: 30000,
  maxRefreshCount: 5,
  refetchQuotes: jest.fn(),
  onClose: jest.fn(),
  setActiveScreen: jest.fn(),
  ...overrides,
});

describe('QuickBuyQuoteDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue(buildContext());
  });

  it('renders the quote details title in the sub-screen header', () => {
    render(<QuickBuyQuoteDetailsScreen />);
    expect(screen.getByTestId('mock-header-title')).toHaveTextContent(
      'social_leaderboard.quick_buy.quote_details_title',
    );
  });

  it('renders the countdown timer when refresh is not exhausted', () => {
    render(<QuickBuyQuoteDetailsScreen />);
    expect(screen.getByTestId('mock-countdown')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('quick-buy-get-new-quote'),
    ).not.toBeOnTheScreen();
  });

  it('renders "Get new quote" button when refresh is exhausted', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ refreshCount: 5, maxRefreshCount: 5 }),
    );
    render(<QuickBuyQuoteDetailsScreen />);
    expect(screen.getByTestId('quick-buy-get-new-quote')).toBeOnTheScreen();
    expect(screen.queryByTestId('mock-countdown')).not.toBeOnTheScreen();
  });

  it('calls refetchQuotes when "Get new quote" is pressed', () => {
    const refetchQuotes = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ refreshCount: 5, maxRefreshCount: 5, refetchQuotes }),
    );
    render(<QuickBuyQuoteDetailsScreen />);
    fireEvent.press(screen.getByTestId('quick-buy-get-new-quote'));
    expect(refetchQuotes).toHaveBeenCalledTimes(1);
  });

  it('calls setActiveScreen("selectQuote") when the rate row is pressed', () => {
    const setActiveScreen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ setActiveScreen }),
    );
    render(<QuickBuyQuoteDetailsScreen />);
    fireEvent.press(screen.getByTestId('quick-buy-rate-row'));
    expect(setActiveScreen).toHaveBeenCalledWith('selectQuote');
  });

  it('navigates to slippage modal when edit slippage is pressed', () => {
    render(<QuickBuyQuoteDetailsScreen />);
    fireEvent.press(screen.getByTestId('quick-buy-edit-slippage'));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('calls setActiveScreen("amount") when back is pressed', () => {
    const setActiveScreen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ setActiveScreen }),
    );
    render(<QuickBuyQuoteDetailsScreen />);
    fireEvent.press(screen.getByTestId('mock-back-button'));
    expect(setActiveScreen).toHaveBeenCalledWith('amount');
  });

  it('calls onClose when close is pressed', () => {
    const onClose = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ onClose }),
    );
    render(<QuickBuyQuoteDetailsScreen />);
    fireEvent.press(screen.getByTestId('mock-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the bridge provider id when available', () => {
    const activeQuote = { quote: { bridgeId: 'lifi' } };
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ activeQuote }),
    );
    render(<QuickBuyQuoteDetailsScreen />);
    expect(screen.getByText('lifi')).toBeOnTheScreen();
  });
});
