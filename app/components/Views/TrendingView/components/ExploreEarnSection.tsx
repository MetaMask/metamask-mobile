import React from 'react';
import { useIsFocused } from '@react-navigation/native';
import EarnSection from '../../../UI/Earn/components/EarnSection';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
import {
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_SCREEN_NAMES,
} from '../../../UI/Earn/constants/earnModuleEvents';
import type { EarnModuleSurfaceLocation } from '../../../UI/Earn/types/earnModuleEvents.types';
import { useExploreActiveTab } from '../ExploreActiveTabContext';
import type { ExploreTabName } from '../search/analytics';
import type { RefreshConfig } from '../hooks/useExploreRefresh';

interface ExploreEarnSectionProps {
  tabName: Extract<ExploreTabName, 'Now' | 'Crypto'>;
  refresh: RefreshConfig;
}

const EXPLORE_EARN_ANALYTICS_CONTEXT: Record<
  Extract<ExploreTabName, 'Now' | 'Crypto'>,
  EarnModuleSurfaceLocation
> = {
  Now: {
    screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE_NOW_TAB,
    entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE_NOW_TAB,
    component_name: EARN_MODULE_COMPONENT_NAMES.EXPLORE_EARN_SECTION,
  },
  Crypto: {
    screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE_CRYPTO_TAB,
    entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE_CRYPTO_TAB,
    component_name: EARN_MODULE_COMPONENT_NAMES.EXPLORE_EARN_SECTION,
  },
};

const ExploreEarnSection = ({ tabName, refresh }: ExploreEarnSectionProps) => {
  const activeTab = useExploreActiveTab();
  const isFocused = useIsFocused();

  return (
    <EarnSection
      enabled={isFocused && activeTab === tabName}
      refresh={refresh}
      tokenDetailsSource={TokenDetailsSource.ExploreEarn}
      analyticsContext={EXPLORE_EARN_ANALYTICS_CONTEXT[tabName]}
    />
  );
};

export default React.memo(ExploreEarnSection);
