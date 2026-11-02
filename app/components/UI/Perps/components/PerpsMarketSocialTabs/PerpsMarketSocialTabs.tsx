import React, { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  FilterButton,
  FilterButtonGroup,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
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
import { navigateToSocialLeaderboard } from '../../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { usePerpsEventTracking } from '../../hooks';
import type { UsePerpsTopTradersOptions } from '../../hooks/usePerpsTopTraders';
import {
  getPerpsMarketDetailsTabSelector,
  PerpsMarketDetailsViewSelectorsIDs,
} from '../../Perps.testIds';
import PerpsSocialTrending from '../PerpsSocialFeedSection/PerpsSocialTrending';
import PerpsSocialTopTraders from '../PerpsSocialFeedSection/PerpsSocialTopTraders';

const TABS = ['overview', 'feed', 'top_traders'] as const;
const FEED_POST_COUNT = 5;
const TOP_TRADERS_LIMIT = 10;
const TOP_TRADERS_TIMEFRAMES = ['7d', '30d'] as const;
const SOURCE = PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN;

type TopTradersTimeframe = NonNullable<UsePerpsTopTradersOptions['timeframe']>;

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
  const [timeframe, setTimeframe] = useState<TopTradersTimeframe>('7d');

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

  const handleOpenSocial = useCallback(() => {
    navigateToSocialLeaderboard(navigation.navigate, { source: SOURCE });
  }, [navigation]);

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
          testID={PerpsMarketDetailsViewSelectorsIDs.TOP_TRADERS_TAB_CONTENT}
        >
          <Box twClassName="px-4 pt-6 pb-3">
            <FilterButtonGroup
              value={timeframe}
              onChange={(value) => setTimeframe(value as TopTradersTimeframe)}
              twClassName="gap-2"
            >
              {TOP_TRADERS_TIMEFRAMES.map((value) => (
                <FilterButton
                  key={value}
                  value={value}
                  twClassName={timeframe !== value ? 'bg-muted' : undefined}
                  testID={getPerpsMarketDetailsTabSelector(
                    `top-traders-${value}`,
                  )}
                >
                  {strings(`perps.market.top_traders_timeframe.${value}`)}
                </FilterButton>
              ))}
            </FilterButtonGroup>
          </Box>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="px-4 pb-3"
          >
            {strings('perps.market.top_traders_scope')}
          </Text>
          <PerpsSocialTopTraders
            limit={TOP_TRADERS_LIMIT}
            timeframe={timeframe}
            source={SOURCE}
            onSeeMorePress={handleOpenSocial}
            emptyMessage={strings('perps.market.top_traders_empty')}
          />
        </Box>
      ) : null}
    </>
  );
};

export default PerpsMarketSocialTabs;
