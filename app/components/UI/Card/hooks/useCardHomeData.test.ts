import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardHomeData } from './useCardHomeData';
import { useAssetBalances } from './useAssetBalances';
import { getAssetBalanceKey } from '../util/getAssetBalanceKey';
import Engine from '../../../../core/Engine';
import {
  FundingAssetStatus,
  type CardFundingAsset,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { FundingStatus, type CardFundingToken } from '../types';

const mockFetchCardHomeData = jest.fn();

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      fetchCardHomeData: jest.fn(),
    },
  },
}));
jest.mock('./useAssetBalances', () => ({ useAssetBalances: jest.fn() }));
jest.mock('../util/getAssetBalanceKey');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseAssetBalances = useAssetBalances as jest.MockedFunction<
  typeof useAssetBalances
>;
const mockGetAssetBalanceKey = getAssetBalanceKey as jest.MockedFunction<
  typeof getAssetBalanceKey
>;

const mockAsset: CardFundingAsset = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0xUSDCAddress',
  walletAddress: '0xWalletAddr',
  decimals: 6,
  chainId: 'eip155:59144',
  spendableBalance: '500',
  spendingCap: '1000',
  priority: 1,
  status: FundingAssetStatus.Active,
};

const mockFundingToken: CardFundingToken = {
  address: '0xUSDCAddress',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
  caipChainId: 'eip155:59144',
  fundingStatus: FundingStatus.Enabled,
  spendableBalance: '500',
  spendingCap: '1000',
  walletAddress: '0xWalletAddr',
  priority: 1,
  stagingTokenAddress: null,
};

const mockBalanceEntry = {
  asset: undefined,
  balanceFiat: '$500.00',
  balanceFormatted: '500 USDC',
  rawFiatNumber: 500,
  rawTokenBalance: 500,
};

// useCardHomeData calls useSelector 5 times:
// 1. selectCardHomeData (raw CardHomeData)
// 2. selectCardHomeDataStatus
// 3. selectCardPrimaryToken
// 4. selectCardAvailableTokens
// 5. selectCardFundingTokens
function setupSelectors(
  data: unknown,
  status: 'idle' | 'loading' | 'success' | 'error',
  primaryToken: CardFundingToken | null = null,
  availableTokens: CardFundingToken[] = [],
  fundingTokens: CardFundingToken[] = [],
) {
  let callCount = 0;
  mockUseSelector.mockImplementation(() => {
    callCount++;
    const callIndex = ((callCount - 1) % 5) + 1;
    switch (callIndex) {
      case 1:
        return data;
      case 2:
        return status;
      case 3:
        return primaryToken;
      case 4:
        return availableTokens;
      case 5:
        return fundingTokens;
      default:
        return undefined;
    }
  });
}

