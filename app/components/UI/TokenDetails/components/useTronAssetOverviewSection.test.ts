import { renderHook } from '@testing-library/react-native';
import { ChainId } from '@metamask/stake-sdk';
import { strings } from '../../../../../locales/i18n';
import useTronAssetOverviewSection from './useTronAssetOverviewSection';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock(
  '../../Earn/components/Tron/TronStakingRewardsRows/useTronStakingRewardsSummary',
  () => ({
    __esModule: true,
    default: jest.fn(),
  }),
);

jest.mock('../../Earn/hooks/useTronStakeApy', () => ({
  __esModule: true,
  default: jest.fn(),
  FetchStatus: {
    Initial: 'initial',
    Fetching: 'fetching',
    Fetched: 'fetched',
    Error: 'error',
  },
}));

jest.mock('../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(),
}));

const TRON_MAINNET_CAIP_CHAIN_ID = 'tron:0x2b6653dc';
const TRON_NILE_CAIP_CHAIN_ID = 'tron:0xcd8690dc';

import { useSelector } from 'react-redux';
import useTronStakingRewardsSummary from '../../Earn/components/Tron/TronStakingRewardsRows/useTronStakingRewardsSummary';
import useTronStakeApy, { FetchStatus } from '../../Earn/hooks/useTronStakeApy';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';

const mockUseTronStakingRewardsSummary =
  useTronStakingRewardsSummary as jest.MockedFunction<
    typeof useTronStakingRewardsSummary
  >;
const mockUseTronStakeApy = useTronStakeApy as jest.MockedFunction<
  typeof useTronStakeApy
>;
const mockSelectPrivacyMode = selectPrivacyMode as jest.MockedFunction<
  typeof selectPrivacyMode
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

interface TronStakeApyMockResult {
  fetchStatus: FetchStatus;
  errorMessage: string | null;
  apyDecimal: string | null;
  apyPercent: string | null;
  refetch: jest.Mock;
}

const createFetchedApy = (
  overrides: Partial<TronStakeApyMockResult> = {},
): TronStakeApyMockResult => ({
  fetchStatus: FetchStatus.Fetched,
  errorMessage: null,
  apyDecimal: '4.5',
  apyPercent: '4.5%',
  refetch: jest.fn(),
  ...overrides,
});

const renderSubject = ({
  apy = createFetchedApy(),
  summary = {},
}: {
  apy?: ReturnType<typeof createFetchedApy>;
  summary?: Partial<ReturnType<typeof useTronStakingRewardsSummary>>;
} = {}) => {
  mockUseTronStakeApy.mockReturnValue(apy);
  mockUseTronStakingRewardsSummary.mockReturnValue({
    claimableRewardsTrxAmount: 1.23456,
    claimableRewardsFiatAmount: 12.34,
    claimableRewardsCurrency: 'USD',
    totalStakedTrx: 100,
    fiatRate: 0.5,
    currentCurrency: 'USD',
    ...summary,
  });

  return renderHook(() =>
    useTronAssetOverviewSection({
      enabled: true,
      tokenAddress: 'tron:foo',
      tokenChainId: TRON_MAINNET_CAIP_CHAIN_ID,
    }),
  );
};

