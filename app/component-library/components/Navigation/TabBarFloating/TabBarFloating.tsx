/* eslint-disable react/prop-types */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { ActivityScreenEntryPoint } from '../../../../core/Analytics/events/activity';
import { useMoneyNavigation } from '../../../../components/UI/Money/hooks/useMoneyNavigation';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { trackExploreSearchOpened } from '../../../../components/Views/TrendingView/search/analytics';
import { TabBarProps } from '../TabBar/TabBar.types';
import { LABEL_BY_TAB_BAR_ICON_KEY } from '../TabBar/TabBar.constants';
import TabBarFloatingItem from './TabBarFloatingItem';
import {
  FLOATING_FILLED_ICON_BY_TAB_BAR_ICON_KEY,
  FLOATING_ICON_BY_TAB_BAR_ICON_KEY,
  TAB_BAR_FLOATING_TEST_IDS,
} from './TabBarFloating.constants';

const HIGHLIGHT_SPRING = { damping: 16, stiffness: 210, mass: 0.9 };
const HIGHLIGHT_STRETCH_TIMING = { duration: 120 };
const HIGHLIGHT_STRETCH_PER_SLOT = 0.18;
const HIGHLIGHT_MAX_STRETCH = 0.35;

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

  const isReducedMotion = useReducedMotion();
  const highlightX = useSharedValue(0);
  const highlightScaleX = useSharedValue(1);
  // Plain state, not a shared value: it belongs outside the animated style.
  const [highlightWidth, setHighlightWidth] = useState(0);
  const itemLayoutsRef = useRef<Record<number, { x: number; width: number }>>(
    {},
  );
  // First placement jumps; only later tab changes slide.
  const hasPlacedHighlightRef = useRef(false);
  const highlightTargetRef = useRef<number | null>(null);

  const activeIndex = useMemo(() => {
    const activeRouteName = state.routeNames[state.index];
    return state.routes.findIndex((route, index) => {
      const options = descriptors[route.key]?.options;
      if (!options || options.isHidden) return false;
      return options.isSelected
        ? options.isSelected(activeRouteName)
        : state.index === index;
    });
  }, [state.routes, state.routeNames, state.index, descriptors]);

  const placeHighlight = useCallback(
    (layout: { x: number; width: number } | undefined) => {
      if (!layout) return;
      setHighlightWidth(layout.width);
      // A tab switch asks for the same slot twice: once on press, then again
      // when navigation commits. Reassigning withTiming mid-flight restarts the
      // easing from wherever the highlight had reached, which shows as a hitch.
      if (highlightTargetRef.current === layout.x) return;
      const from = highlightTargetRef.current;
      highlightTargetRef.current = layout.x;
      const shouldAnimate = hasPlacedHighlightRef.current && !isReducedMotion;
      hasPlacedHighlightRef.current = true;

      if (!shouldAnimate) {
        highlightX.value = layout.x;
        return;
      }

      // Elongate toward the destination, then let the tail spring back, so the
      // bubble reads as pulled across rather than teleported. Longer hops
      // stretch further, up to a cap.
      const slotsTravelled =
        from === null || !layout.width
          ? 1
          : Math.abs(layout.x - from) / layout.width;
      const stretch =
        1 +
        Math.min(
          slotsTravelled * HIGHLIGHT_STRETCH_PER_SLOT,
          HIGHLIGHT_MAX_STRETCH,
        );

      highlightX.value = withSpring(layout.x, HIGHLIGHT_SPRING);
      highlightScaleX.value = withSequence(
        withTiming(stretch, HIGHLIGHT_STRETCH_TIMING),
        withSpring(1, HIGHLIGHT_SPRING),
      );
    },
    [highlightX, highlightScaleX, isReducedMotion],
  );

  const handleItemLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      itemLayoutsRef.current[index] = { x, width };
      if (index === activeIndex) placeHighlight({ x, width });
    },
    [activeIndex, placeHighlight],
  );

  useEffect(() => {
    placeHighlight(itemLayoutsRef.current[activeIndex]);
  }, [activeIndex, placeHighlight]);

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: highlightX.value },
      { scaleX: highlightScaleX.value },
    ],
  }));

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
        // Move first: navigating mounts the next tab's screen, which can hold
        // the JS thread long enough for a slide started afterwards to look
        // late. The activeIndex effect corrects this if navigation is refused.
        placeHighlight(itemLayoutsRef.current[index]);
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
          onLayout={(event) => handleItemLayout(index, event)}
        />
      );
    },
    [
      handleItemLayout,
      placeHighlight,
      descriptors,
      state.routeNames,
      state.index,
      navigation,
      navigateToMoneyHome,
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
          {/* One shared highlight, slid onto the active slot's measured box, so
              it travels between tabs instead of snapping. */}
          <Animated.View
            pointerEvents="none"
            style={[
              tw.style('absolute bottom-0 left-0 top-0 rounded-full bg-muted'),
              { width: highlightWidth },
              highlightStyle,
            ]}
            testID={TAB_BAR_FLOATING_TEST_IDS.HIGHLIGHT}
          />
          {state.routes.map((route, index) => renderTabBarItem(route, index))}
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
