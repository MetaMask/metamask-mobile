import { act, renderHook } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import type { NavigationAnalyticsContext } from '../../../../../../util/analytics/navigationAnalyticsAttribution';
import { usePerpsNavigationHandlers } from './usePerpsNavigationHandlers';

const mockNavigate = jest.fn();
const mockGetPerpsHomeNavigationTarget = jest.fn();
let mockIsFirstTimePerpsUser = false;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: () => mockIsFirstTimePerpsUser,
}));

jest.mock('../../../../../UI/Perps/utils/perpsModeSwitch', () => ({
  useGetPerpsHomeNavigationTarget: () => mockGetPerpsHomeNavigationTarget,
  toPerpsNavigatorScreenParams: (target: unknown) => target,
}));

const analyticsContext: NavigationAnalyticsContext = {
  id: 'balance-breakdown-navigation',
  attribution: 'homescreen_balance_breakdown',
};

describe('usePerpsNavigationHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFirstTimePerpsUser = false;
    mockGetPerpsHomeNavigationTarget.mockImplementation((params) => ({
      screen: Routes.PERPS.PERPS_HOME,
      params,
    }));
  });

  it('attributes the tutorial and preserves context for the post-tutorial destination', () => {
    mockIsFirstTimePerpsUser = true;
    const { result } = renderHook(() => usePerpsNavigationHandlers());

    act(() => result.current.navigateToPerpsHome(analyticsContext));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
      source: 'homescreen_balance_breakdown',
      redirectScreen: Routes.PERPS.PERPS_HOME,
      redirectParams: { analyticsContext },
    });
  });

  it('passes navigation analytics context to returning users', () => {
    const { result } = renderHook(() => usePerpsNavigationHandlers());

    act(() => result.current.navigateToPerpsHome(analyticsContext));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: { analyticsContext },
    });
  });

  it('uses the existing source when navigation context is absent', () => {
    const { result } = renderHook(() => usePerpsNavigationHandlers());

    act(() => result.current.navigateToPerpsHome());

    expect(mockGetPerpsHomeNavigationTarget).toHaveBeenCalledWith({
      source: 'home_section',
    });
  });
});
