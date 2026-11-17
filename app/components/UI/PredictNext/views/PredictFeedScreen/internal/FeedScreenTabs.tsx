import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { FeedScreenDefinition } from '../../../navigation/feedScreens';
import { PredictFeedScreenTestIds } from '../PredictFeedScreen.testIds';

interface FeedScreenTabsProps {
  tabs: FeedScreenDefinition['tabs'];
  selectedTabId: string;
  onTabSelect: (tabId: string) => void;
}

export const FeedScreenTabs = ({
  tabs,
  selectedTabId,
  onTabSelect,
}: FeedScreenTabsProps) => {
  const tw = useTailwind();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <Box testID={PredictFeedScreenTestIds.TABS} twClassName="pb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('gap-2 px-4')}
      >
        {tabs.map((tab) => {
          const isSelected = tab.id === selectedTabId;

          return (
            <Pressable
              key={tab.id}
              testID={PredictFeedScreenTestIds.tab(tab.id)}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onTabSelect(tab.id)}
              style={tw.style(
                'h-10 justify-center rounded-xl px-3.5',
                isSelected ? 'bg-icon-default' : 'bg-muted',
              )}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={isSelected ? FontWeight.Bold : FontWeight.Medium}
                color={
                  isSelected ? TextColor.InfoInverse : TextColor.TextDefault
                }
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Box>
  );
};
