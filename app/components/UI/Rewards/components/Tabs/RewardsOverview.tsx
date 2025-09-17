import React from 'react';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import ActiveBoosts from './OverviewTab/ActiveBoosts';
import { useActivePointsBoosts } from '../../hooks/useActivePointsBoosts';
import { WaysToEarn } from './OverviewTab/WaysToEarn/WaysToEarn';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface RewardsOverviewProps {
  tabLabel?: string;
}

const RewardsOverview: React.FC<RewardsOverviewProps> = () => {
  useActivePointsBoosts();
  const tw = useTailwind();

  return (
    <ScrollView
      contentContainerStyle={tw.style('flex-grow')}
      showsVerticalScrollIndicator={false}
      testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT_OVERVIEW}
    >
      <ActiveBoosts />

      <WaysToEarn />
    </ScrollView>
  );
};

export default RewardsOverview;
