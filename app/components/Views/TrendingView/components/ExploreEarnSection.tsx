import React from 'react';
import { useIsFocused } from '@react-navigation/native';
import EarnSection from '../../../UI/Earn/components/EarnSection';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
import { useExploreActiveTab } from '../ExploreActiveTabContext';
import type { ExploreTabName } from '../search/analytics';
import type { RefreshConfig } from '../hooks/useExploreRefresh';

interface ExploreEarnSectionProps {
  tabName: Extract<ExploreTabName, 'Now' | 'Crypto'>;
  refresh: RefreshConfig;
}

const ExploreEarnSection = ({ tabName, refresh }: ExploreEarnSectionProps) => {
  const activeTab = useExploreActiveTab();
  const isFocused = useIsFocused();

  return (
    <EarnSection
      enabled={isFocused && activeTab === tabName}
      refresh={refresh}
      tokenDetailsSource={TokenDetailsSource.ExploreEarn}
    />
  );
};

export default React.memo(ExploreEarnSection);
