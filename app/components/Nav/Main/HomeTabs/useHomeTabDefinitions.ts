import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { NativeBottomTabNavigationProp } from '@react-navigation/bottom-tabs/unstable';
import type { ParamListBase } from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import {
  enterMoneySection,
  enterTradeDashboard,
  exitContextualSection,
  getContextualNavState,
} from '../contextualNav/contextualSection';
import { setActiveHomeTab } from '../contextualNav/footerPresence';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { buildBottomNavClickedProperties } from '../../../../core/Analytics/events/navigation';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { selectAccountsLength } from '../../../../selectors/accountTrackerController';
import { selectChainId } from '../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../util/networks';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import { TabBarIconKey } from '../../../../component-library/components/Navigation/TabBar/TabBar.types';
import { BOTTOM_NAV_NAME_BY_TAB_BAR_ICON_KEY } from '../../../../component-library/components/Navigation/TabBar/TabBar.constants';
import { useMoneyNavigation } from '../../../UI/Money/hooks/useMoneyNavigation';
import TrendingFeedSessionManager from '../../../UI/Trending/services/TrendingFeedSessionManager';
import { navigateToSocialTab } from '../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { NATIVE_TAB_ICONS } from './homeTabs.icons';
import { shouldHideRewardsTabBar } from './homeTabs.mappers';
import type { HomeTabDefinition } from './homeTabs.types';

export interface UseHomeTabDefinitionsParams {
  isMoneyAccountVisible: boolean;
  showSocialTab: boolean;
  isSocialV1Enabled: boolean;
  showSocialTabNewBadge: boolean;
  trackMoneyTabPress: () => void;
}

type NativeTabNavigation = NativeBottomTabNavigationProp<ParamListBase>;

const exitHomeFooterSection = (): void => {
  const section = getContextualNavState().section;
  if (
    section === 'money' ||
    section === 'explore' ||
    section === 'trading' ||
    section === 'collectibles'
  ) {
    exitContextualSection();
  }
};

interface NativeTabListeners {
  tabPress: () => void;
  blur?: () => void;
  focus?: () => void;
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
  isMoneyAccountVisible: _isMoneyAccountVisible,
  showSocialTab: _showSocialTab,
  isSocialV1Enabled,
  showSocialTabNewBadge,
  trackMoneyTabPress,
}: UseHomeTabDefinitionsParams): UseHomeTabDefinitionsResult => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { navigateToMoneyHome } = useMoneyNavigation();
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
        exitHomeFooterSection();
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
        exitHomeFooterSection();
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

    const trade: HomeTabDefinition = {
      key: 'trade',
      name: Routes.TRADE_DASHBOARD,
      iconKey: TabBarIconKey.Actions,
      rootScreenName: Routes.TRADE_DASHBOARD,
      nativeIcon: NATIVE_TAB_ICONS.trade,
      nativeSfSymbol: 'arrow.left.arrow.right',
      onPress: () => {
        enterTradeDashboard();
      },
    };

    const money: HomeTabDefinition = {
      key: 'money',
      name: Routes.MONEY.ROOT,
      iconKey: TabBarIconKey.Money,
      rootScreenName: Routes.MONEY.HOME,
      nativeIcon: NATIVE_TAB_ICONS.money,
      onPress: () => {
        enterMoneySection();
        trackMoneyTabPress();
      },
    };

    const rewards: HomeTabDefinition = {
      key: 'rewards',
      name: Routes.REWARDS_VIEW,
      iconKey: TabBarIconKey.Rewards,
      rootScreenName: Routes.REWARDS_VIEW,
      nativeIcon: NATIVE_TAB_ICONS.rewards,
      freezeOnBlur: false,
      isHidden: true,
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
      // UIKit selects a native tab before `tabPress`. Social V1 has to refuse
      // that selection so the profile gate can open onboarding instead.
      ...(isSocialV1Enabled ? { tabBarSelectionEnabled: false } : null),
    };

    return [home, explore, trade, browser, money, rewards, social];
  }, [
    accountsLength,
    chainId,
    createEventBuilder,
    isSocialV1Enabled,
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
          setActiveHomeTab(tab.name);
          trackBottomNavPress(tab.iconKey);
          tab.onPress?.();
          if (tab.key !== 'money' && tab.key !== 'trade') {
            exitHomeFooterSection();
          }
          // User taps on a selectable tab have already selected it. Social V1
          // opts out, so this listener is what selects that tab after the gate.
          switch (tab.rootScreenName) {
            case Routes.WALLET_VIEW:
              navigation.navigate(Routes.WALLET.HOME, {
                screen: Routes.WALLET_VIEW,
              });
              break;
            case Routes.MONEY.HOME:
              navigateToMoneyHome();
              break;
            case Routes.TRADE_DASHBOARD:
              navigation.navigate(Routes.TRADE_DASHBOARD);
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
        ...(tab.onLeave || tab.key === 'money' || tab.key === 'explore'
          ? {
              blur: () => {
                tab.onLeave?.();
                const section = getContextualNavState().section;
                if (
                  (tab.key === 'money' && section === 'money') ||
                  (tab.key === 'explore' && section === 'explore')
                ) {
                  exitContextualSection();
                }
              },
            }
          : null),
        ...(tab.key === 'money' || tab.key === 'trade'
          ? {
              // UIKit can select the tab without a JS tabPress. Focus still
              // records the section so the overlay footer updates on device.
              focus: () => {
                setActiveHomeTab(tab.name);
                if (tab.key === 'money') {
                  enterMoneySection();
                  return;
                }
                enterTradeDashboard();
              },
            }
          : null),
      }),
    [navigateToMoneyHome, trackBottomNavPress],
  );

  return { tabs, trackBottomNavPress, getNativeTabListeners };
};

export default useHomeTabDefinitions;
