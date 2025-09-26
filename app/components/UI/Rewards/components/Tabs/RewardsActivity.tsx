import React from 'react';
import { Box } from '@metamask/design-system-react-native';

import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { ActivityTab } from './ActivityTab/ActivityTab';

interface RewardsActivityProps {
  tabLabel?: string;
}

const RewardsActivity: React.FC<RewardsActivityProps> = () => (
  <Box
    twClassName="flex-1 mt-4"
    testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT_ACTIVITY}
  >
    <ActivityTab />
  </Box>
);

export default RewardsActivity;
