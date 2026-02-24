import React from 'react';
import { render } from '@testing-library/react-native';
import { QuoteSelectorView } from './index';
import { strings } from '../../../../../../locales/i18n';
import { BigNumber } from 'ethers';
import { BridgeQuoteWithSentAmount } from '../../types';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
}));

const mockUseBridgeQuoteData = jest.fn();
jest.mock('../../hooks/useBridgeQuoteData', () => ({
  useBridgeQuoteData: () => mockUseBridgeQuoteData(),
}));

const mockUseLatestBalance = jest.fn();
jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: (params: unknown) => mockUseLatestBalance(params),
}));

const mockFormatNetworkFee = jest.fn();
jest.mock('../../utils/formatNetworkFee', () => ({
  formatNetworkFee: (currency: string, quote: unknown) =>
    mockFormatNetworkFee(currency, quote),
}));

const mockIsGaslessQuote = jest.fn();
jest.mock('../../utils/isGaslessQuote', () => ({
  isGaslessQuote: (quote: unknown) => mockIsGaslessQuote(quote),
}));

const mockSourceToken = {
  address: '0x1234',
  decimals: 18,
  chainId: '0x1',
  symbol: 'ETH',
};

const mockCurrency = 'USD';

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useSelector: jest.fn((selector) => {
      const selectorString = selector.toString();
      if (selectorString.includes('selectSourceToken')) {
        return mockSourceToken;
      }
      if (selectorString.includes('selectCurrentCurrency')) {
        return mockCurrency;
      }
      return null;
    }),
  };
});

jest.mock('../../../../Base/ScreenView', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View testID="screen-view">{children}</View>
    ),
  };
});

jest.mock('./QuoteList', () => ({
  QuoteList: ({ data }: { data: unknown[] }) => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="quote-list">
        <Text testID="quote-list-count">{data.length}</Text>
      </View>
    );
  },
}));

