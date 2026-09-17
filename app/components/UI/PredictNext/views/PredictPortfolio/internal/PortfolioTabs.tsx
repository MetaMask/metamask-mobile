import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictPortfolioTab } from '../../../navigation/types';
import { PredictPortfolioScreenTestIds } from '../PredictPortfolioScreen.testIds';

interface PortfolioTabsProps {
  activeTab: PredictPortfolioTab;
  onTabPress: (tab: PredictPortfolioTab) => void;
}

const tabs = [
  {
    key: 'positions',
    label: 'predict_next.portfolio.active_positions',
    testID: PredictPortfolioScreenTestIds.POSITIONS_TAB,
  },
  {
    key: 'history',
    label: 'predict_next.portfolio.history',
    testID: PredictPortfolioScreenTestIds.HISTORY_TAB,
  },
] as const;

export const PortfolioTabs = ({
  activeTab,
  onTabPress,
}: PortfolioTabsProps) => {
  const tw = useTailwind();

  return (
    <Box twClassName="flex-row" testID={PredictPortfolioScreenTestIds.TABS}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onTabPress(tab.key)}
            style={tw.style('flex-1')}
            testID={tab.testID}
          >
            <Box twClassName="items-center gap-3">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={isActive ? FontWeight.Bold : FontWeight.Regular}
                twClassName={isActive ? 'text-default' : 'text-alternative'}
              >
                {strings(tab.label)}
              </Text>
              <Box
                twClassName={`h-0.5 w-full ${
                  isActive ? 'bg-icon-default' : 'bg-transparent'
                }`}
              />
            </Box>
          </Pressable>
        );
      })}
    </Box>
  );
};
