import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import ActiveBoosts from './OverviewTab/ActiveBoosts';
import { useActivePointsBoosts } from '../../hooks/useActivePointsBoosts';

interface RewardsOverviewProps {
  tabLabel?: string;
}

const RewardsOverview: React.FC<RewardsOverviewProps> = () => {
  useActivePointsBoosts();

  return (
    <Box
      twClassName="flex-1"
      testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT_OVERVIEW}
    >
      <ActiveBoosts />
    </Box>
  );
};

export default RewardsOverview;
