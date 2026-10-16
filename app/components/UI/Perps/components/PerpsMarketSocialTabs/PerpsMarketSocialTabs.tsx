import React, { useCallback, useMemo, useState } from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { SocialFeed } from '../../../SocialFeed';
import { usePerpsEventTracking } from '../../hooks';
import {
  getPerpsMarketDetailsTabSelector,
  PerpsMarketDetailsViewSelectorsIDs,
} from '../../Perps.testIds';

const TABS = ['overview', 'feed'] as const;

interface PerpsMarketSocialTabsProps {
  /** Raw market symbol (`BTC`, `xyz:NVDA`); the social perp feed keys on it exactly. */
  symbol: string;
  overview: React.ReactNode;
}

const PerpsMarketSocialTabs: React.FC<PerpsMarketSocialTabsProps> = ({
  symbol,
  overview,
}) => {
  const { track } = usePerpsEventTracking();
  const [activeIndex, setActiveIndex] = useState(0);

  const tabs = useMemo<TabItem[]>(
    () =>
      TABS.map((key) => ({
        key,
        label: strings(`perps.market.tabs.${key}`),
        content: null,
        testID: getPerpsMarketDetailsTabSelector(key),
      })),
    [],
  );

  const handleTabPress = useCallback(
    (index: number) => {
      if (index === activeIndex) {
        return;
      }
      setActiveIndex(index);
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
        [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
          PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_MARKET_DETAILS,
        [PERPS_EVENT_PROPERTY.TAB_NAME]: TABS[index],
        [PERPS_EVENT_PROPERTY.ASSET]: symbol,
      });
    },
    [activeIndex, symbol, track],
  );

  const activeTab = TABS[activeIndex];

  return (
    <>
      <SectionDivider />
      <TabsBar
        tabs={tabs}
        activeIndex={activeIndex}
        onTabPress={handleTabPress}
        testID={PerpsMarketDetailsViewSelectorsIDs.SOCIAL_TABS}
      />
      {activeTab === 'overview' ? overview : null}
      {activeTab === 'feed' ? (
        <Box
          twClassName="pt-4"
          testID={PerpsMarketDetailsViewSelectorsIDs.FEED_TAB_CONTENT}
        >
          <SocialFeed
            source={{ kind: 'perp', symbol }}
            location="perps_market_details"
          />
        </Box>
      ) : null}
    </>
  );
};

export default PerpsMarketSocialTabs;