describe('useCardHomeData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context.CardController.fetchCardHomeData as jest.Mock) =
      mockFetchCardHomeData;
    mockFetchCardHomeData.mockResolvedValue(undefined);
    mockUseAssetBalances.mockReturnValue(new Map());
    mockGetAssetBalanceKey.mockReturnValue('mock-key');
  });

  describe('useEffect safety-net fetch on mount', () => {
    it("triggers fetchCardHomeData when status is 'idle'", () => {
      setupSelectors(null, 'idle');
      renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
    });

    it("does NOT trigger fetchCardHomeData when status is 'loading'", () => {
      setupSelectors(null, 'loading');
      renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).not.toHaveBeenCalled();
    });

    it("does NOT trigger fetchCardHomeData when status is 'success'", () => {
      setupSelectors({ primaryFundingAsset: null }, 'success');
      renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).not.toHaveBeenCalled();
    });

    it("does NOT trigger fetchCardHomeData when status is 'error'", () => {
      setupSelectors(null, 'error');
      renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).not.toHaveBeenCalled();
    });
  });

  describe('isLoading', () => {
    it("is true when status is 'idle'", () => {
      setupSelectors(null, 'idle');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isLoading).toBe(true);
    });

    it("is true when status is 'loading'", () => {
      setupSelectors(null, 'loading');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isLoading).toBe(true);
    });

    it("is false when status is 'success'", () => {
      setupSelectors({ primaryFundingAsset: null }, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isLoading).toBe(false);
    });

    it("is false when status is 'error'", () => {
      setupSelectors(null, 'error');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('isError', () => {
    it("is true when status is 'error'", () => {
      setupSelectors(null, 'error');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isError).toBe(true);
    });

    it("is false when status is 'success'", () => {
      setupSelectors({ primaryFundingAsset: null }, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isError).toBe(false);
    });

    it("is false when status is 'idle'", () => {
      setupSelectors(null, 'idle');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isError).toBe(false);
    });
  });

  describe('data', () => {
    it('reflects the value from selectCardHomeData', () => {
      const mockData = {
        primaryFundingAsset: null,
        fundingAssets: [],
        card: null,
      };
      setupSelectors(mockData, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.data).toStrictEqual(mockData);
    });

    it('is null when no data is loaded', () => {
      setupSelectors(null, 'idle');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.data).toBeNull();
    });
  });

  describe('refetch', () => {
    it('calls Engine.context.CardController.fetchCardHomeData', () => {
      setupSelectors(null, 'success');
      const { result } = renderHook(() => useCardHomeData());

      result.current.refetch();

      expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
    });
  });

  describe('primaryToken', () => {
    it('is null when data is null', () => {
      setupSelectors(null, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.primaryToken).toBeNull();
    });

    it('is null when primaryFundingAsset is null', () => {
      setupSelectors({ primaryFundingAsset: null }, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.primaryToken).toBeNull();
    });

    it('returns enriched token when primaryFundingAsset exists and balance map has a match', () => {
      setupSelectors(
        {
          primaryFundingAsset: mockAsset,
          availableFundingAssets: [],
          fundingAssets: [],
        },
        'success',
        mockFundingToken,
        [],
        [],
      );
      mockGetAssetBalanceKey.mockReturnValue('mock-key');
      mockUseAssetBalances.mockReturnValue(
        new Map([['mock-key', mockBalanceEntry]]),
      );

      const { result } = renderHook(() => useCardHomeData());

      expect(result.current.primaryToken).toEqual({
        ...mockFundingToken,
        balanceFiat: '$500.00',
        balanceFormatted: '500 USDC',
        rawFiatNumber: 500,
        rawTokenBalance: 500,
      });
    });

    it('returns enriched token with undefined balance fields when map has no match', () => {
      setupSelectors(
        {
          primaryFundingAsset: mockAsset,
          availableFundingAssets: [],
          fundingAssets: [],
        },
        'success',
        mockFundingToken,
        [],
        [],
      );
      mockUseAssetBalances.mockReturnValue(new Map());

      const { result } = renderHook(() => useCardHomeData());

      expect(result.current.primaryToken).toEqual({
        ...mockFundingToken,
        balanceFiat: undefined,
        balanceFormatted: undefined,
        rawFiatNumber: undefined,
        rawTokenBalance: undefined,
      });
    });
  });

  describe('availableTokens', () => {
    it('is an empty array when availableFundingAssets is absent', () => {
      setupSelectors({ primaryFundingAsset: null }, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.availableTokens).toEqual([]);
    });

    it('converts each supported token and merges balance data', () => {
      setupSelectors(
        {
          primaryFundingAsset: null,
          availableFundingAssets: [mockAsset],
          fundingAssets: [],
        },
        'success',
        null,
        [mockFundingToken],
        [],
      );
      mockGetAssetBalanceKey.mockReturnValue('mock-key');
      mockUseAssetBalances.mockReturnValue(
        new Map([['mock-key', mockBalanceEntry]]),
      );

      const { result } = renderHook(() => useCardHomeData());

      expect(result.current.availableTokens).toHaveLength(1);
      expect(result.current.availableTokens[0]).toEqual({
        ...mockFundingToken,
        balanceFiat: '$500.00',
        balanceFormatted: '500 USDC',
        rawFiatNumber: 500,
        rawTokenBalance: 500,
      });
    });
  });

  describe('fundingTokens', () => {
    it('is an empty array when fundingAssets is absent', () => {
      setupSelectors({ primaryFundingAsset: null }, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.fundingTokens).toEqual([]);
    });

    it('converts each funding token and merges balance data', () => {
      setupSelectors(
        {
          primaryFundingAsset: null,
          availableFundingAssets: [],
          fundingAssets: [mockAsset],
        },
        'success',
        null,
        [],
        [mockFundingToken],
      );
      mockGetAssetBalanceKey.mockReturnValue('mock-key');
      mockUseAssetBalances.mockReturnValue(
        new Map([['mock-key', mockBalanceEntry]]),
      );

      const { result } = renderHook(() => useCardHomeData());

      expect(result.current.fundingTokens).toHaveLength(1);
      expect(result.current.fundingTokens[0]).toEqual({
        ...mockFundingToken,
        balanceFiat: '$500.00',
        balanceFormatted: '500 USDC',
        rawFiatNumber: 500,
        rawTokenBalance: 500,
      });
    });
  });

  describe('balanceMap', () => {
    it('returns the map from useAssetBalances', () => {
      const mockMap = new Map([['key', mockBalanceEntry]]);
      setupSelectors({ primaryFundingAsset: null }, 'success');
      mockUseAssetBalances.mockReturnValue(mockMap);

      const { result } = renderHook(() => useCardHomeData());

      expect(result.current.balanceMap).toBe(mockMap);
    });
  });
});
