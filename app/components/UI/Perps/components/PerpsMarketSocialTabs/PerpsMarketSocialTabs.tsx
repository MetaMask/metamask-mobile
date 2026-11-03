import React, { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useSocialFeedPostNavigation } from '../../../../Views/SocialLeaderboard/hooks/useSocialFeedPostNavigation';
import {
  HYPERLIQUID_CAIP2_CHAIN_ID,
  SocialFeed,
  toFeedAssetId,
} from '../../../SocialFeed';
import { HYPERLIQUID_CHAIN_NAME } from '../../../SocialFeed/utils/perp';
import {
  SocialLeaderboard,
  type SocialLeaderboardSource,
} from '../../../SocialLeaderboard';
import { usePerpsEventTracking } from '../../hooks';
import {
  getPerpsMarketDetailsTabSelector,
  PerpsMarketDetailsViewSelectorsIDs,
} from '../../Perps.testIds';

const TABS = ['overview', 'top_traders', 'feed'] as const;
const SOURCE = PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN;
const FEED_CHAINS = [HYPERLIQUID_CAIP2_CHAIN_ID];

interface PerpsMarketSocialTabsProps {
  /** Raw market symbol (`BTC`, `xyz:NVDA`); the social perp feed keys on it exactly. */
  symbol: string;
  overview: React.ReactNode;
  onOverviewLayout?: (event: LayoutChangeEvent) => void;
  onOverviewVisibilityChange?: (isVisible: boolean) => void;
}

const PerpsMarketSocialTabs: React.FC<PerpsMarketSocialTabsProps> = ({
  symbol,
  overview,
  onOverviewLayout,
  onOverviewVisibilityChange,
}) => {
  const { track } = usePerpsEventTracking();
  const { onAuthorPress, onPositionPress } = useSocialFeedPostNavigation();
  const [activeIndex, setActiveIndex] = useState(0);
  const leaderboardSource = useMemo<SocialLeaderboardSource>(
    () => ({ kind: 'perp', symbol }),
    [symbol],
  );
  const feedAssetIds = useMemo(() => {
    const assetId = toFeedAssetId({
      chain: HYPERLIQUID_CHAIN_NAME,
      tokenAddress: symbol,
    });
    return assetId ? [assetId] : null;
  }, [symbol]);

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
      onOverviewVisibilityChange?.(TABS[index] === 'overview');
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
        [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
          PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_MARKET_DETAILS,
        [PERPS_EVENT_PROPERTY.TAB_NAME]: TABS[index],
        [PERPS_EVENT_PROPERTY.ASSET]: symbol,
      });
    },
    [activeIndex, onOverviewVisibilityChange, symbol, track],
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
      {activeTab === 'overview' ? (
        <Box twClassName="pt-3" onLayout={onOverviewLayout}>
          {overview}
        </Box>
      ) : null}
      {activeTab === 'top_traders' ? (
        <Box
          twClassName="pt-6"
          testID={PerpsMarketDetailsViewSelectorsIDs.TOP_TRADERS_TAB_CONTENT}
        >
          <SocialLeaderboard
            source={leaderboardSource}
            location="perps_market_details"
          />
        </Box>
      ) : null}
      {activeTab === 'feed' ? (
        <Box
          twClassName="pt-6"
          testID={PerpsMarketDetailsViewSelectorsIDs.FEED_TAB_CONTENT}
        >
          {feedAssetIds ? (
            <SocialFeed
              scope="all"
              chains={FEED_CHAINS}
              assetIds={feedAssetIds}
              location="perps_market_details"
              analyticsSource={SOURCE}
              onAuthorPress={onAuthorPress}
              onPositionPress={onPositionPress}
            />
          ) : null}
        </Box>
      ) : null}
    </>
  );
};

export default PerpsMarketSocialTabs;
