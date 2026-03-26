import { renderHook } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import useTronRewardsRowsViewModel from './useTronRewardsRowsViewModel';

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

describe('useTronRewardsRowsViewModel', () => {
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

  it('returns display-ready props for both reward rows when APY data is available', () => {
    mockUseTronStakeApy.mockReturnValue({
      fetchStatus: FetchStatus.Fetched,
      errorMessage: null,
      apyDecimal: '4.5',
      apyPercent: '4.5%',
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useTronRewardsRowsViewModel({
        token: { chainId: 'tron:0x2b6653dc', address: 'tron:foo' },
      }),
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
    ).toBeNull();
  });

  it('returns an unavailable banner message when APY fetch fails', () => {
    mockUseTronStakeApy.mockReturnValue({
      fetchStatus: FetchStatus.Error,
      errorMessage: 'APR endpoint down',
      apyDecimal: null,
      apyPercent: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useTronRewardsRowsViewModel({
        token: { chainId: 'tron:0x2b6653dc', address: 'tron:foo' },
      }),
    );

    expect(result.current.estimatedAnnualRewardsRowProps).toBeNull();
    expect(result.current.estimatedAnnualRewardsUnavailableBannerProps).toEqual(
      {
        message: 'APR endpoint down',
      },
    );
  });
});
