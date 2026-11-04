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
import ContextualMoneyTabBar from './ContextualMoneyTabBar';
import { setActiveHomeTab } from './footerPresence';
import { getFooterTransitionId } from './footerMotion';
import TradeHubFooter from './TradeHubFooter';
import {
  enterCollectiblesSection,
  enterMoneySection,
  enterTradeDashboard,
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
    iconName: IconName.SwapVertical,
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

export interface ContextualFooterProps {
  /** Route of the visible home tab. Used to mark the default footer. */
  homeRouteName?: string;
  /** Root stack route, so a pushed hub replaces instead of stacking. */
  rootRouteName?: string;
  onHeightChange?: (height: number) => void;
}

/**
 * The one footer pill. Default, Trade, Money, and Collectibles are sets of
 * the same bar, so a set change can collapse and expand in place.
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
  const homeTestId =
    setId === 'trade'
      ? 'trade-hub-tab-home'
      : setId === 'money'
        ? 'contextual-money-tab-home'
        : setId === 'collectibles'
          ? 'contextual-collectibles-tab-home'
          : 'footer-tab-home';

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

  const openCollectibles = useCallback(() => {
    stayOnTradeTab();
    enterCollectiblesSection();
  }, [stayOnTradeTab]);

  const pressDefault = useCallback(
    (item: DefaultTab) => {
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

  const tradeActive: TradingHubTab | null =
    section === 'trading' &&
    (tab === 'swap' || tab === 'perps' || tab === 'predictions')
      ? tab
      : null;

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
        omitHome
        active={tradeActive}
        onHomePress={goHome}
        onHubPress={openHub}
        onCollectiblesPress={openCollectibles}
      />
    ) : setId === 'money' ? (
      <ContextualMoneyTabBar omitHome onHomePress={goHome} />
    ) : setId === 'collectibles' ? (
      <ContextualCollectiblesTabBar omitHome onHomePress={goHome} />
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

  return (
    <View
      style={frameStyle}
      pointerEvents="box-none"
      testID="contextual-footer"
      onLayout={handleLayout}
    >
      <AnimatedFooterShell
        transitionId={transitionId}
        home={
          <TabBarFloatingItem
            testID={homeTestId}
            iconName={homeSelected ? IconName.HomeFilled : IconName.Home}
            label={strings('bottom_nav.home')}
            isActive={homeSelected}
            fullContrast={setId !== 'default'}
            onPress={
              setId === 'default'
                ? () =>
                    pressDefault(
                      DEFAULT_TABS.find((item) => item.id === 'home') ??
                        DEFAULT_TABS[0],
                    )
                : goHome
            }
          />
        }
        rest={rest}
      />
    </View>
  );
};

export default ContextualFooter;
