import { renderHook } from '@testing-library/react-native';
import { CaipAssetType, Hex } from '@metamask/utils';

import { BridgeToken } from '../../types';
import { useBatchSellQuoteData } from '.';

jest.mock('../useBatchSellQuoteRequest', () => ({
  getBatchSellAtomicSourceAmount: jest.fn(
    (_token: BridgeToken, sourceAmount?: string) =>
      sourceAmount && Number(sourceAmount) > 0 ? '1' : undefined,
  ),
}));

const ethAssetId =
  'eip155:1/erc20:0x1111111111111111111111111111111111111111' as CaipAssetType;
const uniAssetId =
  'eip155:1/erc20:0x2222222222222222222222222222222222222222' as CaipAssetType;

const ethToken: BridgeToken = {
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'ETH',
  balance: '1',
};

const uniToken: BridgeToken = {
  address: '0x2222222222222222222222222222222222222222',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'UNI',
  balance: '2',
};

const usdcToken: BridgeToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
};

let mockSelectedTokens: BridgeToken[] = [ethToken, uniToken];
let mockBatchSellSourceTokenAmounts: Partial<
  Record<CaipAssetType, string | undefined>
> = {
  [ethAssetId]: '1',
  [uniAssetId]: '2',
};
let mockBatchSellQuotes: {
  recommendedQuotes: ({
    quote: { srcAsset: { address: string }; srcChainId: number };
    toTokenAmount: { amount: string; valueInCurrency: string | null };
  } | null)[];
  totalReceived: { amount: string; valueInCurrency: string | null };
  minimumReceived: { amount: string; valueInCurrency: string | null };
  totalNetworkFee: { amount: string; valueInCurrency: string };
  isLoading: boolean;
  quotesLastFetchedMs?: number;
} = {
  recommendedQuotes: [
    {
      quote: { srcAsset: { address: ethToken.address }, srcChainId: 1 },
      toTokenAmount: { amount: '123', valueInCurrency: '123.45' },
    },
    {
      quote: { srcAsset: { address: uniToken.address }, srcChainId: 1 },
      toTokenAmount: { amount: '77', valueInCurrency: '77.89' },
    },
  ],
  totalReceived: { amount: '200', valueInCurrency: '201.34' },
  minimumReceived: { amount: '190', valueInCurrency: '191.23' },
  totalNetworkFee: { amount: '1.2', valueInCurrency: '1.25' },
  isLoading: false,
};

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectBatchSellDestToken: jest.fn(() => usdcToken),
  selectBatchSellQuotes: jest.fn(() => mockBatchSellQuotes),
  selectBatchSellSlippages: jest.fn(() => ({})),
  selectBatchSellSourceTokenAmounts: jest.fn(
    () => mockBatchSellSourceTokenAmounts,
  ),
  selectBatchSellSourceTokens: jest.fn(() => mockSelectedTokens),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

describe('useBatchSellQuoteData', () => {
  beforeEach(() => {
    mockSelectedTokens = [ethToken, uniToken];
    mockBatchSellSourceTokenAmounts = {
      [ethAssetId]: '1',
      [uniAssetId]: '2',
    };
    mockBatchSellQuotes = {
      recommendedQuotes: [
        {
          quote: { srcAsset: { address: ethToken.address }, srcChainId: 1 },
          toTokenAmount: { amount: '123', valueInCurrency: '123.45' },
        },
        {
          quote: { srcAsset: { address: uniToken.address }, srcChainId: 1 },
          toTokenAmount: { amount: '77', valueInCurrency: '77.89' },
        },
      ],
      totalReceived: { amount: '200', valueInCurrency: '201.34' },
      minimumReceived: { amount: '190', valueInCurrency: '191.23' },
      totalNetworkFee: { amount: '1.2', valueInCurrency: '1.25' },
      isLoading: false,
    };
  });

  it('formats complete Batch Sell quote data', () => {
    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.hasCompleteQuoteSet).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.totalReceived).toBe('200 USDC');
    expect(result.current.totalReceivedFiat).toBe('$201.34');
    expect(result.current.minimumReceived).toBe('190 USDC');
    expect(result.current.networkFee).toBe('1.2 USDC');
    expect(result.current.networkFeeFiat).toBe('$1.25');
    expect(result.current.tokenData).toEqual({
      [ethAssetId]: expect.objectContaining({
        key: ethAssetId,
        tokenSymbol: 'ETH',
        receivedAmount: '123 USDC',
        receivedAmountFiat: '$123.45',
        isLoading: false,
        isQuoteUnavailable: false,
      }),
      [uniAssetId]: expect.objectContaining({
        key: uniAssetId,
        tokenSymbol: 'UNI',
        receivedAmount: '77 USDC',
        receivedAmountFiat: '$77.89',
        isLoading: false,
        isQuoteUnavailable: false,
      }),
    });
  });

  it('matches recommended quotes by source asset id instead of array index', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        {
          quote: { srcAsset: { address: uniToken.address }, srcChainId: 1 },
          toTokenAmount: { amount: '77', valueInCurrency: '77.89' },
        },
        {
          quote: { srcAsset: { address: ethToken.address }, srcChainId: 1 },
          toTokenAmount: { amount: '123', valueInCurrency: '123.45' },
        },
      ],
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.tokenData[ethAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'ETH',
        receivedAmount: '123 USDC',
        receivedAmountFiat: '$123.45',
      }),
    );
    expect(result.current.tokenData[uniAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'UNI',
        receivedAmount: '77 USDC',
        receivedAmountFiat: '$77.89',
      }),
    );
  });

  it('marks rows without recommended quotes as unavailable after loading', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        {
          quote: { srcAsset: { address: ethToken.address }, srcChainId: 1 },
          toTokenAmount: { amount: '123', valueInCurrency: '123.45' },
        },
        null,
      ],
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.hasCompleteQuoteSet).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.tokenData[uniAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'UNI',
        receivedAmount: '-- USDC',
        isLoading: false,
        isQuoteUnavailable: true,
      }),
    );
  });

  it('keeps missing quote rows loading while quotes are loading', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      isLoading: true,
      recommendedQuotes: [
        {
          quote: { srcAsset: { address: ethToken.address }, srcChainId: 1 },
          toTokenAmount: { amount: '123', valueInCurrency: '123.45' },
        },
        null,
      ],
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.hasCompleteQuoteSet).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.tokenData[uniAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'UNI',
        isLoading: true,
        isQuoteUnavailable: false,
      }),
    );
  });

  it('keeps missing quote rows loading when quote results do not match selected tokens', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        {
          quote: { srcAsset: { address: ethToken.address }, srcChainId: 1 },
          toTokenAmount: { amount: '123', valueInCurrency: '123.45' },
        },
      ],
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.hasCompleteQuoteSet).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.tokenData[uniAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'UNI',
        isLoading: true,
        isQuoteUnavailable: false,
      }),
    );
  });

  it('marks the quote set unavailable when no rows have quotes', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [null, null],
      totalReceived: { amount: '0', valueInCurrency: null },
      minimumReceived: { amount: '0', valueInCurrency: null },
      totalNetworkFee: { amount: '0', valueInCurrency: '' },
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(false);
    expect(result.current.hasCompleteQuoteSet).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.totalReceivedFiat).toBe('-');
    expect(result.current.tokenData).toEqual({
      [ethAssetId]: expect.objectContaining({
        tokenSymbol: 'ETH',
        isLoading: false,
        isQuoteUnavailable: true,
      }),
      [uniAssetId]: expect.objectContaining({
        tokenSymbol: 'UNI',
        isLoading: false,
        isQuoteUnavailable: true,
      }),
    });
  });
});