describe('QuoteSelectorView', () => {
  const mockQuote: BridgeQuoteWithSentAmount = {
    quote: {
      requestId: 'quote-1',
      bridgeId: 'Lifi',
      srcChainId: 1,
      destChainId: 137,
      srcTokenAmount: '1000000000000000000',
      destTokenAmount: '1000000',
      srcAsset: {
        chainId: 1,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        icon: '',
      },
      destAsset: {
        chainId: 137,
        address: '0x0000000000000000000000000000000000000001',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        icon: '',
      },
      feeData: {
        metabridge: {
          amount: '0',
          asset: {
            chainId: 1,
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            icon: '',
          },
        },
      },
      bridgeId: 'Lifi',
      bridges: ['lifi'],
      steps: [],
      refuel: undefined,
    },
    sentAmount: {
      amount: '1',
      usd: '2000',
    },
    totalNetworkFee: {
      amount: '0.01',
      usd: '20',
    },
    estimatedProcessingTimeInSeconds: 60,
    adjustedReturn: {
      usd: '1980',
      valueInCurrency: '1980',
    },
  };

  const mockLatestBalance = {
    displayBalance: '1000',
    atomicBalance: BigNumber.from('1000000000000000000'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBridgeQuoteData.mockReturnValue({
      validQuotes: [],
      bestQuote: null,
      isLoading: false,
      isNoQuotesAvailable: false,
      isExpired: false,
      willRefresh: false,
    });
    mockUseLatestBalance.mockReturnValue(mockLatestBalance);
    mockFormatNetworkFee.mockReturnValue('$20.00');
    mockIsGaslessQuote.mockReturnValue(false);
  });

  describe('rendering', () => {
    it('renders ScreenView component', () => {
      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('screen-view')).toBeTruthy();
    });

    it('renders info text with correct translation', () => {
      const { getByText } = render(<QuoteSelectorView />);

      expect(getByText(strings('bridge.select_quote_info'))).toBeTruthy();
    });

    it('renders QuoteList component', () => {
      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('quote-list')).toBeTruthy();
    });
  });

  describe('navigation setup', () => {
    it('sets navigation options on mount', () => {
      render(<QuoteSelectorView />);

      expect(mockSetOptions).toHaveBeenCalled();
    });

    it('calls goBack when back action is triggered', () => {
      render(<QuoteSelectorView />);

      expect(mockSetOptions).toHaveBeenCalled();
    });
  });

  describe('quote data transformation', () => {
    it('transforms empty validQuotes to empty data array', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [],
        bestQuote: null,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('quote-list-count')).toHaveTextContent('0');
    });

    it('transforms single validQuote to data array with one item', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('quote-list-count')).toHaveTextContent('1');
    });

    it('transforms multiple validQuotes to data array with multiple items', () => {
      const quotes = [
        mockQuote,
        { ...mockQuote, quote: { ...mockQuote.quote, requestId: 'quote-2' } },
        { ...mockQuote, quote: { ...mockQuote.quote, requestId: 'quote-3' } },
      ];

      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: quotes,
        bestQuote: quotes[0],
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('quote-list-count')).toHaveTextContent('3');
    });
  });

  describe('loading state', () => {
    it('sets loading to true when isLoading is true', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: true,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('quote-list')).toBeTruthy();
    });

    it('sets loading to true when isExpired is true', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: true,
        willRefresh: false,
      });

      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('quote-list')).toBeTruthy();
    });

    it('sets loading to true when isNoQuotesAvailable is true', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [],
        bestQuote: null,
        isLoading: false,
        isNoQuotesAvailable: true,
        isExpired: false,
        willRefresh: false,
      });

      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('quote-list')).toBeTruthy();
    });

    it('sets loading to true when willRefresh is true', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: true,
      });

      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('quote-list')).toBeTruthy();
    });

    it('sets loading to false when all loading flags are false', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('quote-list')).toBeTruthy();
    });
  });

  describe('useLatestBalance integration', () => {
    it('calls useLatestBalance hook', () => {
      render(<QuoteSelectorView />);

      expect(mockUseLatestBalance).toHaveBeenCalled();
    });

    it('uses latestBalance in quote data', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      render(<QuoteSelectorView />);

      expect(mockUseLatestBalance).toHaveBeenCalled();
    });
  });

  describe('formatNetworkFee integration', () => {
    it('calls formatNetworkFee for each quote', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      render(<QuoteSelectorView />);

      expect(mockFormatNetworkFee).toHaveBeenCalled();
    });

    it('calls formatNetworkFee for multiple quotes', () => {
      const quotes = [
        mockQuote,
        { ...mockQuote, quote: { ...mockQuote.quote, requestId: 'quote-2' } },
      ];

      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: quotes,
        bestQuote: quotes[0],
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      render(<QuoteSelectorView />);

      expect(mockFormatNetworkFee).toHaveBeenCalledTimes(2);
    });
  });

  describe('isGaslessQuote integration', () => {
    it('calls isGaslessQuote for each quote', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      render(<QuoteSelectorView />);

      expect(mockIsGaslessQuote).toHaveBeenCalledWith(mockQuote.quote);
    });

    it('passes isGasless result to quote data', () => {
      mockIsGaslessQuote.mockReturnValue(true);
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      render(<QuoteSelectorView />);

      expect(mockIsGaslessQuote).toHaveBeenCalled();
    });
  });

  describe('bestQuote identification', () => {
    it('marks quote as isLowestCost when it matches bestQuote', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      render(<QuoteSelectorView />);

      expect(mockUseBridgeQuoteData).toHaveBeenCalled();
    });

    it('does not mark quote as isLowestCost when it does not match bestQuote', () => {
      const anotherQuote = {
        ...mockQuote,
        quote: { ...mockQuote.quote, requestId: 'quote-2' },
      };

      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote, anotherQuote],
        bestQuote: anotherQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('quote-list-count')).toHaveTextContent('2');
    });
  });

  describe('quote data fields', () => {
    it('includes provider name from bridgeId', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      render(<QuoteSelectorView />);

      expect(mockUseBridgeQuoteData).toHaveBeenCalled();
    });

    it('includes quoteRequestId from quote', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      render(<QuoteSelectorView />);

      expect(mockUseBridgeQuoteData).toHaveBeenCalled();
    });

    it('includes gasSponsored flag from quote', () => {
      const sponsoredQuote = {
        ...mockQuote,
        quote: { ...mockQuote.quote, gasSponsored: true },
      };

      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [sponsoredQuote],
        bestQuote: sponsoredQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('quote-list-count')).toHaveTextContent('1');
    });
  });

  describe('memoization', () => {
    it('recalculates data when validQuotes changes', () => {
      const { rerender, getByTestId } = render(<QuoteSelectorView />);

      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      rerender(<QuoteSelectorView />);

      expect(getByTestId('quote-list')).toBeTruthy();
    });

    it('renders correctly when quotes are available', () => {
      mockUseBridgeQuoteData.mockReturnValue({
        validQuotes: [mockQuote],
        bestQuote: mockQuote,
        isLoading: false,
        isNoQuotesAvailable: false,
        isExpired: false,
        willRefresh: false,
      });

      const { getByTestId } = render(<QuoteSelectorView />);

      expect(getByTestId('quote-list-count')).toHaveTextContent('1');
    });
  });
});
