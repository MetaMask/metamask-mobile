import { renderHook } from '@testing-library/react-native';
import { useTrackAllQuotesSortedEvent } from './index';
import Engine from '../../../../../core/Engine';
import {
  SortOrder,
  UnifiedSwapBridgeEventName,
  type Quote,
} from '@metamask/bridge-controller';
import { BigNumber } from 'ethers';
import { useSelector } from 'react-redux';
import {
  selectSourceAmount,
  selectSourceToken,
  selectDestToken,
  selectIsBridge,
} from '../../../../../core/redux/slices/bridge';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';

// Mock Engine
jest.mock('../../../../../core/Engine', () => ({
  context: {
    BridgeController: {
      trackUnifiedSwapBridgeEvent: jest.fn(),
    },
  },
}));

// Mock useLatestBalance
const mockUseLatestBalance = jest.fn();
jest.mock('../useLatestBalance', () => ({
  useLatestBalance: (params: unknown) => mockUseLatestBalance(params),
}));

// Mock useIsInsufficientBalance
const mockUseIsInsufficientBalance = jest.fn();
jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: (params: unknown) => mockUseIsInsufficientBalance(params),
}));

// Mock Redux selectors - use a mutable object so we can change values in tests
const mockSelectorValues = {
  sourceToken: {
    symbol: 'ETH',
    chainId: '0x1',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
  },
  destToken: {
    symbol: 'USDC',
    chainId: '0x89',
    address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    decimals: 6,
  },
  sourceAmount: '1.5',
  smartTransactionsEnabled: true,
  isBridge: true,
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;

// Mock getNativeAssetForChainId
jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  getNativeAssetForChainId: jest.fn((chainId: string) => ({
    symbol: chainId === '0x1' ? 'ETH' : 'MATIC',
  })),
  formatProviderLabel: jest.fn((quote: Quote) => quote.bridges[0]),
}));

