import React, { useCallback, useMemo } from 'react';
import { View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconName } from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import { useMoneyNavigation } from '../../../UI/Money/hooks/useMoneyNavigation';
import { navigateToSocialTab } from '../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import TabBarFloatingItem from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingItem';
import { TAB_BAR_FLOATING_HORIZONTAL_INSET } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import { getTabBarFloatingBottomPadding } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.utils';
import AnimatedFooterShell from './AnimatedFooterShell';
import ContextualCollectiblesTabBar from './ContextualCollectiblesTabBar';
import ContextualHomeCircle from './ContextualHomeCircle';
import ContextualMoneyTabBar from './ContextualMoneyTabBar';
import { setActiveHomeTab } from './footerPresence';
import { getFooterTransitionId } from './footerMotion';
import TradeHubFooter, { type TradeFooterTab } from './TradeHubFooter';
import {
  enterCollectiblesSection,
  enterMoneySection,
  enterTradeDashboard,
  enterTradeExplore,
  enterTradingHub,
  exitContextualSection,
  useContextualNavState,
  type TradingHubTab,
} from './contextualSection';

export type FooterSetId = 'default' | 'trade' | 'money' | 'collectibles';

export const getFooterSetId = (section: string | null): FooterSetId => {
  if (section === 'trading') {
    return 'trade';
  }
  if (section === 'money') {
    return 'money';
  }
  if (section === 'collectibles') {
    return 'collectibles';
  }
  return 'default';
};

const OVERLAY_STYLE: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 60,
  elevation: 60,
};

interface DefaultTab {
  id: string;
  route: string;
  label: string;
  iconName: IconName;
  selectedIconName?: IconName;
}

const DEFAULT_TABS: DefaultTab[] = [
  {
    id: 'home',
    route: Routes.WALLET.HOME,
    label: strings('bottom_nav.home'),
    iconName: IconName.Home,
    selectedIconName: IconName.HomeFilled,
  },
  {
    id: 'trending',
    route: Routes.TRENDING_VIEW,
    label: strings('bottom_nav.trending'),
    iconName: IconName.TrendUp,
  },
  {
    id: 'trade',
    route: Routes.TRADE_DASHBOARD,
    label: strings('bottom_nav.trade'),
    iconName: IconName.Chart,
  },
  {
    id: 'collectibles',
    route: Routes.COLLECTIBLES_VIEW,
    label: 'Collectibles',
    iconName: IconName.Card,
  },
  {
    id: 'money',
    route: Routes.MONEY.ROOT,
    label: strings('bottom_nav.money'),
    iconName: IconName.Musd,
    selectedIconName: IconName.MusdFilled,
  },
  {
    id: 'social',
    route: Routes.SOCIAL.TAB,
    label: strings('bottom_nav.social'),
    iconName: IconName.People,
    selectedIconName: IconName.PeopleFilled,
  },
];

const HOME_TAB = DEFAULT_TABS[0];

export interface ContextualFooterProps {
  /** Route of the visible home tab. Used to mark the default footer. */
  homeRouteName?: string;
  /** Root stack route, so a pushed hub replaces instead of stacking. */
  rootRouteName?: string;
  onHeightChange?: (height: number) => void;
}

/**
 * The one footer pill. The default set keeps Home as its first tab.
 * Trade, Money, and Collectibles keep Home as a circle on the right.
 */
