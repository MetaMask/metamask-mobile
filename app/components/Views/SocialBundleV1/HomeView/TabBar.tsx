import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Pressable } from 'react-native';
import { TABS, type TabId } from '../shared/tabConfig';

interface TabBarProps {
  activeTab: TabId;
  onChange: (next: TabId) => void;
}

/**
 * Underlined tab strip used by the prototype home. Prototype-only: no
 * animated indicator, no swipe — a simple tap-to-swap. Matches the visual
 * pattern from `SocialTradersTabsView` closely enough for Design review.
 */
const TabBar: React.FC<TabBarProps> = ({ activeTab, onChange }) => {
  const tw = useTailwind();
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.End}
      style={tw.style('gap-6 px-4 pt-2 bg-background-default')}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            testID={tab.testID}
          >
            <Box style={tw.style('pb-2 gap-1 items-center')}>
              <Text
                variant={isActive ? TextVariant.BodyMdBold : TextVariant.BodyMd}
                color={
                  isActive ? TextColor.TextDefault : TextColor.TextAlternative
                }
              >
                {tab.label}
              </Text>
              {isActive ? (
                <Box
                  style={tw.style('h-0.5 w-full bg-icon-default rounded-full')}
                />
              ) : (
                <Box style={tw.style('h-0.5 w-full')} />
              )}
            </Box>
          </Pressable>
        );
      })}
    </Box>
  );
};

export default TabBar;
