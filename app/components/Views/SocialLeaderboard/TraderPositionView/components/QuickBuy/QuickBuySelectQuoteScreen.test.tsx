import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import QuickBuySelectQuoteScreen from './QuickBuySelectQuoteScreen';
import { useQuickBuyContext } from './useQuickBuyContext';

jest.mock('./useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
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

jest.mock(
  '../../../../../UI/Bridge/components/QuoteSelectorView/QuoteRow',
  () => {
    const ReactMock = jest.requireActual('react');
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      QuoteRow: ({
        quoteRequestId,
        onPress,
        selected,
        receiveAmount,
      }: {
        quoteRequestId: string;
        onPress: (id: string) => void;
        selected: boolean;
        receiveAmount?: string;
      }) =>
        ReactMock.createElement(
          TouchableOpacity,
          {
            testID: `quote-row-${quoteRequestId}`,
            onPress: () => onPress(quoteRequestId),
          },
          ReactMock.createElement(
            Text,
            { testID: `quote-row-receive-${quoteRequestId}` },
            receiveAmount ?? 'no-receive',
          ),
          ReactMock.createElement(
            Text,
            null,
            selected ? 'selected' : 'unselected',
          ),
        ),
    };
  },
);

const makeQuote = (id: string) => ({
  quote: {
    requestId: id,
    bridges: ['lifi'],
    destTokenAmount: '1000000000000000000',
  },
  sentAmount: { valueInCurrency: '100' },
  totalNetworkFee: { valueInCurrency: '1.5' },
  includedTxFees: { valueInCurrency: '0' },
  gasFee: undefined,
});

const buildContext = (overrides = {}) => ({
  sortedQuotes: [],
  selectedQuoteRequestId: undefined,
  handleSelectQuote: jest.fn(),
  isQuoteLoading: false,
  destToken: undefined,
  currentCurrency: 'USD',
  onClose: jest.fn(),
  setActiveScreen: jest.fn(),
  ...overrides,
});

describe('QuickBuySelectQuoteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue(buildContext());
  });

  it('renders the select quote title in the sub-screen header', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ isQuoteLoading: true }),
    );
    render(<QuickBuySelectQuoteScreen />);
    expect(screen.getByTestId('mock-header-title')).toHaveTextContent(
      'social_leaderboard.quick_buy.select_quote_title',
    );
  });

  it('renders the subtitle text below the header', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ isQuoteLoading: true }),
    );
    render(<QuickBuySelectQuoteScreen />);
    expect(screen.getByText('bridge.select_quote_info')).toBeOnTheScreen();
  });

  it('shows an empty state when there are no quotes and not loading', () => {
    render(<QuickBuySelectQuoteScreen />);
    expect(screen.getByTestId('mock-header-title')).toHaveTextContent(
      'social_leaderboard.quick_buy.select_quote_title',
    );
    expect(
      screen.getByText('social_leaderboard.quick_buy.no_quotes'),
    ).toBeOnTheScreen();
  });

  it('allows navigation back from the empty state', () => {
    const setActiveScreen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ setActiveScreen }),
    );
    render(<QuickBuySelectQuoteScreen />);
    fireEvent.press(screen.getByTestId('mock-back-button'));
    expect(setActiveScreen).toHaveBeenCalledWith('quoteDetails');
  });

  it('does not show the empty state while loading', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ isQuoteLoading: true }),
    );
    render(<QuickBuySelectQuoteScreen />);
    expect(
      screen.queryByText('social_leaderboard.quick_buy.no_quotes'),
    ).not.toBeOnTheScreen();
  });

  it('renders a row for each available quote', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ sortedQuotes: [makeQuote('q1'), makeQuote('q2')] }),
    );
    render(<QuickBuySelectQuoteScreen />);
    expect(screen.getByTestId('quote-row-q1')).toBeOnTheScreen();
    expect(screen.getByTestId('quote-row-q2')).toBeOnTheScreen();
  });

  it('formats receive amount using destToken from context, not Redux', () => {
    const destToken = {
      symbol: 'USDC',
      decimals: 6,
      address: '0xusdc',
      chainId: '0x1',
    } as BridgeToken;
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        destToken,
        sortedQuotes: [
          {
            ...makeQuote('q1'),
            quote: {
              ...makeQuote('q1').quote,
              destTokenAmount: '1500000',
            },
          },
        ],
      }),
    );
    render(<QuickBuySelectQuoteScreen />);
    expect(screen.getByTestId('quote-row-receive-q1')).toHaveTextContent('1.5');
  });

  it('calls handleSelectQuote and navigates back when a quote is selected', () => {
    const handleSelectQuote = jest.fn();
    const setActiveScreen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        sortedQuotes: [makeQuote('q1')],
        handleSelectQuote,
        setActiveScreen,
      }),
    );
    render(<QuickBuySelectQuoteScreen />);
    fireEvent.press(screen.getByTestId('quote-row-q1'));
    expect(handleSelectQuote).toHaveBeenCalledWith('q1');
    expect(setActiveScreen).toHaveBeenCalledWith('quoteDetails');
  });

  it('calls setActiveScreen("quoteDetails") when back is pressed', () => {
    const setActiveScreen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ isQuoteLoading: true, setActiveScreen }),
    );
    render(<QuickBuySelectQuoteScreen />);
    fireEvent.press(screen.getByTestId('mock-back-button'));
    expect(setActiveScreen).toHaveBeenCalledWith('quoteDetails');
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ isQuoteLoading: true, onClose }),
    );
    render(<QuickBuySelectQuoteScreen />);
    fireEvent.press(screen.getByTestId('mock-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
