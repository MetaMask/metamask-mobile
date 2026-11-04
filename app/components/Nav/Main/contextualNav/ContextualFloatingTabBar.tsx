import React, { useCallback, useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimationDuration } from '@metamask/design-tokens';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ButtonAnimated,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import TabBarFloatingItem from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingItem';
import TabBarFloatingSurface from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingSurface';
import { useBlurMaterial } from '../../../../component-library/hooks/useBlurMaterial';
import {
  TAB_BAR_FLOATING_GAP,
  TAB_BAR_FLOATING_HEIGHT,
  TAB_BAR_FLOATING_HORIZONTAL_INSET,
  TAB_BAR_FLOATING_ICON_DIMENSION,
  TAB_BAR_FLOATING_ICON_SIZE,
  TAB_BAR_FLOATING_LABEL_FONT_SIZE,
  TAB_BAR_FLOATING_LABEL_LINE_HEIGHT,
} from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import { getTabBarFloatingBottomPadding } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.utils';
import type { ContextualTab } from './contextualSection';

export interface ContextualFloatingTab<T extends string = ContextualTab> {
  id: T;
  label: string;
  iconName: IconName;
}

export interface ContextualFloatingTabBarProps<
  T extends string = ContextualTab,
> {
  tabs: ContextualFloatingTab<T>[];
  activeTab: T;
  onTabPress: (tab: T) => void;
  onHomePress: () => void;
  testIDPrefix: string;
  /**
   * Round button. Home is the + menu sections. Search is Money and Explore.
   * Defaults to Home so existing sections stay unchanged.
   */
  circleAction?: 'home' | 'search';
  /** True when Search is the active Money destination. */
  searchSelected?: boolean;
  onSearchPress?: () => void;
  /** In-place fade. Off for the + menu sections, which already slide. */
  fadeIn?: boolean;
  onHeightChange?: (height: number) => void;
}

/**
 * Extends the 62pt circle past 44pt / 48dp. The circle already clears both
 * floors; the slop keeps a short miss on the rim.
 */
const CIRCLE_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

const ROW_STYLE: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: TAB_BAR_FLOATING_GAP,
};

const OVERLAY_STYLE: ViewStyle = {
  zIndex: 50,
  elevation: 50,
};

const PILL_STYLE: ViewStyle = { height: TAB_BAR_FLOATING_HEIGHT };

const CIRCLE_STYLE: ViewStyle = {
  height: TAB_BAR_FLOATING_HEIGHT,
  width: TAB_BAR_FLOATING_HEIGHT,
};

/**
 * Section footer. Same surface, item, and circle as the home floating bar.
 */
