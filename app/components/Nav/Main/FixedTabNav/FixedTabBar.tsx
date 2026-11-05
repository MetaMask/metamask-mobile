import React from 'react';
import { Pressable } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIXED_TABS } from './fixedTabs';

/**
 * Stable footer. Tabs never change with the content pill.
 * This bar stays in the navigator layout, so it does not overlay the scene.
 */
const FixedTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      backgroundColor={BoxBackgroundColor.BackgroundDefault}
      twClassName="border-t border-muted"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      testID="fixed-tab-bar"
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
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={tab.label}
            testID={`fixed-tab-${tab.key}`}
            onPress={onPress}
            style={tw.style('flex-1 items-center justify-center py-2')}
          >
            <Icon
              name={isSelected ? tab.selectedIcon : tab.icon}
              size={IconSize.Md}
              color={
                isSelected ? IconColor.IconDefault : IconColor.IconAlternative
              }
            />
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={isSelected ? FontWeight.Medium : FontWeight.Regular}
              color={
                isSelected ? TextColor.TextDefault : TextColor.TextAlternative
              }
              twClassName="mt-1"
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
};

export default FixedTabBar;
