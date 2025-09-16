import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import ActiveBoosts from './OverviewTab/ActiveBoosts';
import { useActivePointsBoosts } from '../../hooks/useActivePointsBoosts';
import { WaysToEarn } from './OverviewTab/WaysToEarn/WaysToEarn';

interface RewardsOverviewProps {
  tabLabel?: string;
}

const RewardsOverview: React.FC<RewardsOverviewProps> = () => {
  useActivePointsBoosts();

  return (
    <Box
      twClassName="flex-1 mt-4 gap-4"
      testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT_OVERVIEW}
    >
      <ActiveBoosts />

      <WaysToEarn />
    </Box>
  );
};

export default RewardsOverview;