const ContextualFloatingTabBar = <T extends string>({
  tabs,
  activeTab,
  onTabPress,
  onHomePress,
  testIDPrefix,
  circleAction = 'home',
  searchSelected = false,
  onSearchPress,
  fadeIn = false,
  onHeightChange,
}: ContextualFloatingTabBarProps<T>) => {
  const tw = useTailwind();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { isBlurAvailable, colorScheme } = useBlurMaterial();
  const [isKeyboardHidden, setIsKeyboardHidden] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardHidden(false);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardHidden(true);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleTabPress = useCallback(
    (nextTab: T) => {
      playImpact(ImpactMoment.TabChange);
      onTabPress(nextTab);
    },
    [onTabPress],
  );

  const handleHomePress = useCallback(() => {
    playImpact(ImpactMoment.TabChange);
    onHomePress();
  }, [onHomePress]);

  const handleSearchPress = useCallback(() => {
    playImpact(ImpactMoment.TabChange);
    onSearchPress?.();
  }, [onSearchPress]);

  const handleFrameLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onHeightChange?.(event.nativeEvent.layout.height);
    },
    [onHeightChange],
  );

  useEffect(() => {
    if (!isKeyboardHidden) {
      onHeightChange?.(0);
    }
  }, [isKeyboardHidden, onHeightChange]);

  if (!isKeyboardHidden) {
    return null;
  }

  const bottomPadding = getTabBarFloatingBottomPadding(bottomInset);
  const frameStyle = [
    tw.style('absolute bottom-0 left-0 right-0'),
    OVERLAY_STYLE,
    {
      paddingBottom: bottomPadding,
      paddingHorizontal: TAB_BAR_FLOATING_HORIZONTAL_INSET,
    },
  ];
  const motion = fadeIn
    ? FadeIn.duration(AnimationDuration.Fast).reduceMotion(ReduceMotion.System)
    : undefined;
  const row = (
    <View style={ROW_STYLE} pointerEvents="box-none">
      <TabBarFloatingSurface
        isBlurAvailable={isBlurAvailable}
        colorScheme={colorScheme}
        twClassName="flex-1 flex-row items-center rounded-full p-1"
        style={PILL_STYLE}
        testID={`${testIDPrefix}-tab-pill`}
      >
        {tabs.map((item) => (
          <TabBarFloatingItem
            key={item.id}
            testID={`${testIDPrefix}-tab-${item.id}`}
            iconName={item.iconName}
            label={item.label}
            isActive={activeTab === item.id}
            fullContrast
            onPress={() => handleTabPress(item.id)}
          />
        ))}
      </TabBarFloatingSurface>
      <TabBarFloatingSurface
        isBlurAvailable={isBlurAvailable}
        colorScheme={colorScheme}
        twClassName="items-center justify-center rounded-full"
        style={CIRCLE_STYLE}
      >
        {circleAction === 'search' ? (
          <ButtonAnimated
            onPress={handleSearchPress}
            onLongPress={handleHomePress}
            hitSlop={CIRCLE_HIT_SLOP}
            style={tw.style(
              'h-full w-full items-center justify-center rounded-full',
              searchSelected ? 'bg-alternative' : 'bg-transparent',
            )}
            testID={`${testIDPrefix}-search-button`}
            accessibilityLabel={strings('wallet.search_accessibility_label')}
            accessibilityHint="Long press to return to Home"
            accessibilityRole="button"
            accessibilityState={{ selected: searchSelected }}
            accessible
          >
            <Icon
              name={IconName.Search}
              size={TAB_BAR_FLOATING_ICON_SIZE}
              color={IconColor.IconDefault}
              style={{
                width: TAB_BAR_FLOATING_ICON_DIMENSION,
                height: TAB_BAR_FLOATING_ICON_DIMENSION,
              }}
            />
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={
                searchSelected ? FontWeight.Medium : FontWeight.Regular
              }
              color={TextColor.TextDefault}
              numberOfLines={1}
              twClassName="mt-0.5 text-center"
              style={{
                fontSize: TAB_BAR_FLOATING_LABEL_FONT_SIZE,
                lineHeight: TAB_BAR_FLOATING_LABEL_LINE_HEIGHT,
              }}
              maxFontSizeMultiplier={1}
            >
              {strings('wallet.search_accessibility_label')}
            </Text>
          </ButtonAnimated>
        ) : (
          <ButtonAnimated
            onPress={handleHomePress}
            hitSlop={CIRCLE_HIT_SLOP}
            style={tw.style(
              'h-full w-full items-center justify-center rounded-full bg-transparent',
            )}
            testID={`${testIDPrefix}-home-button`}
            accessibilityLabel={strings('bottom_nav.home')}
            accessibilityRole="button"
            accessibilityState={{ selected: false }}
            accessible
          >
            <Icon
              name={IconName.Home}
              size={TAB_BAR_FLOATING_ICON_SIZE}
              color={IconColor.IconDefault}
              style={{
                width: TAB_BAR_FLOATING_ICON_DIMENSION,
                height: TAB_BAR_FLOATING_ICON_DIMENSION,
              }}
            />
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
              twClassName="mt-0.5 text-center"
              style={{
                fontSize: TAB_BAR_FLOATING_LABEL_FONT_SIZE,
                lineHeight: TAB_BAR_FLOATING_LABEL_LINE_HEIGHT,
              }}
              maxFontSizeMultiplier={1}
            >
              {strings('bottom_nav.home')}
            </Text>
          </ButtonAnimated>
        )}
      </TabBarFloatingSurface>
    </View>
  );

  if (fadeIn) {
    return (
      <Animated.View
        entering={motion}
        exiting={FadeOut.duration(AnimationDuration.Fast).reduceMotion(
          ReduceMotion.System,
        )}
        style={frameStyle}
        testID={`${testIDPrefix}-tab-bar`}
        pointerEvents="box-none"
        onLayout={handleFrameLayout}
      >
        {row}
      </Animated.View>
    );
  }

  return (
    <View
      style={frameStyle}
      testID={`${testIDPrefix}-tab-bar`}
      pointerEvents="box-none"
      onLayout={handleFrameLayout}
    >
      {row}
    </View>
  );
};

export default ContextualFloatingTabBar;
