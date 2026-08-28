/* eslint-disable react/prop-types */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';

import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { colorWithOpacity } from '../../../../util/colors';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { ActivityScreenEntryPoint } from '../../../../core/Analytics/events/activity';
import { getDecimalChainId } from '../../../../util/networks';
import { useAnalytics } from '../../../../components/hooks/useAnalytics/useAnalytics';
import { selectChainId } from '../../../../selectors/networkController';
import { useMoneyNavigation } from '../../../../components/UI/Money/hooks/useMoneyNavigation';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { trackExploreSearchOpened } from '../../../../components/Views/TrendingView/search/analytics';
import { TabBarProps, TabBarIconKey } from '../TabBar/TabBar.types';
import { LABEL_BY_TAB_BAR_ICON_KEY } from '../TabBar/TabBar.constants';
import TabBarFloatingItem from './TabBarFloatingItem';
import {
  FLOATING_FILLED_ICON_BY_TAB_BAR_ICON_KEY,
  FLOATING_ICON_BY_TAB_BAR_ICON_KEY,
  TAB_BAR_FLOATING_TEST_IDS,
} from './TabBarFloating.constants';

export interface TabBarFloatingProps extends TabBarProps {
  /**
   * Measured height of the bar, so the navigator can pad tab scenes by the
   * amount the bar overlays. Reports 0 on unmount, which is how the hidden-bar
   * cases (browser, keyboard open) avoid leaving a dead gap.
   */
  onHeightChange?: (height: number) => void;
}

/**
 * Treatment bottom navigation for the Header & NavBar refresh experiment
 * (TMCU-1276): tabs sit in a floating rounded pill with a separate circular
 * search button alongside it, both over the content rather than on an opaque
 * bar. Control keeps `TabBar`; the navigator picks between them on the flag.
 */
const TabBarFloating = ({
  state,
  descriptors,
  navigation,
  onHeightChange,
}: TabBarFloatingProps) => {
  const tw = useTailwind();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const chainId = useSelector(selectChainId);
  const { navigateToMoneyHome } = useMoneyNavigation();

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onHeightChange?.(event.nativeEvent.layout.height);
    },
    [onHeightChange],
  );

  useEffect(() => () => onHeightChange?.(0), [onHeightChange]);

  // The search button is a circle matching the pill's height. Measured rather
  // than hardcoded so it tracks the pill's padding and font sizes.
  const [pillHeight, setPillHeight] = useState(0);

  const handlePillLayout = useCallback((event: LayoutChangeEvent) => {
    setPillHeight(Math.round(event.nativeEvent.layout.height));
  }, []);

  const scrimColors = useMemo(() => {
    const background = tw.color('bg-default') ?? 'transparent';
    return [colorWithOpacity(background, 0), colorWithOpacity(background, 0.5)];
  }, [tw]);

  const handleSearchPress = useCallback(() => {
    trackExploreSearchOpened('nav_bar');
    navigation.navigate(Routes.EXPLORE_SEARCH);
  }, [navigation]);

  const renderTabBarItem = useCallback(
    (route: { name: string; key: string }, index: number) => {
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
          case Routes.SOCIAL_LEADERBOARD.TAB:
            navigation.navigate(Routes.SOCIAL_LEADERBOARD.TAB);
            break;
          case Routes.REWARDS_VIEW:
            navigation.navigate(Routes.REWARDS_VIEW);
            break;
          case Routes.MODAL.WALLET_ACTIONS:
            navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
              screen: Routes.MODAL.WALLET_ACTIONS,
            });
            trackEvent(
              createEventBuilder(MetaMetricsEvents.ACTIONS_BUTTON_CLICKED)
                .addProperties({
                  text: '',
                  chain_id: getDecimalChainId(chainId),
                })
                .build(),
            );
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
      navigation,
      navigateToMoneyHome,
      trackEvent,
      createEventBuilder,
      chainId,
    ],
  );

  return (
    <View
      style={tw.style(
        `absolute bottom-0 left-0 right-0 px-4 pb-[${bottomInset - 10}px]`,
      )}
      testID={TAB_BAR_FLOATING_TEST_IDS.CONTAINER}
      onLayout={handleLayout}
    >
      <LinearGradient
        pointerEvents="none"
        colors={scrimColors}
        style={tw.style('absolute -top-8 bottom-0 left-0 right-0')}
        testID={TAB_BAR_FLOATING_TEST_IDS.SCRIM}
      />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 rounded-full border border-muted bg-section px-0"
          testID={TAB_BAR_FLOATING_TEST_IDS.PILL}
          onLayout={handlePillLayout}
        >
          {state.routes.map(renderTabBarItem)}
        </Box>
        <ButtonIcon
          iconName={IconName.Search}
          iconProps={{ color: IconColor.IconDefault }}
          size={ButtonIconSize.Lg}
          onPress={handleSearchPress}
          testID={TAB_BAR_FLOATING_TEST_IDS.SEARCH_BUTTON}
          accessibilityLabel={strings('wallet.search_accessibility_label')}
          twClassName={`rounded-full border border-muted bg-section ${
            pillHeight ? `h-[${pillHeight}px] w-[${pillHeight}px]` : 'h-14 w-14'
          }`}
        />
      </Box>
    </View>
  );
};

export default TabBarFloating;