describe('useTrackAllQuotesSortedEvent', () => {
  const mockQuote = {
    requestId: 'test-request-id',
    srcChainId: 1,
    destChainId: 137,
    srcTokenAmount: '1500000000000000000',
    destTokenAmount: '3000000000',
    minDestTokenAmount: '2900000000',
    bridgeId: 'lifi',
    srcAsset: {
      chainId: 1,
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      icon: '',
      assetId: 'eip155:1/slip44:60' as const,
    },
    destAsset: {
      chainId: 137,
      address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '',
      assetId:
        'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174' as const,
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
          assetId: 'eip155:1/slip44:60' as const,
        },
      },
    },
    bridges: ['lifi'],
    steps: [],
    priceData: {
      priceImpact: '0.05',
    },
    gasIncluded: false,
  } as unknown as Quote;

  const mockLatestBalance = {
    displayBalance: '10',
    atomicBalance: BigNumber.from('10000000000000000000'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsInsufficientBalance.mockReturnValue(false);
    (
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
    ).mockClear();

    // Reset mock values to defaults
    mockSelectorValues.sourceToken = {
      symbol: 'ETH',
      chainId: '0x1',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
    };
    mockSelectorValues.destToken = {
      symbol: 'USDC',
      chainId: '0x89',
      address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      decimals: 6,
    };
    mockSelectorValues.sourceAmount = '1.5';
    mockSelectorValues.smartTransactionsEnabled = true;
    mockSelectorValues.isBridge = true;

    // Setup useSelector mock to read from mockSelectorValues
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSourceAmount) {
        return mockSelectorValues.sourceAmount;
      }
      if (selector === selectSourceToken) {
        return mockSelectorValues.sourceToken;
      }
      if (selector === selectDestToken) {
        return mockSelectorValues.destToken;
      }
      if (selector === selectShouldUseSmartTransaction) {
        return mockSelectorValues.smartTransactionsEnabled;
      }
      if (selector === selectIsBridge) {
        return mockSelectorValues.isBridge;
      }
      return null;
    });
  });

  describe('return value', () => {
    it('returns a function', () => {
      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      expect(typeof result.current).toBe('function');
    });
  });

  describe('event tracking for bridge transactions', () => {
    it('calls trackUnifiedSwapBridgeEvent with correct parameters for bridge', () => {
      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(mockQuote);

      expect(
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent,
      ).toHaveBeenCalledWith(UnifiedSwapBridgeEventName.AllQuotesSorted, {
        can_submit: true,
        price_impact: 0.05,
        gas_included: false,
        gas_included_7702: false,
        token_symbol_source: 'ETH',
        token_symbol_destination: 'USDC',
        stx_enabled: true,
        sort_order: SortOrder.COST_ASC,
        best_quote_provider: 'lifi',
      });
    });

    it('includes sort_order and best_quote_provider for bridge transactions', () => {
      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(mockQuote);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData).toHaveProperty('sort_order', SortOrder.COST_ASC);
      expect(eventData).toHaveProperty('best_quote_provider', 'lifi');
    });
  });

  describe('event tracking for swap transactions', () => {
    it('excludes sort_order and best_quote_provider for swap transactions', () => {
      mockSelectorValues.isBridge = false; // Swap transaction

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(mockQuote);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData).not.toHaveProperty('sort_order');
      expect(eventData).not.toHaveProperty('best_quote_provider');
    });
  });

  describe('insufficient balance handling', () => {
    it('sets can_submit to false when balance is insufficient', () => {
      mockUseIsInsufficientBalance.mockReturnValue(true);

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(mockQuote);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.can_submit).toBe(false);
    });

    it('sets can_submit to true when balance is sufficient', () => {
      mockUseIsInsufficientBalance.mockReturnValue(false);

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(mockQuote);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.can_submit).toBe(true);
    });
  });

  describe('quote data handling', () => {
    it('handles missing priceData gracefully', () => {
      const quoteWithoutPriceData = {
        ...mockQuote,
        priceData: undefined,
      } as Quote;

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(quoteWithoutPriceData);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.price_impact).toBe(0);
    });

    it('handles missing priceImpact in priceData', () => {
      const quoteWithoutPriceImpact = {
        ...mockQuote,
        priceData: {},
      } as Quote;

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(quoteWithoutPriceImpact);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.price_impact).toBe(0);
    });

    it('converts priceImpact string to number', () => {
      const quoteWithStringPriceImpact = {
        ...mockQuote,
        priceData: {
          priceImpact: '0.123',
        },
      } as Quote;

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(quoteWithStringPriceImpact);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.price_impact).toBe(0.123);
    });
  });

  describe('gas included handling', () => {
    it('sets gas_included to true when quote has gasIncluded', () => {
      const quoteWithGasIncluded = {
        ...mockQuote,
        gasIncluded: true,
      } as Quote;

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(quoteWithGasIncluded);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.gas_included).toBe(true);
    });

    it('sets gas_included_7702 to true when quote has gasIncluded7702', () => {
      const quoteWithGasIncluded7702 = {
        ...mockQuote,
        gasIncluded7702: true,
      } as unknown as Quote;

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(quoteWithGasIncluded7702);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.gas_included_7702).toBe(true);
    });
  });

  describe('token symbol handling', () => {
    it('uses sourceToken symbol when available', () => {
      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(mockQuote);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.token_symbol_source).toBe('ETH');
    });

    it('falls back to native asset symbol when sourceToken has no symbol', () => {
      mockSelectorValues.sourceToken = {
        ...mockSelectorValues.sourceToken,
        symbol: undefined as unknown as string,
      };

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(mockQuote);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.token_symbol_source).toBe('ETH');
    });

    it('uses space string when sourceToken is undefined', () => {
      mockSelectorValues.sourceToken =
        undefined as unknown as typeof mockSelectorValues.sourceToken;

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(mockQuote);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.token_symbol_source).toBe(' ');
    });

    it('uses destToken symbol when available', () => {
      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(mockQuote);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.token_symbol_destination).toBe('USDC');
    });

    it('uses null when destToken is undefined', () => {
      mockSelectorValues.destToken =
        undefined as unknown as typeof mockSelectorValues.destToken;

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(mockQuote);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.token_symbol_destination).toBe(null);
    });
  });

  describe('smart transactions handling', () => {
    it('sets stx_enabled to true when smart transactions are enabled', () => {
      mockSelectorValues.smartTransactionsEnabled = true;

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(mockQuote);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.stx_enabled).toBe(true);
    });

    it('sets stx_enabled to false when smart transactions are disabled', () => {
      mockSelectorValues.smartTransactionsEnabled = false;

      const { result } = renderHook(() =>
        useTrackAllQuotesSortedEvent(mockLatestBalance),
      );

      result.current(mockQuote);

      const eventData = (
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent as jest.Mock
      ).mock.calls[0][1];

      expect(eventData.stx_enabled).toBe(false);
    });
  });

  describe('latestSourceBalance parameter', () => {
    it('passes latestSourceBalance to useIsInsufficientBalance', () => {
      renderHook(() => useTrackAllQuotesSortedEvent(mockLatestBalance));

      expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
        amount: mockSelectorValues.sourceAmount,
        token: mockSelectorValues.sourceToken,
        latestAtomicBalance: mockLatestBalance.atomicBalance,
      });
    });

    it('handles undefined latestSourceBalance', () => {
      renderHook(() => useTrackAllQuotesSortedEvent(undefined));

      expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
        amount: mockSelectorValues.sourceAmount,
        token: mockSelectorValues.sourceToken,
        latestAtomicBalance: undefined,
      });
    });
  });
});
