/* eslint-disable react/prop-types */

import React, { useCallback, useEffect, useRef } from 'react';
import { LayoutChangeEvent, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';

import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { ActivityScreenEntryPoint } from '../../../../core/Analytics/events/activity';
import { useMoneyNavigation } from '../../../../components/UI/Money/hooks/useMoneyNavigation';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { trackExploreSearchOpened } from '../../../../components/Views/TrendingView/search/analytics';
import { TabBarProps } from '../TabBar/TabBar.types';
import { LABEL_BY_TAB_BAR_ICON_KEY } from '../TabBar/TabBar.constants';
import TabBarFloatingItem from './TabBarFloatingItem';
import TabBarFloatingSurface from './TabBarFloatingSurface';
import TabBarFloatingTradeButton from './TabBarFloatingTradeButton';
import { useBlurMaterial } from '../../../hooks/useBlurMaterial';
import {
  FLOATING_FILLED_ICON_BY_TAB_BAR_ICON_KEY,
  FLOATING_ICON_BY_TAB_BAR_ICON_KEY,
  TAB_BAR_FLOATING_GAP,
  TAB_BAR_FLOATING_HEIGHT,
  TAB_BAR_FLOATING_INSET_REDUCTION,
  TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
  TAB_BAR_FLOATING_TEST_IDS,
} from './TabBarFloating.constants';

/** What the circular button beside the pill does. */
export type TabBarFloatingTrailingAction = 'search' | 'trade';

export interface TabBarFloatingProps extends TabBarProps {
  /**
   * Measured height of the bar, so the navigator can pad tab scenes by the
   * amount the bar overlays. Reports 0 on unmount, which is how the hidden-bar
   * cases (browser, keyboard open) avoid leaving a dead gap.
   */
  onHeightChange?: (height: number) => void;
  /** `search` opens Explore search; `trade` opens the trade tray. */
  trailingAction?: TabBarFloatingTrailingAction;
}

type TabBarFloatingRoute = TabBarProps['state']['routes'][number];

/** Lays the pill and the search circle side by side. */
const ROW_STYLE: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: TAB_BAR_FLOATING_GAP,
};

/**
 * Treatment bottom navigation for the Header & NavBar refresh experiment
 * tabs sit in a floating rounded pill with a separate circular
 * search button alongside it, both over the content rather than on an opaque
 * bar. Control keeps `TabBar`; the navigator picks between them on the flag.
 */
