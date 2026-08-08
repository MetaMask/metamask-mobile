import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
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

// Render children as ReactNodes so testIDs inside them are accessible.
jest.mock(
  '../../../../../../component-library/components-temp/KeyValueRow',
  () => {
    const ReactMock = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const passThrough = ({ children }: { children?: React.ReactNode }) =>
      ReactMock.createElement(View, null, children);
    const Label = ({ label }: { label: unknown }) =>
      ReactMock.isValidElement(label)
        ? label
        : ReactMock.createElement(View, null);
    return {
      __esModule: true,
      KeyValueRowStubs: { Root: passThrough, Section: passThrough, Label },
      TooltipSizes: { Sm: 'sm' },
      KeyValueRowSectionAlignments: { RIGHT: 'right' },
    };
  },
);

jest.mock('../../../../../../component-library/components/Icons/Icon', () => ({
  IconName: { Info: 'Info' },
}));

const buildContext = (overrides = {}) => ({
  sourceToken: undefined,
  destToken: undefined,
  activeQuote: { quote: {} },
  hasValidAmount: true,
  formattedNetworkFee: '$1.23',
  formattedSlippage: '0.5%',
  formattedMinimumReceived: '0.99 ETH',
  formattedMinimumReceivedFiat: '$3,200',
  formattedRate: '1 USDC = 0.0003 ETH',
  formattedPriceImpact: '-',
  isPriceImpactError: false,
  quotesLastFetchedAt: Date.now(),
  quoteRefreshRateMs: 30000,
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

  it('always renders the countdown timer inline with the rate row', () => {
    render(<QuickBuyQuoteDetailsScreen />);
    expect(screen.getByTestId('mock-countdown')).toBeOnTheScreen();
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

  it('navigates to slippage modal with token chainIds (including CAIP)', () => {
    const sourceChainId = '0x1' as const;
    const destChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        sourceToken: { chainId: sourceChainId },
        destToken: { chainId: destChainId },
      }),
    );
    render(<QuickBuyQuoteDetailsScreen />);
    fireEvent.press(screen.getByTestId('quick-buy-edit-slippage'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: { sourceChainId, destChainId },
    });
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

  it('does not show a "Get new quote" button', () => {
    render(<QuickBuyQuoteDetailsScreen />);
    expect(
      screen.queryByTestId('quick-buy-get-new-quote'),
    ).not.toBeOnTheScreen();
  });

  it('does not render the price impact row when isPriceImpactError is false', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ isPriceImpactError: false }),
    );
    render(<QuickBuyQuoteDetailsScreen />);
    expect(
      screen.queryByText('bridge.price_impact_info_title'),
    ).not.toBeOnTheScreen();
  });

  it('renders the price impact row with formatted value when isPriceImpactError is true', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({
        isPriceImpactError: true,
        formattedPriceImpact: '25.00%',
      }),
    );
    render(<QuickBuyQuoteDetailsScreen />);
    expect(
      screen.getByText('bridge.price_impact_info_title'),
    ).toBeOnTheScreen();
    expect(screen.getByText('25.00%')).toBeOnTheScreen();
  });

  it('shows the "enter an amount" empty state when there is no quote and no committed amount', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ activeQuote: undefined, hasValidAmount: false }),
    );
    render(<QuickBuyQuoteDetailsScreen />);
    expect(
      screen.getByText(
        'social_leaderboard.quick_buy.quote_details_empty_no_amount',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('quick-buy-rate-row')).not.toBeOnTheScreen();
  });

  it('shows the "no quote" empty state when an amount is entered but no quote resolves', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ activeQuote: undefined, hasValidAmount: true }),
    );
    render(<QuickBuyQuoteDetailsScreen />);
    expect(
      screen.getByText(
        'social_leaderboard.quick_buy.quote_details_empty_no_quote',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('quick-buy-rate-row')).not.toBeOnTheScreen();
  });
});
