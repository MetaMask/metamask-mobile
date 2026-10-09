import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  selectCardHomeData,
  selectCardHomeDataStatus,
  selectCardPrimaryToken,
  selectCardAvailableTokens,
  selectCardFundingTokens,
  selectIsCardAuthenticated,
  selectIsCardholder,
  selectCardHomeDataFetchedThisSession,
} from '../../../../selectors/cardController';
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
jest.mock('../util/ensureCardFundingTokensImported', () => ({
  ensureCardFundingTokensImported: jest.fn(() => Promise.resolve()),
}));
jest.mock('./useEnsureCardNetworkExists', () => ({
  useEnsureCardNetworkExists: () => ({
    ensureNetworkExists: jest.fn(() => Promise.resolve('client-id')),
  }),
}));

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

interface CardOwnership {
  isCardholder: boolean;
  isCardAuthenticated: boolean;
}

const CARDHOLDER: CardOwnership = {
  isCardholder: true,
  isCardAuthenticated: false,
};

// Dispatch on selector identity, not call order: a positional mapping fails
// silently (every value shifts by one) when the next selector is added.
function setupSelectors(
  data: unknown,
  status: 'idle' | 'loading' | 'success' | 'error',
  primaryToken: CardFundingToken | null = null,
  availableTokens: CardFundingToken[] = [],
  fundingTokens: CardFundingToken[] = [],
  ownership: CardOwnership = CARDHOLDER,
  // Defaults to already-fetched so only opt-in tests hit the revalidation path.
  fetchedThisSession: boolean = true,
) {
  const valuesBySelector = new Map<unknown, unknown>([
    [selectCardHomeData, data],
    [selectCardHomeDataStatus, status],
    [selectCardPrimaryToken, primaryToken],
    [selectCardAvailableTokens, availableTokens],
    [selectCardFundingTokens, fundingTokens],
    [selectIsCardholder, ownership.isCardholder],
    [selectIsCardAuthenticated, ownership.isCardAuthenticated],
    [selectCardHomeDataFetchedThisSession, fetchedThisSession],
  ]);

  mockUseSelector.mockImplementation((selector) => {
    if (!valuesBySelector.has(selector)) {
      throw new Error(
        'useCardHomeData read an unmapped selector — add it to setupSelectors',
      );
    }
    return valuesBySelector.get(selector);
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

  describe('useEffect status-driven fetch', () => {
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

    it("triggers fetchCardHomeData when status is 'error'", () => {
      setupSelectors(null, 'error');
      renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
    });

    it("triggers fetchCardHomeData when status transitions back to 'idle'", () => {
      setupSelectors({ primaryFundingAsset: null }, 'success');
      const { rerender } = renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).not.toHaveBeenCalled();

      setupSelectors(null, 'idle');
      rerender();

      expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
    });

    it('does NOT trigger fetchCardHomeData when the user has no card', () => {
      setupSelectors(null, 'idle', null, [], [], {
        isCardholder: false,
        isCardAuthenticated: false,
      });
      renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).not.toHaveBeenCalled();
    });

    it('triggers fetchCardHomeData for an authenticated user who is not yet a listed cardholder', () => {
      setupSelectors(null, 'idle', null, [], [], {
        isCardholder: false,
        isCardAuthenticated: true,
      });
      renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
    });

    it('revalidates persisted data that has not been fetched yet this session', () => {
      setupSelectors(null, 'success', null, [], [], CARDHOLDER, false);

      renderHook(() => useCardHomeData());

      expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
    });

    it('does not revalidate again once the session has fetched', () => {
      setupSelectors(null, 'success', null, [], [], CARDHOLDER, true);

      renderHook(() => useCardHomeData());

      expect(mockFetchCardHomeData).not.toHaveBeenCalled();
    });

    it('does not revalidate persisted data for a user with no card', () => {
      setupSelectors(
        null,
        'success',
        null,
        [],
        [],
        { isCardholder: false, isCardAuthenticated: false },
        false,
      );

      renderHook(() => useCardHomeData());

      expect(mockFetchCardHomeData).not.toHaveBeenCalled();
    });

    it('triggers fetchCardHomeData once the user becomes a cardholder', () => {
      setupSelectors(null, 'idle', null, [], [], {
        isCardholder: false,
        isCardAuthenticated: false,
      });
      const { rerender } = renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).not.toHaveBeenCalled();

      setupSelectors(null, 'idle');
      rerender();

      expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
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

    it("is false when status is 'loading' with cached data", () => {
      setupSelectors({ primaryFundingAsset: null }, 'loading');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isLoading).toBe(false);
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

    it("is false when status is 'error' with cached data", () => {
      setupSelectors({ primaryFundingAsset: null }, 'error');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isError).toBe(false);
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

  describe('isRefreshing', () => {
    it("is true when status is 'loading' with cached data", () => {
      setupSelectors({ primaryFundingAsset: null }, 'loading');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isRefreshing).toBe(true);
    });

    it("is false when status is 'loading' without cached data", () => {
      setupSelectors(null, 'loading');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isRefreshing).toBe(false);
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
    it('calls Engine.context.CardController.fetchCardHomeData with force', () => {
      setupSelectors(null, 'success');
      const { result } = renderHook(() => useCardHomeData());

      result.current.refetch();

      expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
      expect(mockFetchCardHomeData).toHaveBeenCalledWith({ force: true });
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
