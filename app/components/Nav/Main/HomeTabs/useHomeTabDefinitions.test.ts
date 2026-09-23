import type { NativeBottomTabNavigationProp } from '@react-navigation/bottom-tabs/unstable';
import type { ParamListBase } from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { ActivityScreenEntryPoint } from '../../../../core/Analytics/events/activity';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import initialRootState from '../../../../util/test/initial-root-state';
import { TabBarIconKey } from '../../../../component-library/components/Navigation/TabBar/TabBar.types';
import TrendingFeedSessionManager from '../../../UI/Trending/services/TrendingFeedSessionManager';
import { useHomeTabDefinitions } from './useHomeTabDefinitions';

jest.mock('../../../../util/haptics');

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn();
const mockCreateEventBuilder = jest.fn();
jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockNavigateToMoneyHome = jest.fn();
jest.mock('../../../UI/Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: () => ({
    navigateToMoneyHome: mockNavigateToMoneyHome,
  }),
}));

const mockSessionManager = {
  enableAppStateListener: jest.fn(),
  disableAppStateListener: jest.fn(),
  startSession: jest.fn(),
  endSession: jest.fn(),
};
jest.mock('../../../UI/Trending/services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const mockNavigation = {
  navigate: jest.fn(),
} as unknown as NativeBottomTabNavigationProp<ParamListBase>;

const renderDefinitions = (
  overrides: Partial<Parameters<typeof useHomeTabDefinitions>[0]> = {},
) =>
  renderHookWithProvider(
    () =>
      useHomeTabDefinitions({
        isMoneyAccountVisible: false,
        showSocialTab: false,
        trackMoneyTabPress: jest.fn(),
        ...overrides,
      }),
    { state: initialRootState },
  );

describe('useHomeTabDefinitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue({ name: 'built' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    jest
      .mocked(TrendingFeedSessionManager.getInstance)
      .mockReturnValue(
        mockSessionManager as unknown as TrendingFeedSessionManager,
      );
  });

  it('lists Home, Explore, hidden Browser, Activity and Rewards by default', () => {
    const { result } = renderDefinitions();

    expect(result.current.tabs.map((tab) => tab.name)).toEqual([
      Routes.WALLET.HOME,
      Routes.TRENDING_VIEW,
      Routes.BROWSER.HOME,
      Routes.TRANSACTIONS_VIEW,
      Routes.REWARDS_VIEW,
    ]);
    expect(result.current.tabs[2]).toMatchObject({
      isHidden: true,
      freezeOnBlur: false,
    });
    expect(result.current.tabs[2].nativeIcon).toBeUndefined();
  });

  it('swaps in Money and Social when they are enabled', () => {
    const { result } = renderDefinitions({
      isMoneyAccountVisible: true,
      showSocialTab: true,
    });

    expect(result.current.tabs.map((tab) => tab.name)).toEqual([
      Routes.WALLET.HOME,
      Routes.TRENDING_VIEW,
      Routes.BROWSER.HOME,
      Routes.MONEY.ROOT,
      Routes.SOCIAL.TAB,
    ]);
  });

  it('keeps Explore selected while the hidden Browser tab is active', () => {
    const { result } = renderDefinitions();
    const explore = result.current.tabs[1];

    expect(explore.isSelected?.(Routes.BROWSER.HOME)).toBe(true);
    expect(explore.isSelected?.(Routes.WALLET_VIEW)).toBe(false);
  });

  it('tracks Wallet Opened when Home is pressed', () => {
    const { result } = renderDefinitions();

    result.current.tabs[0].onPress?.();

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WALLET_OPENED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ number_of_accounts: expect.any(Number) }),
    );
    expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'built' });
  });

  it('starts and ends the trending session around the Explore tab', () => {
    const { result } = renderDefinitions();
    const explore = result.current.tabs[1];

    explore.onPress?.();
    explore.onLeave?.();

    expect(mockSessionManager.enableAppStateListener).toHaveBeenCalledTimes(1);
    expect(mockSessionManager.startSession).toHaveBeenCalledWith('tab_press');
    expect(mockSessionManager.endSession).toHaveBeenCalledTimes(1);
    expect(mockSessionManager.disableAppStateListener).toHaveBeenCalledTimes(1);
  });

  it('routes the Money press through the registered tracker', () => {
    const trackMoneyTabPress = jest.fn();
    const { result } = renderDefinitions({
      isMoneyAccountVisible: true,
      trackMoneyTabPress,
    });

    result.current.tabs[3].onPress?.();

    expect(trackMoneyTabPress).toHaveBeenCalledTimes(1);
  });

  it('fires the Navigation Drawer event with the tab’s bottom nav name', () => {
    const { result } = renderDefinitions();

    result.current.trackBottomNavPress(TabBarIconKey.Trending);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.NAVIGATION_DRAWER,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      action: 'bottom_nav_clicked',
      name: 'explore',
    });
  });

  describe('native tab listeners', () => {
    it('plays the haptic, tracks, runs the press effect and pops Home to its root', () => {
      const { result } = renderDefinitions();
      const home = result.current.tabs[0];

      result.current
        .getNativeTabListeners(home)({ navigation: mockNavigation })
        .tabPress?.();

      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.TabChange);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NAVIGATION_DRAWER,
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.WALLET_OPENED,
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        screen: Routes.WALLET_VIEW,
      });
    });

    it('opens Activity with the bottom nav entry point', () => {
      const { result } = renderDefinitions();
      const activity = result.current.tabs[3];

      result.current
        .getNativeTabListeners(activity)({ navigation: mockNavigation })
        .tabPress?.();

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.TRANSACTIONS_VIEW,
        {
          screen: Routes.TRANSACTIONS_VIEW,
          params: { entryPoint: ActivityScreenEntryPoint.BottomNavClick },
        },
      );
    });

    it('sends Money through its onboarding-aware navigation', () => {
      const { result } = renderDefinitions({ isMoneyAccountVisible: true });
      const money = result.current.tabs[3];

      result.current
        .getNativeTabListeners(money)({ navigation: mockNavigation })
        .tabPress?.();

      expect(mockNavigateToMoneyHome).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('maps onLeave to the blur listener', () => {
      const { result } = renderDefinitions();
      const explore = result.current.tabs[1];
      const rewards = result.current.tabs[4];

      const exploreListeners = result.current.getNativeTabListeners(explore)({
        navigation: mockNavigation,
      });
      const rewardsListeners = result.current.getNativeTabListeners(rewards)({
        navigation: mockNavigation,
      });
      exploreListeners.blur?.();

      expect(mockSessionManager.endSession).toHaveBeenCalledTimes(1);
      expect(rewardsListeners.blur).toBeUndefined();
    });
  });
});
