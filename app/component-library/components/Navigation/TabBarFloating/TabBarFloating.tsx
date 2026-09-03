/* eslint-disable react/prop-types */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { GlassContainer } from 'expo-glass-effect';
import { useReducedMotion, useSharedValue } from 'react-native-reanimated';
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
import { useLiquidGlass } from '../../../../components/hooks/useLiquidGlass/useLiquidGlass';
import { TabBarProps } from '../TabBar/TabBar.types';
import { LABEL_BY_TAB_BAR_ICON_KEY } from '../TabBar/TabBar.constants';
import TabBarFloatingItem from './TabBarFloatingItem';
import TabBarFloatingHighlight, {
  TabBarFloatingHighlightGlass,
  useTabBarFloatingHighlight,
  type HighlightBox,
  type HighlightSlot,
} from './TabBarFloatingHighlight';
import TabBarFloatingSurface from './TabBarFloatingSurface';
import {
  FLOATING_FILLED_ICON_BY_TAB_BAR_ICON_KEY,
  FLOATING_ICON_BY_TAB_BAR_ICON_KEY,
  HIGHLIGHT_GLASS_STYLE,
  HIGHLIGHT_NAVIGATE_AFTER_SLIDE,
  HIGHLIGHT_NAVIGATE_FALLBACK_MS,
  TAB_BAR_FLOATING_GLASS_SPACING,
  TAB_BAR_FLOATING_INSET_REDUCTION,
  TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
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

type TabBarFloatingRoute = TabBarProps['state']['routes'][number];

const EMPTY_HIGHLIGHT_BOX: HighlightBox = { width: 0, top: 0, height: 0 };

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
}: TabBarFloatingProps) => {
  const tw = useTailwind();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { isGlassEnabled, glassColorScheme } = useLiquidGlass();

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

  // The search button is a circle matching the pill's height. Measured rather
  // than hardcoded so it tracks the pill's padding and font sizes.
  const [pillHeight, setPillHeight] = useState(0);

  const handlePillLayout = useCallback((event: LayoutChangeEvent) => {
    setPillHeight(Math.round(event.nativeEvent.layout.height));
  }, []);

  // Slot geometry and the target slot live in shared values, so a press only
  // has to write one number for the spring to start — no React render involved.
  const slots = useSharedValue<HighlightSlot[]>([]);
  // JS-side source of truth for `slots`. Reading a shared value from the JS
  // thread fetches the UI runtime's copy while writes to it are still queued,
  // so a read-modify-write here sees stale data: the four layout events of one
  // pass each spread an empty array and only the last tab survives.
  const slotsRef = useRef<HighlightSlot[]>([]);
  const targetIndex = useSharedValue(-1);
  // Finger down on any tab. The highlight lifts on this, before navigation.
  const isPressed = useSharedValue(false);
  // The resting box is a plain style, so it lives in state: changing it is a
  // re-render rather than a per-frame cost.
  const [highlightBox, setHighlightBox] =
    useState<HighlightBox>(EMPTY_HIGHLIGHT_BOX);

  // With sequencing on, a press parks its navigation here until the bubble
  // lands, so the destination's focus work never runs under the slide. The
  // fallback timer guarantees it runs even if a landing is never detected.
  const prefersReducedMotion = useReducedMotion();
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingNavigation = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    const pending = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    pending?.();
  }, []);

  useEffect(
    () => () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    },
    [],
  );

  const highlightMotion = useTabBarFloatingHighlight({
    slots,
    targetIndex,
    isPressed,
    onLand: flushPendingNavigation,
  });

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

  const handleItemLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, y, width, height } = event.nativeEvent.layout;
      // Selecting a tab re-measures the row, because the icon and label swap
      // variants. Skipping unchanged slots keeps those passes from waking the
      // highlight's reaction while a slide is in flight.
      const current = slotsRef.current[index];
      if (current?.x !== x || current?.width !== width) {
        // A fresh array each time, never a mutation: the shared value's setter
        // has to see a new reference to wake the highlight's reaction.
        const next = [...slotsRef.current];
        next[index] = { x, width };
        slotsRef.current = next;
        slots.set(next);
      }

      // Slots are `flex-1` siblings, so any one of them describes the resting
      // box. Returning `prev` unchanged lets React skip the re-render.
      setHighlightBox((prev) =>
        prev.width === width && prev.top === y && prev.height === height
          ? prev
          : { width, top: y, height },
      );
    },
    [slots],
  );

  // Places the highlight on first paint, and corrects it if a press was
  // refused by navigation.
  useEffect(() => {
    targetIndex.set(activeIndex);
  }, [activeIndex, targetIndex]);

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

      const navigate = () => {
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
          case Routes.SOCIAL_LEADERBOARD.TAB:
            navigation.navigate(Routes.SOCIAL_LEADERBOARD.TAB);
            break;
          case Routes.REWARDS_VIEW:
            navigation.navigate(Routes.REWARDS_VIEW);
            break;
        }
      };

      const onPress = () => {
        // Aim the highlight first: this write is all the spring needs, and
        // nothing below can hold it up.
        targetIndex.set(index);

        // Reduced motion snaps rather than slides, so there is no landing to
        // wait for.
        if (!HIGHLIGHT_NAVIGATE_AFTER_SLIDE || prefersReducedMotion) {
          navigate();
          return;
        }

        pendingNavigationRef.current = navigate;
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
        }
        fallbackTimerRef.current = setTimeout(
          flushPendingNavigation,
          HIGHLIGHT_NAVIGATE_FALLBACK_MS,
        );
      };

      return (
        <TabBarFloatingItem
          key={key}
          testID={key}
          iconName={icon}
          label={labelText}
          isActive={isSelected}
          onPress={onPress}
          onPressIn={() => isPressed.set(true)}
          onPressOut={() => isPressed.set(false)}
          onLayout={(event) => handleItemLayout(index, event)}
          motion={highlightMotion}
          slots={slots}
          index={index}
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
      handleItemLayout,
      targetIndex,
      isPressed,
      highlightMotion,
      slots,
      prefersReducedMotion,
      flushPendingNavigation,
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
      {/* Glass siblings only blend when they share a container, which is what
          lets the search button merge into the pill as they approach. */}
      <GlassContainer
        spacing={TAB_BAR_FLOATING_GLASS_SPACING}
        style={tw.style('flex-row items-center gap-3')}
      >
        {/* Three layers sharing one origin: material, highlight, items. The
            highlight is a sibling of the material, not its child — glass inside
            another glass view's content is clipped and does not blend with it,
            and the lifted highlight is meant to overflow the pill. The items row
            carries the padding the pill used to, so slot measurements are
            unchanged. */}
        <View
          style={tw.style('flex-1')}
          testID={TAB_BAR_FLOATING_TEST_IDS.PILL}
          onLayout={handlePillLayout}
        >
          <TabBarFloatingSurface
            twClassName="absolute inset-0 rounded-full"
            isGlassEnabled={isGlassEnabled}
            glassColorScheme={glassColorScheme}
            pointerEvents="none"
          />
          <TabBarFloatingHighlight
            motion={highlightMotion}
            box={highlightBox}
            isGlassEnabled={isGlassEnabled}
          />
          <View style={tw.style('flex-row items-center p-1')}>
            {state.routes.map((route: TabBarFloatingRoute, index: number) =>
              renderTabBarItem(route, index),
            )}
          </View>
        </View>
        <TabBarFloatingSurface
          twClassName="rounded-full"
          isGlassEnabled={isGlassEnabled}
          glassColorScheme={glassColorScheme}
        >
          <ButtonIcon
            iconName={IconName.Search}
            iconProps={{ color: IconColor.IconDefault }}
            size={ButtonIconSize.Lg}
            onPress={handleSearchPress}
            testID={TAB_BAR_FLOATING_TEST_IDS.SEARCH_BUTTON}
            accessibilityLabel={strings('wallet.search_accessibility_label')}
            // Transparent so the surface behind it supplies the fill, glass or
            // otherwise.
            twClassName={`rounded-full bg-transparent ${
              pillHeight
                ? `h-[${pillHeight}px] w-[${pillHeight}px]`
                : 'h-14 w-14'
            }`}
          />
        </TabBarFloatingSurface>
      </GlassContainer>
      {/* Optional native glass disc above the icons. Outside the container so
          it keeps its own rim instead of merging into the pill; its box mirrors
          the container's horizontal padding, so slot coordinates still hold. */}
      {isGlassEnabled && HIGHLIGHT_GLASS_STYLE !== 'none' ? (
        <View
          pointerEvents="none"
          style={tw.style('absolute left-4 right-4 top-0')}
        >
          <TabBarFloatingHighlightGlass
            motion={highlightMotion}
            box={highlightBox}
            glassColorScheme={glassColorScheme}
          />
        </View>
      ) : null}
    </View>
  );
};

export default TabBarFloating;