const TabBarFloating = ({
  state,
  descriptors,
  navigation,
  onHeightChange,
  trailingAction = 'search',
}: TabBarFloatingProps) => {
  const tw = useTailwind();
  const { bottom: bottomInset } = useSafeAreaInsets();

  // Tightens the gap against iOS's generous home-indicator inset, but Android
  // reports much smaller insets (0 on some emulators), where subtracting alone
  // left the pill flush against the system navigation bar.
  const bottomPadding = Math.max(
    bottomInset - TAB_BAR_FLOATING_INSET_REDUCTION,
    TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
  );
  const { navigateToMoneyHome } = useMoneyNavigation();

  const lastReportedHeight = useRef<number>(0);
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      if (Math.abs(height - lastReportedHeight.current) > 2) {
        lastReportedHeight.current = height;
        onHeightChange?.(height);
      }
    },
    [onHeightChange],
  );

  useEffect(() => () => onHeightChange?.(0), [onHeightChange]);

  const { isBlurAvailable, colorScheme } = useBlurMaterial();

  const handleSearchPress = useCallback(() => {
    trackExploreSearchOpened('nav_bar');
    navigation.navigate(Routes.EXPLORE_SEARCH);
  }, [navigation]);

  // Tabs that stay mounted on blur (Explore) can only clean up via `onLeave`,
  // so the bar has to fire it — see the matching block in `TabBar`.
  const previousTabIndexRef = useRef<number>(state.index);

  const renderTabBarItem = useCallback(
    (route: TabBarFloatingRoute, index: number) => {
      const descriptor = descriptors[route.key];
      if (!descriptor) return null;
      const { options } = descriptor;
      if (options?.isHidden) return null;

      const tabBarIconKey = options.tabBarIconKey;
      // Same key scheme as `TabBar` so e2e selectors work across both arms.
      const key = `tab-bar-item-${tabBarIconKey}`;
      const isSelected = options?.isSelected
        ? options.isSelected(state.routeNames[state.index])
        : state.index === index;
      const baseIcon = FLOATING_ICON_BY_TAB_BAR_ICON_KEY[tabBarIconKey];
      const icon = isSelected
        ? (FLOATING_FILLED_ICON_BY_TAB_BAR_ICON_KEY[tabBarIconKey] ?? baseIcon)
        : baseIcon;
      if (!icon) return null;

      const labelKey = LABEL_BY_TAB_BAR_ICON_KEY[tabBarIconKey];
      const labelText = labelKey ? strings(labelKey) : '';

      const onPress = () => {
        if (previousTabIndexRef.current !== index) {
          const previousRoute = state.routes[previousTabIndexRef.current];
          descriptors[previousRoute?.key]?.options?.onLeave?.();
          previousTabIndexRef.current = index;
        }
        options.callback?.();
        switch (options.rootScreenName) {
          case Routes.WALLET_VIEW:
            navigation.navigate(Routes.WALLET.HOME, {
              screen: Routes.WALLET_VIEW,
            });
            break;
          case Routes.TRENDING_VIEW:
            navigation.navigate(Routes.TRENDING_VIEW);
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
            navigation.navigate(Routes.SOCIAL.TAB);
            break;
          case Routes.REWARDS_VIEW:
            navigation.navigate(Routes.REWARDS_VIEW);
            break;
        }
      };

      return (
        <TabBarFloatingItem
          key={key}
          testID={key}
          iconName={icon}
          label={labelText}
          isActive={isSelected}
          onPress={onPress}
        />
      );
    },
    [
      descriptors,
      state.routeNames,
      state.index,
      state.routes,
      navigation,
      navigateToMoneyHome,
    ],
  );

  return (
    <View
      style={[
        tw.style('absolute bottom-0 left-0 right-0 px-4'),
        { paddingBottom: bottomPadding },
      ]}
      testID={TAB_BAR_FLOATING_TEST_IDS.CONTAINER}
      onLayout={handleLayout}
    >
      <View style={ROW_STYLE}>
        <TabBarFloatingSurface
          isBlurAvailable={isBlurAvailable}
          colorScheme={colorScheme}
          twClassName="flex-1 flex-row items-center rounded-full p-1"
          style={{ height: TAB_BAR_FLOATING_HEIGHT }}
          testID={TAB_BAR_FLOATING_TEST_IDS.PILL}
        >
          {state.routes.map((route: TabBarFloatingRoute, index: number) =>
            renderTabBarItem(route, index),
          )}
        </TabBarFloatingSurface>
        <TabBarFloatingSurface
          isBlurAvailable={isBlurAvailable}
          colorScheme={colorScheme}
          twClassName="items-center justify-center rounded-full"
          style={{
            height: TAB_BAR_FLOATING_HEIGHT,
            width: TAB_BAR_FLOATING_HEIGHT,
          }}
        >
          {trailingAction === 'trade' ? (
            <TabBarFloatingTradeButton
              testID={TAB_BAR_FLOATING_TEST_IDS.TRADE_BUTTON}
            />
          ) : (
            <ButtonIcon
              iconName={IconName.Search}
              iconProps={{ color: IconColor.IconDefault }}
              size={ButtonIconSize.Md}
              onPress={handleSearchPress}
              testID={TAB_BAR_FLOATING_TEST_IDS.SEARCH_BUTTON}
              accessibilityLabel={strings('wallet.search_accessibility_label')}
              twClassName="h-full w-full rounded-full bg-transparent"
            />
          )}
        </TabBarFloatingSurface>
      </View>
    </View>
  );
};

export default TabBarFloating;
