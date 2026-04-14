import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardHomeData } from './useCardHomeData';
import { useAssetBalances } from './useAssetBalances';
import { toCardTokenAllowance } from '../util/toCardTokenAllowance';
import { getAssetBalanceKey } from '../util/getAssetBalanceKey';
import Engine from '../../../../core/Engine';
import {
  FundingAssetStatus,
  type CardFundingAsset,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { AllowanceState, type CardTokenAllowance } from '../types';

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
jest.mock('../util/toCardTokenAllowance');
jest.mock('../util/getAssetBalanceKey');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseAssetBalances = useAssetBalances as jest.MockedFunction<
  typeof useAssetBalances
>;
const mockToCardTokenAllowance = toCardTokenAllowance as jest.MockedFunction<
  typeof toCardTokenAllowance
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
  balance: '500',
  allowance: '1000',
  priority: 1,
  status: FundingAssetStatus.Active,
};

const mockLegacyToken: CardTokenAllowance = {
  address: '0xUSDCAddress',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
  caipChainId: 'eip155:59144',
  allowanceState: AllowanceState.Enabled,
  allowance: '500',
  totalAllowance: '1000',
  availableBalance: '500',
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

// useCardHomeData calls useSelector twice: once for data, once for status.
// We set up the mock to return different values based on call order.
function setupSelectors(
  data: unknown,
  status: 'idle' | 'loading' | 'success' | 'error',
) {
  let callCount = 0;
  mockUseSelector.mockImplementation(() => {
    callCount++;
    // First call is selectCardHomeData, second is selectCardHomeDataStatus
    return callCount % 2 === 1 ? data : status;
  });
}

describe('useCardHomeData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context.CardController.fetchCardHomeData as jest.Mock) =
      mockFetchCardHomeData;
    mockFetchCardHomeData.mockResolvedValue(undefined);
    mockUseAssetBalances.mockReturnValue(new Map());
    mockToCardTokenAllowance.mockReturnValue(mockLegacyToken);
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
      setupSelectors({ primaryAsset: null }, 'success');
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
      setupSelectors({ primaryAsset: null }, 'success');
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
      setupSelectors({ primaryAsset: null }, 'success');
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
      const mockData = { primaryAsset: null, assets: [], card: null };
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

  describe('primaryAsset', () => {
    it('is null when data is null', () => {
      setupSelectors(null, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.primaryAsset).toBeNull();
    });

    it('is null when primaryAsset is null', () => {
      setupSelectors({ primaryAsset: null }, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.primaryAsset).toBeNull();
    });

    it('returns enriched token when primaryAsset exists and balance map has a match', () => {
      setupSelectors(
        { primaryAsset: mockAsset, supportedTokens: [], assets: [] },
        'success',
      );
      mockGetAssetBalanceKey.mockReturnValue('mock-key');
      mockUseAssetBalances.mockReturnValue(
        new Map([['mock-key', mockBalanceEntry]]),
      );

      const { result } = renderHook(() => useCardHomeData());

      expect(mockToCardTokenAllowance).toHaveBeenCalledWith(mockAsset);
      expect(result.current.primaryAsset).toEqual({
        ...mockLegacyToken,
        balanceFiat: '$500.00',
        balanceFormatted: '500 USDC',
        rawFiatNumber: 500,
        rawTokenBalance: 500,
      });
    });

    it('returns enriched token with undefined balance fields when map has no match', () => {
      setupSelectors(
        { primaryAsset: mockAsset, supportedTokens: [], assets: [] },
        'success',
      );
      mockUseAssetBalances.mockReturnValue(new Map());

      const { result } = renderHook(() => useCardHomeData());

      expect(result.current.primaryAsset).toEqual({
        ...mockLegacyToken,
        balanceFiat: undefined,
        balanceFormatted: undefined,
        rawFiatNumber: undefined,
        rawTokenBalance: undefined,
      });
    });
  });

  describe('supportedAssets', () => {
    it('is an empty array when supportedTokens is absent', () => {
      setupSelectors({ primaryAsset: null }, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.supportedAssets).toEqual([]);
    });

    it('converts each supported token and merges balance data', () => {
      setupSelectors(
        { primaryAsset: null, supportedTokens: [mockAsset], assets: [] },
        'success',
      );
      mockGetAssetBalanceKey.mockReturnValue('mock-key');
      mockUseAssetBalances.mockReturnValue(
        new Map([['mock-key', mockBalanceEntry]]),
      );

      const { result } = renderHook(() => useCardHomeData());

      expect(result.current.supportedAssets).toHaveLength(1);
      expect(result.current.supportedAssets[0]).toEqual({
        ...mockLegacyToken,
        balanceFiat: '$500.00',
        balanceFormatted: '500 USDC',
        rawFiatNumber: 500,
        rawTokenBalance: 500,
      });
    });
  });

  describe('assetTokens', () => {
    it('is an empty array when assets is absent', () => {
      setupSelectors({ primaryAsset: null }, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.assetTokens).toEqual([]);
    });

    it('converts each asset token and merges balance data', () => {
      setupSelectors(
        { primaryAsset: null, supportedTokens: [], assets: [mockAsset] },
        'success',
      );
      mockGetAssetBalanceKey.mockReturnValue('mock-key');
      mockUseAssetBalances.mockReturnValue(
        new Map([['mock-key', mockBalanceEntry]]),
      );

      const { result } = renderHook(() => useCardHomeData());

      expect(result.current.assetTokens).toHaveLength(1);
      expect(result.current.assetTokens[0]).toEqual({
        ...mockLegacyToken,
        balanceFiat: '$500.00',
        balanceFormatted: '500 USDC',
        rawFiatNumber: 500,
        rawTokenBalance: 500,
      });
    });
  });

  describe('assetBalancesMap', () => {
    it('returns the map from useAssetBalances', () => {
      const mockMap = new Map([['key', mockBalanceEntry]]);
      setupSelectors({ primaryAsset: null }, 'success');
      mockUseAssetBalances.mockReturnValue(mockMap);

      const { result } = renderHook(() => useCardHomeData());

      expect(result.current.assetBalancesMap).toBe(mockMap);
    });
  });
});
