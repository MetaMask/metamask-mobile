import React, { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  SectionDivider,
} from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { pushSocialLeaderboard } from '../../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import {
  SocialLeaderboard,
  type SocialLeaderboardSource,
} from '../../../SocialLeaderboard';
import { usePerpsEventTracking } from '../../hooks';
import {
  getPerpsMarketDetailsTabSelector,
  PerpsMarketDetailsViewSelectorsIDs,
} from '../../Perps.testIds';
import PerpsSocialTrending from '../PerpsSocialFeedSection/PerpsSocialTrending';

const TABS = ['overview', 'feed', 'top_traders'] as const;
const FEED_POST_COUNT = 5;
const TOP_TRADERS_LIMIT = 10;
const SOURCE = PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN;

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
  const navigation = useNavigation<AppNavigationProp>();
  const { track } = usePerpsEventTracking();
  const [activeIndex, setActiveIndex] = useState(0);
  const leaderboardSource = useMemo<SocialLeaderboardSource>(
    () => ({ kind: 'perp', symbol }),
    [symbol],
  );

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

  const handleOpenSocial = useCallback(() => {
    pushSocialLeaderboard(navigation.navigate, {
      source: SOURCE,
      initialTab: activeTab === 'top_traders' ? 'leaderboard' : 'trending',
    });
  }, [activeTab, navigation]);

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
      {activeTab === 'feed' ? (
        <Box
          twClassName="pt-6"
          testID={PerpsMarketDetailsViewSelectorsIDs.FEED_TAB_CONTENT}
        >
          <PerpsSocialTrending
            symbol={symbol}
            postCount={FEED_POST_COUNT}
            source={SOURCE}
            onSeeMorePress={handleOpenSocial}
          />
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
            limit={TOP_TRADERS_LIMIT}
          />
          <Box twClassName="px-4 pt-3">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              isFullWidth
              onPress={handleOpenSocial}
              testID={PerpsMarketDetailsViewSelectorsIDs.TOP_TRADERS_SEE_MORE}
            >
              {strings('perps.home.see_more')}
            </Button>
          </Box>
        </Box>
      ) : null}
    </>
  );
};

export default PerpsMarketSocialTabs;
