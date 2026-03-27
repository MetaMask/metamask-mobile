import { renderHook } from '@testing-library/react-native';
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
      nonEvmFiatRate: 0.5,
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
        tokenChainId: 'tron:0x2b6653dc',
      }),
    );

    expect(mockUseTronStakeApy).toHaveBeenCalledWith({
      fetchOnMount: false,
    });
    expect(result.current).toEqual({});
  });

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
        tokenChainId: 'tron:0x2b6653dc',
      }),
    );

    expect(mockUseTronStakeApy).toHaveBeenCalledWith({
      fetchOnMount: true,
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
          tokenChainId: 'tron:0x2b6653dc',
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
        tokenChainId: 'tron:0x2b6653dc',
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
        tokenChainId: 'tron:0x2b6653dc',
      }),
    );

    expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
    expect(result.current.estimatedAnnualRewardsUnavailableBannerProps).toEqual(
      {
        message: strings('stake.tron.estimated_rewards_api_unavailable'),
      },
    );
  });
});
