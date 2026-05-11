import { renderHook } from '@testing-library/react-hooks';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import useTrackRewardsPageView from './useTrackRewardsPageView';
import { useVipDashboard } from './useVipDashboard';
import { useVipViewGuard } from './useVipViewGuard';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  StackActions: {
    replace: jest.fn((route: string) => ({ type: 'replace', route })),
  },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
  selectIsCurrentSubscriptionVipEnabled: jest.fn(),
}));

jest.mock('./useTrackRewardsPageView', () => jest.fn());
jest.mock('./useVipDashboard', () => ({
  useVipDashboard: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseVipDashboard = useVipDashboard as jest.MockedFunction<
  typeof useVipDashboard
>;
const mockUseTrackRewardsPageView =
  useTrackRewardsPageView as jest.MockedFunction<
    typeof useTrackRewardsPageView
  >;

const buildDashboardResult = (
  overrides: Partial<ReturnType<typeof useVipDashboard>> = {},
) => ({
  dashboard: null,
  isLoading: false,
  hasError: false,
  hasAttemptedFetch: false,
  fetchVipDashboard: jest.fn(),
  ...overrides,
});

describe('useVipViewGuard', () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({ dispatch } as never);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return 'sub-1';
      if (selector === selectIsCurrentSubscriptionVipEnabled) return true;
      return undefined;
    });
    mockUseVipDashboard.mockReturnValue(buildDashboardResult());
  });

  it('returns canViewVip=true when a subscription exists and VIP is enabled', () => {
    const { result } = renderHook(() => useVipViewGuard('vip'));

    expect(result.current.canViewVip).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();
    expect(mockUseTrackRewardsPageView).toHaveBeenCalledWith({
      page_type: 'vip',
      enabled: true,
    });
  });

  it('redirects to the rewards dashboard when canViewVip is false', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return undefined;
      if (selector === selectIsCurrentSubscriptionVipEnabled) return false;
      return undefined;
    });

    const { result } = renderHook(() => useVipViewGuard('vip_tiers'));

    expect(result.current.canViewVip).toBe(false);
    expect(StackActions.replace).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'replace',
      route: Routes.REWARDS_DASHBOARD,
    });
  });

  it('flags showSkeleton when no fetch has been attempted and no dashboard is cached', () => {
    mockUseVipDashboard.mockReturnValue(
      buildDashboardResult({ hasAttemptedFetch: false, dashboard: null }),
    );

    const { result } = renderHook(() => useVipViewGuard('vip'));

    expect(result.current.showSkeleton).toBe(true);
    expect(result.current.showError).toBe(false);
  });

  it('flags showSkeleton while loading without a cached dashboard', () => {
    mockUseVipDashboard.mockReturnValue(
      buildDashboardResult({
        hasAttemptedFetch: true,
        isLoading: true,
        dashboard: null,
      }),
    );

    const { result } = renderHook(() => useVipViewGuard('vip'));

    expect(result.current.showSkeleton).toBe(true);
  });

  it('flags showError when the fetch errored and no dashboard is cached', () => {
    mockUseVipDashboard.mockReturnValue(
      buildDashboardResult({
        hasAttemptedFetch: true,
        hasError: true,
        dashboard: null,
      }),
    );

    const { result } = renderHook(() => useVipViewGuard('vip'));

    expect(result.current.showError).toBe(true);
    expect(result.current.showSkeleton).toBe(false);
  });

  it('suppresses skeleton and error when a cached dashboard is available', () => {
    mockUseVipDashboard.mockReturnValue(
      buildDashboardResult({
        hasAttemptedFetch: true,
        isLoading: true,
        hasError: true,
        dashboard: { program: { id: 'p1', name: 'VIP' } } as never,
      }),
    );

    const { result } = renderHook(() => useVipViewGuard('vip'));

    expect(result.current.showSkeleton).toBe(false);
    expect(result.current.showError).toBe(false);
  });
});
