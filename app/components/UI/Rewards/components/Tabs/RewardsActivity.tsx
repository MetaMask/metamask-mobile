import React from 'react';
import { Box } from '@metamask/design-system-react-native';

import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { ActivityTab } from './ActivityTab/ActivityTab';

interface RewardsActivityProps {
  tabLabel?: string;
  isVisible?: boolean;
  onVisibilityChange?: (callback: (visible: boolean) => void) => void;
}

const RewardsActivity: React.FC<RewardsActivityProps> = () => (
  <Box
    twClassName="flex-1"
    testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT_ACTIVITY}
  >
    <ActivityTab />
  </Box>
);

export default RewardsActivity;
