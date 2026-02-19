import React from 'react';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import SnapshotsSection from './OverviewTab/SnapshotsSection';
import ActiveBoosts from './OverviewTab/ActiveBoosts';
import { useActivePointsBoosts } from '../../hooks/useActivePointsBoosts';
import { WaysToEarn } from './OverviewTab/WaysToEarn/WaysToEarn';
import { ScrollView } from 'react-native-gesture-handler';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface RewardsOverviewProps {
  tabLabel?: string;
}

const RewardsOverview: React.FC<RewardsOverviewProps> = () => {
  const { fetchActivePointsBoosts } = useActivePointsBoosts();
  const tw = useTailwind();

  return (
    <ScrollView
      contentContainerStyle={tw.style('flex-grow')}
      showsVerticalScrollIndicator={false}
      testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT_OVERVIEW}
    >
      <SnapshotsSection />

      <ActiveBoosts fetchActivePointsBoosts={fetchActivePointsBoosts} />

      <WaysToEarn />
    </ScrollView>
  );
};

export default RewardsOverview;
