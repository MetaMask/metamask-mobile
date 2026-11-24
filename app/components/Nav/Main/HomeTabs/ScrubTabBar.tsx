import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import BoxGlass from '../../../../component-library/components-temp/BoxGlass';
import {
  FLOATING_FILLED_ICON_BY_TAB_BAR_ICON_KEY,
  FLOATING_ICON_BY_TAB_BAR_ICON_KEY,
} from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import { LABEL_BY_TAB_BAR_ICON_KEY } from '../../../../component-library/components/Navigation/TabBar/TabBar.constants';
import type { TabBarProps } from '../../../../component-library/components/Navigation/TabBar/TabBar.types';
import { strings } from '../../../../../locales/i18n';
import {
  playImpact,
  playSelection,
  ImpactMoment,
} from '../../../../util/haptics';
import { useScrubTabMenus, type ScrubTabMenuItem } from './useScrubTabMenus';

const BAR_HEIGHT = 56;
// Pulls the tabs in from the screen edges, as in the Claude app.
const BAR_INSET = 24;
// Moves the icons down, borrowed from the safe-area gap, so the bar's height is unchanged.
const ICON_DROP = 4;
// A wide capsule, like the Claude app's tab highlight.
const HIGHLIGHT_WIDTH = 64;
const HIGHLIGHT_HEIGHT = 44;
const HIGHLIGHT_SHAPE: ViewStyle = {
  width: HIGHLIGHT_WIDTH,
  height: HIGHLIGHT_HEIGHT,
  top: (BAR_HEIGHT - HIGHLIGHT_HEIGHT) / 2,
  borderCurve: 'continuous',
};
const LONG_PRESS_MS = 450;
// Past this, a press is a scrub and can no longer open the menu.
const MOVE_SLOP = 8;
const TOOLTIP_WIDTH = 96;
const MENU_WIDTH = 240;
// Quick and settled, with no overshoot.
const MENU_SPRING = { damping: 18, stiffness: 260, mass: 0.8 };
const SLIDE_TIMING = { duration: 180, easing: Easing.out(Easing.cubic) };

/**
 * POC: a custom tab bar. Press shows the tab's name, sliding across scrubs
 * between tabs with a haptic tick, and a long press opens the tab's menu.
 */
