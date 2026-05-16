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
  recommendedQuotes: ({ toTokenAmount: { amount: string } } | null)[];
  totalReceived: { amount: string };
  minimumReceived: { amount: string };
  totalNetworkFee: { amount: string; valueInCurrency: string };
  isLoading: boolean;
} = {
  recommendedQuotes: [
    { toTokenAmount: { amount: '123' } },
    { toTokenAmount: { amount: '77' } },
  ],
  totalReceived: { amount: '200' },
  minimumReceived: { amount: '190' },
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
        { toTokenAmount: { amount: '123' } },
        { toTokenAmount: { amount: '77' } },
      ],
      totalReceived: { amount: '200' },
      minimumReceived: { amount: '190' },
      totalNetworkFee: { amount: '1.2', valueInCurrency: '1.25' },
      isLoading: false,
    };
  });

  it('formats complete Batch Sell quote data', () => {
    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasCompleteQuoteSet).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.totalReceived).toBe('200 USDC');
    expect(result.current.minimumReceived).toBe('190 USDC');
    expect(result.current.networkFee).toBe('1.2 USDC');
    expect(result.current.networkFeeFiat).toBe('$1.25');
    expect(result.current.tokenData).toEqual([
      expect.objectContaining({
        key: ethAssetId,
        tokenSymbol: 'ETH',
        receivedAmount: '123 USDC',
        isLoading: false,
      }),
      expect.objectContaining({
        key: uniAssetId,
        tokenSymbol: 'UNI',
        receivedAmount: '77 USDC',
        isLoading: false,
      }),
    ]);
  });

  it('marks rows without recommended quotes as loading', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [{ toTokenAmount: { amount: '123' } }, null],
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasCompleteQuoteSet).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.tokenData[1]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'UNI',
        receivedAmount: '-- USDC',
        isLoading: true,
      }),
    );
  });
});
