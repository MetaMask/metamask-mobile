import React from 'react';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import UpcomingRewards from './LevelsTab/UpcomingRewards';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface RewardsLevelsProps {
  tabLabel?: string;
}

const RewardsLevels: React.FC<RewardsLevelsProps> = () => (
  <Box
    twClassName="flex-1 items-center justify-center border-dashed border-default border-2 rounded-md mt-4"
    testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT_LEVELS}
  >
    <Text variant={TextVariant.BodyMd}>
      {strings('rewards.not_implemented')}
    </Text>
  </Box>
);

export default RewardsLevels;