const ScrubTabBar = ({ state, descriptors, navigation }: TabBarProps) => {
  const tw = useTailwind();
  const { bottom } = useSafeAreaInsets();
  const menus = useScrubTabMenus();

  const items = useMemo(
    () =>
      state.routes
        .filter((route) => !descriptors[route.key]?.options.isHidden)
        .map((route) => {
          const { options } = descriptors[route.key];
          return { route, iconKey: options.tabBarIconKey };
        }),
    [descriptors, state.routes],
  );
  const focusedIndex = items.findIndex(
    (item) => item.route.key === state.routes[state.index]?.key,
  );

  const [barWidth, setBarWidth] = useState(0);
  const [pressIndex, setPressIndex] = useState<number>();
  const [menuIndex, setMenuIndex] = useState<number>();
  const pressIndexRef = useRef<number | undefined>(undefined);
  const hasMovedRef = useRef(false);
  const hasOpenedMenuRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const itemWidth = items.length ? barWidth / items.length : 0;
  const indexAt = useCallback(
    (x: number) =>
      itemWidth
        ? Math.min(Math.max(Math.floor(x / itemWidth), 0), items.length - 1)
        : 0,
    [itemWidth, items.length],
  );

  const goTo = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) {
        return;
      }
      const event = navigation.emit({
        type: 'tabPress',
        target: item.route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        navigation.navigate(item.route.name);
      }
    },
    [items, navigation],
  );

  // No tabPress event: the menu item that follows is the real action.
  const switchTo = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        navigation.navigate(item.route.name);
      }
    },
    [items, navigation],
  );

  const setPress = useCallback((index: number | undefined) => {
    pressIndexRef.current = index;
    setPressIndex(index);
  }, []);

  const onStart = useCallback(
    (x: number) => {
      const index = indexAt(x);
      hasMovedRef.current = false;
      hasOpenedMenuRef.current = false;
      setPress(index);
      void playSelection();
      const iconKey = items[index]?.iconKey;
      const menu = iconKey === undefined ? undefined : menus[iconKey];
      // Tabs with no menu act on release.
      if (!menu) {
        return;
      }
      longPressTimerRef.current = setTimeout(() => {
        if (hasMovedRef.current) {
          return;
        }
        hasOpenedMenuRef.current = true;
        void playImpact(ImpactMoment.TabChange);
        setPress(undefined);
        if (typeof menu === 'function') {
          menu();
        } else {
          setMenuIndex(index);
        }
      }, LONG_PRESS_MS);
    },
    [indexAt, items, menus, setPress],
  );

  const onMove = useCallback(
    (x: number, translationX: number) => {
      if (hasOpenedMenuRef.current) {
        return;
      }
      if (Math.abs(translationX) > MOVE_SLOP) {
        hasMovedRef.current = true;
        clearTimeout(longPressTimerRef.current);
      }
      const index = indexAt(x);
      if (index !== pressIndexRef.current) {
        setPress(index);
        void playSelection();
        // Scrubbing switches tabs live.
        goTo(index);
      }
    },
    [goTo, indexAt, setPress],
  );

  const onEnd = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
    if (hasOpenedMenuRef.current) {
      return;
    }
    const index = pressIndexRef.current;
    setPress(undefined);
    if (index === undefined) {
      return;
    }
    if (index !== focusedIndex || !hasMovedRef.current) {
      goTo(index);
    }
  }, [focusedIndex, goTo, setPress]);

  useEffect(() => () => clearTimeout(longPressTimerRef.current), []);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .runOnJS(true)
        .onBegin((event) => onStart(event.x))
        .onUpdate((event) => onMove(event.x, event.translationX))
        .onFinalize(onEnd),
    [onEnd, onMove, onStart],
  );

  // The capsule follows the finger, then the open menu's tab, then the current tab.
  const shownIndex = pressIndex ?? menuIndex ?? focusedIndex;
  const highlightX = useSharedValue(0);
  const tooltipX = useSharedValue(0);
  const tooltipVisible = useSharedValue(0);

  useEffect(() => {
    if (!itemWidth || shownIndex < 0) {
      return;
    }
    const center = itemWidth * shownIndex + itemWidth / 2;
    highlightX.value = withTiming(center - HIGHLIGHT_WIDTH / 2, SLIDE_TIMING);
    tooltipX.value = withTiming(center - TOOLTIP_WIDTH / 2, SLIDE_TIMING);
  }, [highlightX, itemWidth, shownIndex, tooltipX]);

  useEffect(() => {
    tooltipVisible.value = withTiming(pressIndex === undefined ? 0 : 1, {
      duration: 120,
    });
  }, [pressIndex, tooltipVisible]);

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: highlightX.value }],
  }));
  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: tooltipVisible.value,
    transform: [
      { translateX: tooltipX.value },
      { scale: 0.9 + tooltipVisible.value * 0.1 },
    ],
  }));

  const menuItems = useMemo<ScrubTabMenuItem[]>(() => {
    const iconKey =
      menuIndex === undefined ? undefined : items[menuIndex]?.iconKey;
    const menu = iconKey === undefined ? undefined : menus[iconKey];
    return Array.isArray(menu) ? menu : [];
  }, [items, menuIndex, menus]);

  const closeMenu = useCallback(() => setMenuIndex(undefined), []);
  const menuLeft =
    menuIndex === undefined
      ? 0
      : Math.min(
          Math.max(
            BAR_INSET + itemWidth * menuIndex + itemWidth / 2 - MENU_WIDTH / 2,
            16,
          ),
          barWidth + BAR_INSET * 2 - MENU_WIDTH - 16,
        );

  const isMenuOpen = menuItems.length > 0;
  // Grows out of the long-pressed tab: bottom edge, at the tab's centre.
  const menuOriginX =
    menuIndex === undefined
      ? MENU_WIDTH / 2
      : BAR_INSET + itemWidth * menuIndex + itemWidth / 2 - menuLeft;
  const menuProgress = useSharedValue(0);
  useEffect(() => {
    menuProgress.value = isMenuOpen ? withSpring(1, MENU_SPRING) : 0;
  }, [isMenuOpen, menuProgress]);
  const menuStyle = useAnimatedStyle(() => ({
    // Scale only: glass drawn at partial opacity renders washed out.
    transform: [{ scale: 0.15 + 0.85 * menuProgress.value }],
  }));

  const pressLabelKey =
    pressIndex === undefined ? undefined : items[pressIndex]?.iconKey;

  return (
    <View
      style={[
        tw.style('bg-default'),
        {
          paddingTop: ICON_DROP,
          paddingBottom: Math.max(bottom - ICON_DROP, 0),
          paddingHorizontal: BAR_INSET,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          tw.style(
            'absolute -top-10 items-center rounded-full bg-icon-default py-1.5',
          ),
          { left: BAR_INSET, width: TOOLTIP_WIDTH },
          tooltipStyle,
        ]}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          twClassName="text-background-default"
        >
          {pressLabelKey === undefined
            ? ''
            : strings(LABEL_BY_TAB_BAR_ICON_KEY[pressLabelKey])}
        </Text>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <View
          style={{ height: BAR_HEIGHT }}
          onLayout={(event: LayoutChangeEvent) =>
            setBarWidth(event.nativeEvent.layout.width)
          }
        >
          {shownIndex >= 0 ? (
            <Animated.View
              style={[
                tw.style('absolute rounded-full bg-muted'),
                HIGHLIGHT_SHAPE,
                highlightStyle,
              ]}
            />
          ) : null}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="flex-1"
          >
            {items.map((item, index) => {
              // The current tab's icon stays lit while the capsule is elsewhere.
              const isShown = index === shownIndex || index === focusedIndex;
              const filledIconName = isShown
                ? FLOATING_FILLED_ICON_BY_TAB_BAR_ICON_KEY[item.iconKey]
                : undefined;
              const iconName =
                filledIconName ??
                FLOATING_ICON_BY_TAB_BAR_ICON_KEY[item.iconKey] ??
                IconName.Add;
              return (
                <Box
                  key={item.route.key}
                  alignItems={BoxAlignItems.Center}
                  twClassName="flex-1"
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={strings(
                    LABEL_BY_TAB_BAR_ICON_KEY[item.iconKey],
                  )}
                  accessibilityState={{ selected: index === focusedIndex }}
                >
                  <Icon
                    name={iconName}
                    size={IconSize.Lg}
                    color={
                      isShown
                        ? IconColor.IconDefault
                        : IconColor.IconAlternative
                    }
                  />
                </Box>
              );
            })}
          </Box>
        </View>
      </GestureDetector>

      <Modal
        visible={isMenuOpen}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <Pressable style={tw.style('flex-1')} onPress={closeMenu}>
          <Animated.View
            style={[
              tw.style('absolute'),
              {
                left: menuLeft,
                bottom: bottom + BAR_HEIGHT + 12 - ICON_DROP,
                width: MENU_WIDTH,
                transformOrigin: [menuOriginX, '100%', 0],
              },
              menuStyle,
            ]}
          >
            <BoxGlass radiusClassName="rounded-2xl" style={tw.style('py-2')}>
              {menuItems.map((menuItem) => (
                <Pressable
                  key={menuItem.label}
                  onPress={() => {
                    const tabIndex = menuIndex;
                    closeMenu();
                    // Choosing an item commits to its tab, unless the item opens it itself.
                    if (
                      !menuItem.opensTab &&
                      tabIndex !== undefined &&
                      tabIndex !== focusedIndex
                    ) {
                      switchTo(tabIndex);
                    }
                    menuItem.onPress();
                  }}
                  style={({ pressed }) =>
                    tw.style('px-4 py-3', pressed && 'bg-pressed')
                  }
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={3}
                  >
                    <Icon
                      name={menuItem.iconName}
                      size={IconSize.Md}
                      color={IconColor.IconDefault}
                    />
                    <Text variant={TextVariant.BodyMd}>{menuItem.label}</Text>
                  </Box>
                </Pressable>
              ))}
            </BoxGlass>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default ScrubTabBar;
