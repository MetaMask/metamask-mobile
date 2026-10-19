import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { ChainId } from '@metamask/stake-sdk';
import { selectIsMoneyAccountVisible } from '../../Money/selectors/visibility';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../selectors/featureFlags';
import { selectTrxStakingEnabled } from '../../../../selectors/featureFlagController/trxStakingEnabled';
import { earnSelectors } from '../../../../selectors/earnController/earn';
import { pooledStakingSelectors } from '../../../../selectors/earnController/pooledStaking';
import useMoneyVaultApy from '../../Money/hooks/useMoneyVaultApy';
import useTronStakeApy, { FetchStatus } from './useTronStakeApy';
import useEarnSectionLendingMarkets from './useEarnSectionLendingMarkets';
import useEarnHighestRate from './useEarnHighestRate';

const mockSelectPooledStakingApy = jest.fn();

jest.mock('react-redux');
jest.mock('../../Money/selectors/visibility', () => ({
  selectIsMoneyAccountVisible: jest.fn(),
}));
jest.mock('../selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn(),
  selectStablecoinLendingEnabledFlag: jest.fn(),
}));
jest.mock(
  '../../../../selectors/featureFlagController/trxStakingEnabled',
  () => ({
    selectTrxStakingEnabled: jest.fn(),
  }),
);
jest.mock('../../../../selectors/earnController/earn', () => ({
  earnSelectors: {
    selectAllLendingMarkets: jest.fn(),
  },
}));
jest.mock('../../../../selectors/earnController/pooledStaking', () => ({
  pooledStakingSelectors: {
    selectEligibility: jest.fn(),
    selectVaultApyForChain: jest.fn(() => mockSelectPooledStakingApy),
  },
}));
jest.mock('../../Money/hooks/useMoneyVaultApy');
jest.mock('./useEarnSectionLendingMarkets');
jest.mock('./useTronStakeApy', () => ({
  __esModule: true,
  default: jest.fn(),
  FetchStatus: {
    Initial: 'initial',
    Fetching: 'fetching',
    Fetched: 'fetched',
    Error: 'error',
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseMoneyVaultApy = useMoneyVaultApy as jest.MockedFunction<
  typeof useMoneyVaultApy
>;
const mockUseEarnSectionLendingMarkets =
  useEarnSectionLendingMarkets as jest.MockedFunction<
    typeof useEarnSectionLendingMarkets
  >;
const mockUseTronStakeApy = useTronStakeApy as jest.MockedFunction<
  typeof useTronStakeApy
>;

const createMoneyApyResult = (
  apyPercent?: number,
): ReturnType<typeof useMoneyVaultApy> =>
  ({
    apyDecimal: apyPercent === undefined ? undefined : apyPercent / 100,
    apyPercent,
    apyPercentFormatted:
      apyPercent === undefined ? undefined : `${apyPercent}%`,
    vaultApyQuery: { isLoading: false, isError: false },
  }) as ReturnType<typeof useMoneyVaultApy>;

describe('useEarnHighestRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsMoneyAccountVisible) return true;
      if (selector === selectPooledStakingEnabledFlag) return true;
      if (selector === selectStablecoinLendingEnabledFlag) return true;
      if (selector === selectTrxStakingEnabled) return true;
      if (selector === pooledStakingSelectors.selectEligibility) return true;
      if (selector === mockSelectPooledStakingApy)
        return mockSelectPooledStakingApy();
      if (selector === earnSelectors.selectAllLendingMarkets) return [];
      return false;
    });
    mockSelectPooledStakingApy.mockReturnValue({ apyPercentString: '7.5' });
    mockUseMoneyVaultApy.mockReturnValue(createMoneyApyResult(6.2));
    mockUseEarnSectionLendingMarkets.mockReturnValue({
      markets: [
        {
          netSupplyRate: 7.1,
        },
      ] as never,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUseTronStakeApy.mockReturnValue({
      fetchStatus: FetchStatus.Fetched,
      errorMessage: null,
      apyDecimal: '8.1',
      apyPercent: '8.1%',
      refetch: jest.fn(),
    });
  });

  it('returns the highest ready rate across enabled Earn experiences', () => {
    const { result } = renderHook(() => useEarnHighestRate());

    expect(result.current.highestRate).toEqual({
      type: 'APR',
      percentage: 8.1,
      status: 'ready',
    });
  });

  it('enables each rate source when its experience is eligible', () => {
    renderHook(() => useEarnHighestRate());

    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: true });
    expect(mockUseEarnSectionLendingMarkets).toHaveBeenCalledWith({
      enabled: true,
    });
    expect(mockUseTronStakeApy).toHaveBeenCalledWith({
      chainId: ChainId.TRON_MAINNET,
      fetchOnMount: true,
    });
  });

  it('returns no rate while all available sources are pending', () => {
    mockUseMoneyVaultApy.mockReturnValue({
      ...createMoneyApyResult(),
      vaultApyQuery: {
        isLoading: true,
        isError: false,
      } as unknown as ReturnType<typeof useMoneyVaultApy>['vaultApyQuery'],
    });
    mockUseEarnSectionLendingMarkets.mockReturnValue({
      markets: [],
      isLoading: true,
      error: null,
      refresh: jest.fn(),
    });
    mockSelectPooledStakingApy.mockReturnValue(undefined);
    mockUseTronStakeApy.mockReturnValue({
      fetchStatus: FetchStatus.Fetching,
      errorMessage: null,
      apyDecimal: null,
      apyPercent: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useEarnHighestRate());

    expect(result.current.highestRate).toBeUndefined();
  });

  it('does not include disabled rate sources', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsMoneyAccountVisible) return false;
      if (selector === selectPooledStakingEnabledFlag) return false;
      if (selector === selectStablecoinLendingEnabledFlag) return false;
      if (selector === selectTrxStakingEnabled) return false;
      if (selector === pooledStakingSelectors.selectEligibility) return false;
      if (selector === earnSelectors.selectAllLendingMarkets) return [];
      if (selector === mockSelectPooledStakingApy) return undefined;
      return false;
    });

    const { result } = renderHook(() => useEarnHighestRate());

    expect(result.current.highestRate).toBeUndefined();
    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: false });
    expect(mockUseEarnSectionLendingMarkets).toHaveBeenCalledWith({
      enabled: false,
    });
    expect(mockUseTronStakeApy).toHaveBeenCalledWith({
      chainId: ChainId.TRON_MAINNET,
      fetchOnMount: false,
    });
  });
});