describe('useTronAssetOverviewSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectPrivacyMode.mockReturnValue(false);
    mockUseSelector.mockImplementation((selector) => selector({} as never));
    mockUseTronStakingRewardsSummary.mockReturnValue({
      claimableRewardsTrxAmount: 1.23456,
      claimableRewardsFiatAmount: 12.34,
      claimableRewardsCurrency: 'USD',
      totalStakedTrx: 100,
      fiatRate: 0.5,
      currentCurrency: 'USD',
    });
  });

  it('short-circuits Tron work when disabled', () => {
    mockUseTronStakeApy.mockReturnValue({
      fetchStatus: FetchStatus.Initial,
      errorMessage: null,
      apyDecimal: null,
      apyPercent: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useTronAssetOverviewSection({
        enabled: false,
        tokenAddress: 'tron:foo',
        tokenChainId: TRON_MAINNET_CAIP_CHAIN_ID,
      }),
    );

    expect(mockUseTronStakeApy).toHaveBeenCalledWith({
      fetchOnMount: false,
      chainId: ChainId.TRON_MAINNET,
    });
    expect(result.current).toEqual({});
  });

  it.each([
    [TRON_MAINNET_CAIP_CHAIN_ID, ChainId.TRON_MAINNET],
    [TRON_NILE_CAIP_CHAIN_ID, ChainId.TRON_NILE],
  ])(
    'maps CAIP chain id %s to stake chain id %s',
    (tokenChainId, expectedChainId) => {
      mockUseTronStakeApy.mockReturnValue({
        fetchStatus: FetchStatus.Fetched,
        errorMessage: null,
        apyDecimal: '4.5',
        apyPercent: '4.5%',
        refetch: jest.fn(),
      });

      const { result } = renderHook(() =>
        useTronAssetOverviewSection({
          enabled: true,
          tokenAddress: 'tron:foo',
          tokenChainId,
        }),
      );

      expect(mockUseTronStakeApy).toHaveBeenCalledWith({
        fetchOnMount: true,
        chainId: expectedChainId,
      });
      expect(result.current).toEqual(
        expect.objectContaining({ aprText: '4.5%' }),
      );
    },
  );

  it('returns APR text and both reward row props when APY data is available', () => {
    mockUseTronStakeApy.mockReturnValue({
      fetchStatus: FetchStatus.Fetched,
      errorMessage: null,
      apyDecimal: '4.5',
      apyPercent: '4.5%',
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useTronAssetOverviewSection({
        enabled: true,
        tokenAddress: 'tron:foo',
        tokenChainId: TRON_MAINNET_CAIP_CHAIN_ID,
      }),
    );

    expect(mockUseTronStakeApy).toHaveBeenCalledWith({
      fetchOnMount: true,
      chainId: ChainId.TRON_MAINNET,
    });
    expect(result.current).toEqual(
      expect.objectContaining({ aprText: '4.5%' }),
    );
    expect(result.current.claimableRewardsRowProps).toEqual(
      expect.objectContaining({
        title: strings('stake.tron.total_claimable_rewards'),
        hideBalances: false,
      }),
    );
    expect(result.current.estimatedAnnualRewardsRowProps).toEqual(
      expect.objectContaining({
        title: strings('stake.estimated_annual_rewards'),
        hideBalances: false,
      }),
    );
    expect(
      result.current.estimatedAnnualRewardsUnavailableBannerProps,
    ).toBeUndefined();
  });

  it.each([FetchStatus.Initial, FetchStatus.Fetching])(
    'does not show an unavailable banner while APY fetch status is %s',
    (fetchStatus) => {
      mockUseTronStakeApy.mockReturnValue({
        fetchStatus,
        errorMessage: null,
        apyDecimal: null,
        apyPercent: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() =>
        useTronAssetOverviewSection({
          enabled: true,
          tokenAddress: 'tron:foo',
          tokenChainId: TRON_MAINNET_CAIP_CHAIN_ID,
        }),
      );

      expect(result.current.aprText).toBeUndefined();
      expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
      expect(
        result.current.estimatedAnnualRewardsUnavailableBannerProps,
      ).toBeUndefined();
    },
  );

  it('returns an unavailable banner message when APY fetch fails', () => {
    mockUseTronStakeApy.mockReturnValue({
      fetchStatus: FetchStatus.Error,
      errorMessage: 'APR endpoint down',
      apyDecimal: null,
      apyPercent: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useTronAssetOverviewSection({
        enabled: true,
        tokenAddress: 'tron:foo',
        tokenChainId: TRON_MAINNET_CAIP_CHAIN_ID,
      }),
    );

    expect(result.current.aprText).toBeUndefined();
    expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
    expect(result.current.estimatedAnnualRewardsUnavailableBannerProps).toEqual(
      {
        message: 'APR endpoint down',
      },
    );
  });

  it('uses fallback copy when APY fetch succeeds without an APY decimal', () => {
    mockUseTronStakeApy.mockReturnValue({
      fetchStatus: FetchStatus.Fetched,
      errorMessage: null,
      apyDecimal: null,
      apyPercent: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useTronAssetOverviewSection({
        enabled: true,
        tokenAddress: 'tron:foo',
        tokenChainId: TRON_MAINNET_CAIP_CHAIN_ID,
      }),
    );

    expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
    expect(result.current.estimatedAnnualRewardsUnavailableBannerProps).toEqual(
      {
        message: strings('stake.tron.estimated_rewards_api_unavailable'),
      },
    );
  });

  it('starts the claimable subtitle with a dash when claimable fiat is missing', () => {
    const { result } = renderSubject({
      summary: {
        claimableRewardsFiatAmount: undefined,
      },
    });

    expect(result.current.claimableRewardsRowProps?.subtitle).toMatch(/^-+/);
    expect(result.current.claimableRewardsRowProps?.subtitle).toContain('TRX');
  });

  it('starts the estimated subtitle with a dash when estimated fiat is missing but APY and TRX are available', () => {
    const { result } = renderSubject({
      summary: {
        fiatRate: undefined,
      },
    });

    expect(result.current.estimatedAnnualRewardsRowProps?.subtitle).toMatch(
      /^-+/,
    );
    expect(result.current.estimatedAnnualRewardsRowProps?.subtitle).toContain(
      'TRX',
    );
  });

  it('returns one normalized fiat error message when both claimable and estimated fiat are missing', () => {
    const { result } = renderSubject({
      summary: {
        claimableRewardsFiatAmount: undefined,
        claimableRewardsCurrency: undefined,
        fiatRate: undefined,
      },
    });

    const current = result.current as { errorMessages?: string[] };
    expect(result.current.claimableRewardsRowProps).toBeDefined();
    expect(result.current.estimatedAnnualRewardsRowProps).toBeDefined();
    expect(current.errorMessages).toHaveLength(1);
  });

  it('returns an APY error message and omits the estimated row when APY is unavailable', () => {
    const { result } = renderSubject({
      apy: {
        fetchStatus: FetchStatus.Error,
        errorMessage: 'APR endpoint down',
        apyDecimal: null,
        apyPercent: null,
        refetch: jest.fn(),
      },
    });

    const current = result.current as { errorMessages?: string[] };
    expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
    expect(current.errorMessages).toEqual(['APR endpoint down']);
  });

  it('returns exactly two deduped banner messages when APY and fiat are both unavailable', () => {
    const { result } = renderSubject({
      apy: {
        fetchStatus: FetchStatus.Error,
        errorMessage: 'APR endpoint down',
        apyDecimal: null,
        apyPercent: null,
        refetch: jest.fn(),
      },
      summary: {
        claimableRewardsFiatAmount: undefined,
        claimableRewardsCurrency: undefined,
        fiatRate: undefined,
      },
    });

    const current = result.current as { errorMessages?: string[] };
    expect(current.errorMessages).toHaveLength(2);
    expect(current.errorMessages).toEqual(
      expect.arrayContaining(['APR endpoint down']),
    );
  });
});
