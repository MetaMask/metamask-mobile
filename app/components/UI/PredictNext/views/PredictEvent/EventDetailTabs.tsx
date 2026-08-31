import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { EventDetailTabsTestIds } from './EventDetailTabs.testIds';

export const EVENT_DETAIL_TABS = {
  OUTCOMES: 'outcomes',
  ABOUT: 'about',
} as const;

export type EventDetailTab =
  (typeof EVENT_DETAIL_TABS)[keyof typeof EVENT_DETAIL_TABS];

const TAB_LABELS: Record<EventDetailTab, string> = {
  [EVENT_DETAIL_TABS.OUTCOMES]: 'predict.tabs.outcomes',
  [EVENT_DETAIL_TABS.ABOUT]: 'predict.tabs.about',
};

export interface EventDetailTabsProps {
  selectedTab: EventDetailTab;
  tabs: readonly EventDetailTab[];
  onSelectTab: (tab: EventDetailTab) => void;
}

export const EventDetailTabs = ({
  selectedTab,
  tabs,
  onSelectTab,
}: EventDetailTabsProps) => {
  const tw = useTailwind();

  if (tabs.length < 2) {
    return null;
  }

  return (
    <Box
      testID={EventDetailTabsTestIds.BAR}
      twClassName="mt-6 flex-row gap-4 border-b border-muted"
    >
      {tabs.map((tab) => {
        const selected = tab === selectedTab;

        return (
          <Pressable
            key={tab}
            testID={EventDetailTabsTestIds.tab(tab)}
            accessibilityRole="tab"
            accessibilityLabel={strings(TAB_LABELS[tab])}
            accessibilityState={{ selected }}
            onPress={() => onSelectTab(tab)}
            style={tw.style(
              'border-b-2 pb-2',
              selected ? 'border-icon-default' : 'border-transparent',
            )}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={selected ? FontWeight.Bold : FontWeight.Medium}
              color={
                selected ? TextColor.TextDefault : TextColor.TextAlternative
              }
            >
              {strings(TAB_LABELS[tab])}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
};
