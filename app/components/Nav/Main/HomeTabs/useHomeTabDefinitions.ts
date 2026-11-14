import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { NativeBottomTabNavigationProp } from '@react-navigation/bottom-tabs/unstable';
import type { ParamListBase } from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { ActivityScreenEntryPoint } from '../../../../core/Analytics/events/activity';
import { buildBottomNavClickedProperties } from '../../../../core/Analytics/events/navigation';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { selectAccountsLength } from '../../../../selectors/accountTrackerController';
import { selectChainId } from '../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../util/networks';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import { TabBarIconKey } from '../../../../component-library/components/Navigation/TabBar/TabBar.types';
import { BOTTOM_NAV_NAME_BY_TAB_BAR_ICON_KEY } from '../../../../component-library/components/Navigation/TabBar/TabBar.constants';
import { useMoneyHomeNavigation } from '../../../UI/Money/hooks/useMoneyHomeNavigation';
import TrendingFeedSessionManager from '../../../UI/Trending/services/TrendingFeedSessionManager';
import { navigateToSocialTab } from '../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { SocialEvent } from '../../../Views/SocialLeaderboard/analytics/socialEvents';
import { NATIVE_TAB_ICONS } from './homeTabs.icons';
import { shouldHideRewardsTabBar } from './homeTabs.mappers';
import type { HomeTabDefinition } from './homeTabs.types';

export interface UseHomeTabDefinitionsParams {
  isMoneyAccountVisible: boolean;
  showSocialTab: boolean;
  isSocialV1Enabled: boolean;
  canOpenSocialTabDirectly: boolean;
  showSocialTabNewBadge: boolean;
  trackMoneyTabPress: () => void;
}

type NativeTabNavigation = NativeBottomTabNavigationProp<ParamListBase>;

interface NativeTabListeners {
  tabPress: () => void;
  blur?: () => void;
}

export interface UseHomeTabDefinitionsResult {
  tabs: HomeTabDefinition[];
  trackBottomNavPress: (iconKey: TabBarIconKey) => void;
  getNativeTabListeners: (
    tab: HomeTabDefinition,
  ) => (props: { navigation: NativeTabNavigation }) => NativeTabListeners;
}

