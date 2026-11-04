import React, { useCallback, useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { type IconName } from '@metamask/design-system-react-native';

import { playImpact, ImpactMoment } from '../../../../util/haptics';
import TabBarFloatingItem from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingItem';
import TabBarFloatingSurface from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingSurface';
import { useBlurMaterial } from '../../../../component-library/hooks/useBlurMaterial';
import {
  TAB_BAR_FLOATING_HEIGHT,
  TAB_BAR_FLOATING_HORIZONTAL_INSET,
} from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import { getTabBarFloatingBottomPadding } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.utils';

export interface TradeTab<T extends string> {
  id: T;
  label: string;
  iconName: IconName;
}

export interface TradeTabBarProps<T extends string> {
  tabs: TradeTab<T>[];
  /** `null` leaves every tab unselected. */
  activeTab: T | null;
  onTabPress: (tab: T) => void;
  testIDPrefix: string;
  onHeightChange?: (height: number) => void;
  inline?: boolean;
  /** Render the tab buttons only, so the shared pill can own the surface. */
  itemsOnly?: boolean;
}

const OVERLAY_STYLE: ViewStyle = {
  zIndex: 50,
  elevation: 50,
};

const PILL_STYLE: ViewStyle = { height: TAB_BAR_FLOATING_HEIGHT };

/**
 * Contextual footer pill. Home is one of `tabs`, in the same container as the
 * rest. There is no circle beside the pill.
 *
 * The pill is 62pt tall, above the 44pt / 48dp touch floor. Selection uses a
 * filled platter and a heavier label, plus `accessibilityState.selected`.
 */
const TradeTabBar = <T extends string>({
  tabs,
  activeTab,
  onTabPress,
  testIDPrefix,
  onHeightChange,
  inline = false,
  itemsOnly = false,
}: TradeTabBarProps<T>) => {
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

  if (!inline && !isKeyboardHidden) {
    return null;
  }

  const items = tabs.map((item) => (
    <TabBarFloatingItem
      key={item.id}
      testID={`${testIDPrefix}-tab-${item.id}`}
      iconName={item.iconName}
      label={item.label}
      isActive={activeTab !== null && activeTab === item.id}
      fullContrast
      onPress={() => handleTabPress(item.id)}
    />
  ));

  if (itemsOnly) {
    return <>{items}</>;
  }

  const pill = (
    <TabBarFloatingSurface
      isBlurAvailable={isBlurAvailable}
      colorScheme={colorScheme}
      twClassName="flex-row items-center rounded-full p-1"
      style={PILL_STYLE}
      testID={`${testIDPrefix}-tab-pill`}
    >
      {items}
    </TabBarFloatingSurface>
  );

  if (inline) {
    return pill;
  }

  const bottomPadding = getTabBarFloatingBottomPadding(bottomInset);

  return (
    <View
      style={[
        tw.style('absolute bottom-0 left-0 right-0'),
        OVERLAY_STYLE,
        {
          paddingBottom: bottomPadding,
          paddingHorizontal: TAB_BAR_FLOATING_HORIZONTAL_INSET,
        },
      ]}
      testID={`${testIDPrefix}-tab-bar`}
      pointerEvents="box-none"
      onLayout={handleFrameLayout}
    >
      {pill}
    </View>
  );
};

export default TradeTabBar;
