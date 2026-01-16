import React from 'react';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import UpcomingRewards from './LevelsTab/UpcomingRewards';
import { ScrollView } from 'react-native-gesture-handler';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import UnlockedRewards from './LevelsTab/UnlockedRewards';

interface RewardsLevelsProps {
  tabLabel?: string;
}

const RewardsLevels: React.FC<RewardsLevelsProps> = () => {
  const tw = useTailwind();

  return (
    <ScrollView
      contentContainerStyle={tw.style('flex-grow')}
      showsVerticalScrollIndicator={false}
      testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT_LEVELS}
    >
      <UnlockedRewards />
      <UpcomingRewards />
    </ScrollView>
  );
};

export default RewardsLevels;
