import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import type { RewardsDashboardTab } from './RewardsDashboardTabs.types';

interface RewardsDashboardTabsProps {
  activeTab: RewardsDashboardTab;
  showEarningsDot: boolean;
  onChangeTab: (tab: RewardsDashboardTab) => void;
}

const RewardsDashboardTabs: React.FC<RewardsDashboardTabsProps> = ({
  activeTab,
  showEarningsDot,
  onChangeTab,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    twClassName="px-4 pt-1"
    testID={KOL_DASHBOARD_SELECTORS.TABS}
  >
    <Box twClassName="flex-1">
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'waysToEarn' }}
        onPress={() => onChangeTab('waysToEarn')}
        testID={KOL_DASHBOARD_SELECTORS.TAB_WAYS_TO_EARN}
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="pb-2">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={
              activeTab === 'waysToEarn' ? FontWeight.Bold : FontWeight.Regular
            }
            twClassName={
              activeTab === 'waysToEarn' ? 'text-default' : 'text-alternative'
            }
          >
            {strings('rewards.kol.ways_to_earn')}
          </Text>
        </Box>
        <Box
          twClassName={
            activeTab === 'waysToEarn' ? 'h-[2px] bg-default' : 'h-[2px]'
          }
        />
      </Pressable>
    </Box>
    <Box twClassName="flex-1">
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'earnings' }}
        onPress={() => onChangeTab('earnings')}
        testID={KOL_DASHBOARD_SELECTORS.TAB_EARNINGS}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="gap-1 pb-2"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={
              activeTab === 'earnings' ? FontWeight.Bold : FontWeight.Regular
            }
            twClassName={
              activeTab === 'earnings' ? 'text-default' : 'text-alternative'
            }
          >
            {strings('rewards.kol.earnings_tab')}
          </Text>
          {showEarningsDot ? (
            <Box
              testID={KOL_DASHBOARD_SELECTORS.TAB_EARNINGS_DOT}
              twClassName="h-1.5 w-1.5 rounded-full bg-success-default"
            />
          ) : null}
        </Box>
        <Box
          twClassName={
            activeTab === 'earnings' ? 'h-[2px] bg-default' : 'h-[2px]'
          }
        />
      </Pressable>
    </Box>
  </Box>
);

export default RewardsDashboardTabs;
