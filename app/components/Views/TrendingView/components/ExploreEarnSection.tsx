import React from 'react';
import { useIsFocused } from '@react-navigation/native';
import EarnSection from '../../../UI/Earn/components/EarnSection';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
import { EARN_MODULE_SCREEN_NAMES } from '../../../UI/Earn/constants/earnModuleEvents';
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
      screenName={
        tabName === 'Now'
          ? EARN_MODULE_SCREEN_NAMES.EXPLORE_NOW_TAB
          : EARN_MODULE_SCREEN_NAMES.EXPLORE_CRYPTO_TAB
      }
    />
  );
};

export default React.memo(ExploreEarnSection);
