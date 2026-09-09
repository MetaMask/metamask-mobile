import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TABS, type TabId } from '../shared/tabConfig';
import HomeHeader from './HomeHeader';
import TabBar from './TabBar';

/**
 * Prototype root for TSA-1121 — Follow Trading / Social Bundle V1.
 *
 * Renders behind the `aiSocialBundleV1Enabled` FF via `TradersButton` on the
 * wallet home. Fully isolated from the shipped SocialLeaderboard feature; no
 * shared components (styles/utilities only).
 */
const HomeView: React.FC = () => {
  const tw = useTailwind();
  const [activeTab, setActiveTab] = useState<TabId>('feed');

  const ActiveTabComponent = useMemo(
    () =>
      TABS.find((tab) => tab.id === activeTab)?.component ?? TABS[0].component,
    [activeTab],
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={tw.style('flex-1 bg-background-default')}
    >
      <HomeHeader />
      <TabBar activeTab={activeTab} onChange={setActiveTab} />
      <Box style={tw.style('flex-1')}>
        <ActiveTabComponent />
      </Box>
    </SafeAreaView>
  );
};

export default HomeView;
