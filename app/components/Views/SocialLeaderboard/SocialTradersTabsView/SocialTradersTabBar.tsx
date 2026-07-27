import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../../util/theme';

export interface SocialTradersTab {
  key: string;
  label: string;
}

export interface SocialTradersTabBarProps {
  tabs: SocialTradersTab[];
  activeIndex: number;
  onTabPress: (index: number) => void;
  testID?: string;
  twClassName?: string;
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
  },
  baseline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
  },
});

/**
 * Full-width Leaderboard | Feed tab bar. Each tab takes an equal share of the
 * width. A subtle hairline spans the full width beneath both tabs, and a wider
 * white indicator slides under the selected tab.
 */
const SocialTradersTabBar: React.FC<SocialTradersTabBarProps> = ({
  tabs,
  activeIndex,
  onTabPress,
  testID,
  twClassName,
}) => {
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorX = useSharedValue(0);
  const isInitializedRef = useRef(false);

  const tabWidth = tabs.length > 0 ? containerWidth / tabs.length : 0;

  useEffect(() => {
    if (containerWidth <= 0) {
      return;
    }
    const target = activeIndex * tabWidth;
    if (!isInitializedRef.current) {
      indicatorX.value = target;
      isInitializedRef.current = true;
      return;
    }
    indicatorX.value = withTiming(target, { duration: 200 });
  }, [activeIndex, containerWidth, tabWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  return (
    <Box
      twClassName={`relative ${twClassName ?? ''}`}
      onLayout={handleLayout as (event: unknown) => void}
      testID={testID}
    >
      <Box flexDirection={BoxFlexDirection.Row}>
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabPress(index)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={styles.tab}
              testID={`${testID}-tab-${index}`}
            >
              <Box alignItems={BoxAlignItems.Center} twClassName="py-3">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={isActive ? FontWeight.Bold : FontWeight.Regular}
                  color={
                    isActive ? TextColor.TextDefault : TextColor.TextAlternative
                  }
                >
                  {tab.label}
                </Text>
              </Box>
            </TouchableOpacity>
          );
        })}
      </Box>

      <Box
        style={[styles.baseline, { backgroundColor: colors.border.muted }]}
      />

      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            { width: tabWidth, backgroundColor: colors.icon.default },
            indicatorStyle,
          ]}
        />
      )}
    </Box>
  );
};

export default SocialTradersTabBar;
