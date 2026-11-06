import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import TabBarFloatingItem from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingItem';
import TabBarFloatingSurface from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingSurface';
import {
  TAB_BAR_FLOATING_HEIGHT,
  TAB_BAR_FLOATING_HORIZONTAL_INSET,
  TAB_BAR_FLOATING_TEST_IDS,
} from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import { getTabBarFloatingBottomPadding } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.utils';
import { useBlurMaterial } from '../../../../component-library/hooks/useBlurMaterial';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import { FIXED_TABS } from './fixedTabs';

/** Reports the overlay height so tab scenes can pad their last row. */
export const FixedTabBarHeightContext = React.createContext<
  (height: number) => void
>(() => undefined);

/**
 * Home · Money · Trade · Collect · Social in the floating glass pill.
 * The bar overlays the scene.
 */
const FixedTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const tw = useTailwind();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { isBlurAvailable, colorScheme } = useBlurMaterial();
  const reportHeight = useContext(FixedTabBarHeightContext);
  const bottomPadding = getTabBarFloatingBottomPadding(bottomInset);
  const lastReportedHeight = useRef(0);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      if (Math.abs(height - lastReportedHeight.current) > 2) {
        lastReportedHeight.current = height;
        reportHeight(height);
      }
    },
    [reportHeight],
  );

  useEffect(() => () => reportHeight(0), [reportHeight]);

  return (
    <View
      style={[
        tw.style('absolute bottom-0 left-0 right-0'),
        {
          paddingBottom: bottomPadding,
          paddingHorizontal: TAB_BAR_FLOATING_HORIZONTAL_INSET,
        },
      ]}
      testID="fixed-tab-bar"
      onLayout={handleLayout}
      pointerEvents="box-none"
    >
      <TabBarFloatingSurface
        isBlurAvailable={isBlurAvailable}
        colorScheme={colorScheme}
        twClassName="flex-row items-center rounded-full p-1"
        style={{ height: TAB_BAR_FLOATING_HEIGHT }}
        testID={TAB_BAR_FLOATING_TEST_IDS.PILL}
      >
        {state.routes.map((route, index) => {
          const tab = FIXED_TABS.find(
            (candidate) => candidate.routeName === route.name,
          );
          if (!tab) {
            return null;
          }

          const isSelected = state.index === index;
          const onPress = () => {
            playImpact(ImpactMoment.TabChange);
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isSelected && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabBarFloatingItem
              key={route.key}
              testID={`fixed-tab-${tab.key}`}
              iconName={isSelected ? tab.selectedIcon : tab.icon}
              label={tab.label}
              isActive={isSelected}
              onPress={onPress}
            />
          );
        })}
      </TabBarFloatingSurface>
    </View>
  );
};

export default FixedTabBar;
