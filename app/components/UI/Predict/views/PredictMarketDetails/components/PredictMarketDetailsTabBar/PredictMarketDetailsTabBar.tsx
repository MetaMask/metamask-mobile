import React, { memo } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  getPredictMarketDetailsSelector,
  PredictMarketDetailsSelectorsIDs,
  type PredictMarketDetailsTabKey,
} from '../../../../Predict.testIds';

export interface PredictMarketDetailsTabBarProps {
  tabs: { label: string; key: PredictMarketDetailsTabKey }[];
  activeTab: number | null;
  onTabPress: (tabIndex: number) => void;
}

const PredictMarketDetailsTabBar = memo(
  ({ tabs, activeTab, onTabPress }: PredictMarketDetailsTabBarProps) => {
    const tw = useTailwind();

    return (
      <Box
        twClassName="bg-default border-b border-muted pt-4"
        testID={PredictMarketDetailsSelectorsIDs.TAB_BAR}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="px-3"
        >
          {tabs.map((tab, index) => (
            <Pressable
              key={tab.key}
              onPress={() => onTabPress(index)}
              style={tw.style(
                'w-1/3 py-3',
                activeTab === index ? 'border-b-2 border-default' : '',
              )}
              testID={getPredictMarketDetailsSelector.tabBarTab(tab.key)}
            >
              <Text
                variant={TextVariant.BodyMd}
                twClassName="font-medium"
                color={
                  activeTab === index
                    ? TextColor.TextDefault
                    : TextColor.TextAlternative
                }
                style={tw.style('text-center')}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </Box>
      </Box>
    );
  },
);

PredictMarketDetailsTabBar.displayName = 'PredictMarketDetailsTabBar';

export default PredictMarketDetailsTabBar;