const ContextualFooter = ({
  homeRouteName,
  onHeightChange,
}: ContextualFooterProps) => {
  const { section, tab } = useContextualNavState();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const setId = getFooterSetId(section);
  const transitionId = getFooterTransitionId(section, tab);
  const homeSelected =
    setId === 'default' && homeRouteName === Routes.WALLET.HOME;
  const sectionHomeTestId =
    setId === 'trade'
      ? 'trade-hub-home-button'
      : setId === 'money'
        ? 'contextual-money-home-button'
        : 'contextual-collectibles-home-button';

  const stayOnTradeTab = useCallback(() => {
    setActiveHomeTab(Routes.TRADE_DASHBOARD);
    if (homeRouteName === Routes.TRADE_DASHBOARD) {
      return;
    }
    NavigationService.navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.TRADE_DASHBOARD,
    });
  }, [homeRouteName]);

  const goHome = useCallback(() => {
    setActiveHomeTab(Routes.WALLET.HOME);
    exitContextualSection();
    NavigationService.navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.WALLET.HOME,
      params: { screen: Routes.WALLET_VIEW },
    });
  }, []);

  const openHub = useCallback(
    (hub: TradingHubTab) => {
      stayOnTradeTab();
      enterTradingHub(hub);
    },
    [stayOnTradeTab],
  );

  const openExplore = useCallback(() => {
    stayOnTradeTab();
    enterTradeExplore();
  }, [stayOnTradeTab]);

  const pressDefault = useCallback(
    (item: DefaultTab) => {
      if (item.id === 'collectibles') {
        enterCollectiblesSection();
        return;
      }
      setActiveHomeTab(item.route);
      if (item.route === Routes.TRADE_DASHBOARD) {
        enterTradeDashboard();
        NavigationService.navigation.navigate(Routes.HOME_TABS, {
          screen: Routes.TRADE_DASHBOARD,
        });
        return;
      }
      exitContextualSection();
      if (item.route === Routes.MONEY.ROOT) {
        enterMoneySection();
        navigateToMoneyHome();
        return;
      }
      if (item.route === Routes.SOCIAL.TAB) {
        navigateToSocialTab(NavigationService.navigation.navigate, {
          source: 'nav_tab',
        });
        return;
      }
      if (item.route === Routes.WALLET.HOME) {
        goHome();
        return;
      }
      NavigationService.navigation.navigate(Routes.HOME_TABS, {
        screen: item.route,
      });
    },
    [goHome, navigateToMoneyHome],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onHeightChange?.(event.nativeEvent.layout.height);
    },
    [onHeightChange],
  );

  const tradeActive: TradeFooterTab =
    section === 'trading' &&
    (tab === 'explore' ||
      tab === 'swap' ||
      tab === 'perps' ||
      tab === 'predictions')
      ? tab
      : 'explore';

  const bottomPadding = getTabBarFloatingBottomPadding(bottomInset);
  const frameStyle = useMemo(
    () => [
      OVERLAY_STYLE,
      {
        paddingBottom: bottomPadding,
        paddingHorizontal: TAB_BAR_FLOATING_HORIZONTAL_INSET,
      },
    ],
    [bottomPadding],
  );

  const rest =
    setId === 'trade' ? (
      <TradeHubFooter
        itemsOnly
        active={tradeActive}
        onHomePress={goHome}
        onExplorePress={openExplore}
        onHubPress={openHub}
      />
    ) : setId === 'money' ? (
      <ContextualMoneyTabBar itemsOnly onHomePress={goHome} />
    ) : setId === 'collectibles' ? (
      <ContextualCollectiblesTabBar itemsOnly onHomePress={goHome} />
    ) : (
      <>
        {DEFAULT_TABS.filter((item) => item.id !== 'home').map((item) => {
          const selected = homeRouteName === item.route;
          return (
            <TabBarFloatingItem
              key={item.id}
              testID={`footer-tab-${item.id}`}
              iconName={
                selected && item.selectedIconName
                  ? item.selectedIconName
                  : item.iconName
              }
              label={item.label}
              isActive={selected}
              onPress={() => pressDefault(item)}
            />
          );
        })}
      </>
    );

  const home =
    setId === 'default' ? (
      <TabBarFloatingItem
        testID="footer-tab-home"
        iconName={homeSelected ? IconName.HomeFilled : IconName.Home}
        label={strings('bottom_nav.home')}
        isActive={homeSelected}
        onPress={() => pressDefault(HOME_TAB)}
      />
    ) : (
      <ContextualHomeCircle testID={sectionHomeTestId} onPress={goHome} />
    );

  return (
    <View
      style={frameStyle}
      pointerEvents="box-none"
      testID="contextual-footer"
      onLayout={handleLayout}
    >
      <AnimatedFooterShell
        transitionId={transitionId}
        homePlacement={setId === 'default' ? 'pill-start' : 'circle-end'}
        home={home}
        rest={rest}
      />
    </View>
  );
};

export default ContextualFooter;