/** The single tab list both navigators render from, analytics attached once. */
export const useHomeTabDefinitions = ({
  isMoneyAccountVisible,
  showSocialTab,
  isSocialV1Enabled,
  canOpenSocialTabDirectly,
  showSocialTabNewBadge,
  trackMoneyTabPress,
}: UseHomeTabDefinitionsParams): UseHomeTabDefinitionsResult => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { navigateToMoneyHome } = useMoneyHomeNavigation();
  const accountsLength = useSelector(selectAccountsLength);
  const chainId = useSelector(selectChainId);

  const trackBottomNavPress = useCallback(
    (iconKey: TabBarIconKey) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NAVIGATION_DRAWER)
          .addProperties(
            buildBottomNavClickedProperties(
              BOTTOM_NAV_NAME_BY_TAB_BAR_ICON_KEY[iconKey],
            ),
          )
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const tabs = useMemo<HomeTabDefinition[]>(() => {
    const home: HomeTabDefinition = {
      key: 'home',
      name: Routes.WALLET.HOME,
      iconKey: TabBarIconKey.Wallet,
      rootScreenName: Routes.WALLET_VIEW,
      nativeIcon: NATIVE_TAB_ICONS.home,
      onPress: () => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.WALLET_OPENED)
            .addProperties({
              number_of_accounts: accountsLength,
              chain_id: getDecimalChainId(chainId),
            })
            .build(),
        );
      },
    };

    const explore: HomeTabDefinition = {
      key: 'explore',
      name: Routes.TRENDING_VIEW,
      iconKey: TabBarIconKey.Trending,
      rootScreenName: Routes.TRENDING_VIEW,
      nativeIcon: NATIVE_TAB_ICONS.explore,
      // Explore stays highlighted while the hidden Browser tab is active.
      isSelected: (rootScreenName) =>
        rootScreenName === Routes.TRENDING_VIEW ||
        rootScreenName === Routes.BROWSER.HOME,
      onPress: () => {
        TrendingFeedSessionManager.getInstance().enableAppStateListener();
        TrendingFeedSessionManager.getInstance().startSession('tab_press');
      },
      onLeave: () => {
        // Explore stays mounted, so its session ends here; the AppState
        // listener is paused to avoid phantom sessions from other tabs.
        TrendingFeedSessionManager.getInstance().endSession();
        TrendingFeedSessionManager.getInstance().disableAppStateListener();
      },
    };

    // Never in the bar; the native path reaches it via the root stack.
    const browser: HomeTabDefinition = {
      key: 'browser',
      name: Routes.BROWSER.HOME,
      iconKey: TabBarIconKey.Browser,
      rootScreenName: Routes.BROWSER_VIEW,
      isHidden: true,
      // Required with `withUnmountOnTabBlur`: freezing blocks the unmount.
      freezeOnBlur: false,
    };

    const activity: HomeTabDefinition = {
      key: 'activity',
      name: Routes.TRANSACTIONS_VIEW,
      iconKey: TabBarIconKey.Activity,
      rootScreenName: Routes.TRANSACTIONS_VIEW,
      nativeIcon: NATIVE_TAB_ICONS.activity,
      freezeOnBlur: false,
    };

    const money: HomeTabDefinition = {
      key: 'money',
      name: Routes.MONEY.ROOT,
      iconKey: TabBarIconKey.Money,
      rootScreenName: Routes.MONEY.HOME,
      nativeIcon: NATIVE_TAB_ICONS.money,
      onPress: trackMoneyTabPress,
    };

    const rewards: HomeTabDefinition = {
      key: 'rewards',
      name: Routes.REWARDS_VIEW,
      iconKey: TabBarIconKey.Rewards,
      rootScreenName: Routes.REWARDS_VIEW,
      nativeIcon: NATIVE_TAB_ICONS.rewards,
      freezeOnBlur: false,
      hidesTabBarFor: shouldHideRewardsTabBar,
    };

    const social: HomeTabDefinition = {
      key: 'social',
      name: Routes.SOCIAL.TAB,
      iconKey: TabBarIconKey.Social,
      rootScreenName: Routes.SOCIAL.TAB,
      nativeIcon: NATIVE_TAB_ICONS.social,
      freezeOnBlur: false,
      showNewBadge: showSocialTabNewBadge,
      // UIKit selects a native tab before `tabPress`. Social V1 refuses that
      // selection only while a gate has to open instead, because a refused tap
      // makes the Liquid Glass highlight slide there, back, and there again.
      ...(isSocialV1Enabled && !canOpenSocialTabDirectly
        ? { tabBarSelectionEnabled: false }
        : null),
      ...(isSocialV1Enabled
        ? { initialParams: { source: SocialEvent.Source.NAV_TAB } }
        : null),
    };

    if (isSocialV1Enabled) {
      return [
        home,
        explore,
        browser,
        isMoneyAccountVisible ? money : activity,
        social,
      ];
    }

    return [
      home,
      explore,
      browser,
      isMoneyAccountVisible ? money : activity,
      ...(showSocialTab ? [social] : [rewards]),
    ];
  }, [
    accountsLength,
    canOpenSocialTabDirectly,
    chainId,
    createEventBuilder,
    isMoneyAccountVisible,
    isSocialV1Enabled,
    showSocialTab,
    showSocialTabNewBadge,
    trackEvent,
    trackMoneyTabPress,
  ]);

  const getNativeTabListeners = useCallback(
    (tab: HomeTabDefinition) =>
      ({
        navigation,
      }: {
        navigation: NativeTabNavigation;
      }): NativeTabListeners => ({
        tabPress: () => {
          playImpact(ImpactMoment.TabChange);
          trackBottomNavPress(tab.iconKey);
          tab.onPress?.();
          // User taps on a selectable tab have already selected it. Social V1
          // opts out, so this listener is what selects that tab after the gate.
          switch (tab.rootScreenName) {
            case Routes.WALLET_VIEW:
              navigation.navigate(Routes.WALLET.HOME);
              break;
            case Routes.TRANSACTIONS_VIEW:
              navigation.navigate(Routes.TRANSACTIONS_VIEW, {
                screen: Routes.TRANSACTIONS_VIEW,
                params: { entryPoint: ActivityScreenEntryPoint.BottomNavClick },
              });
              break;
            case Routes.MONEY.HOME:
              navigateToMoneyHome();
              break;
            case Routes.SOCIAL.TAB:
              navigateToSocialTab(navigation.navigate, {
                source: 'nav_tab',
              });
              break;
            default:
              break;
          }
        },
        ...(tab.onLeave || tab.initialParams
          ? {
              blur: () => {
                tab.onLeave?.();
                // A native tab tap re-sends the tab's current params after
                // `tabPress`, so restore the tap defaults once another tab
                // is selected.
                if (!tab.initialParams) {
                  return;
                }
                const state = navigation.getState();
                if (state.routes[state.index]?.name !== tab.name) {
                  navigation.setParams(tab.initialParams);
                }
              },
            }
          : null),
      }),
    [navigateToMoneyHome, trackBottomNavPress],
  );

  return { tabs, trackBottomNavPress, getNativeTabListeners };
};

export default useHomeTabDefinitions;
