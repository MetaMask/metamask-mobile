import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FilterButton,
  FilterButtonGroup,
  IconName,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import { navigateToSocialLeaderboard } from '../../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import type { SocialShellTab } from '../../../../Views/SocialLeaderboard/shell/types';
import {
  SocialLeaderboard,
  type SocialLeaderboardSource,
} from '../../../SocialLeaderboard';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import { usePerpsLiveTradesAbTest } from '../../hooks/usePerpsLiveTradesAbTest';
import { usePerpsSocialEnabled } from '../../hooks/usePerpsSocialEnabled';
import PerpsLiveTrades from '../PerpsLiveTrades';
import PerpsSocialTrending from './PerpsSocialTrending';

type SocialFeedTab = 'live_trades' | 'trending' | 'top_traders';

const TOP_TRADERS_LIMIT = 5;
const TOP_TRADERS_SOURCE: SocialLeaderboardSource = {
  kind: 'all',
  assetClass: 'perps',
};

const SOCIAL_TAB_BY_FEED_TAB: Record<SocialFeedTab, SocialShellTab> = {
  live_trades: 'live',
  trending: 'trending',
  top_traders: 'leaderboard',
};

interface PerpsSocialFeedSectionProps {
  /** Whether the section is on screen or close to it. */
  isNearViewport?: boolean;
}

const PerpsSocialFeedSectionInner: React.FC<
  Required<PerpsSocialFeedSectionProps>
> = ({ isNearViewport }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { showLiveTrades } = usePerpsLiveTradesAbTest();
  const [selectedTab, setSelectedTab] = useState<SocialFeedTab | null>(null);
  const defaultTab: SocialFeedTab = showLiveTrades ? 'live_trades' : 'trending';
  const tab =
    selectedTab === 'live_trades' && !showLiveTrades
      ? defaultTab
      : (selectedTab ?? defaultTab);

  const handleOpenSocial = useCallback(() => {
    navigateToSocialLeaderboard(navigation.navigate, {
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      initialTab: SOCIAL_TAB_BY_FEED_TAB[tab],
    });
  }, [navigation, tab]);

  return (
    <Box
      paddingBottom={3}
      testID={PerpsHomeViewSelectorsIDs.SOCIAL_FEED_SECTION}
    >
      <SectionHeader
        title={strings('perps.home.social_feed')}
        isInteractive
        onPress={handleOpenSocial}
        testID={PerpsHomeViewSelectorsIDs.SOCIAL_FEED_HEADER}
      />
      <Box twClassName="px-4 mt-1 mb-3">
        <FilterButtonGroup
          value={tab}
          onChange={(value) => setSelectedTab(value as SocialFeedTab)}
          twClassName="gap-2"
        >
          {showLiveTrades ? (
            <FilterButton
              value="live_trades"
              startIconName={IconName.Fire}
              twClassName={tab !== 'live_trades' ? 'bg-muted' : undefined}
              testID={PerpsHomeViewSelectorsIDs.SOCIAL_FEED_LIVE_TRADES_PILL}
            >
              {strings('perps.home.live_trades')}
            </FilterButton>
          ) : null}
          <FilterButton
            value="trending"
            startIconName={IconName.Trophy}
            twClassName={tab !== 'trending' ? 'bg-muted' : undefined}
            testID={PerpsHomeViewSelectorsIDs.SOCIAL_FEED_TRENDING_PILL}
          >
            {strings('perps.home.trending')}
          </FilterButton>
          <FilterButton
            value="top_traders"
            startIconName={IconName.People}
            twClassName={tab !== 'top_traders' ? 'bg-muted' : undefined}
            testID={PerpsHomeViewSelectorsIDs.SOCIAL_FEED_TOP_TRADERS_PILL}
          >
            {strings('perps.home.top_traders')}
          </FilterButton>
        </FilterButtonGroup>
      </Box>
      {tab === 'live_trades' ? (
        <PerpsLiveTrades isNearViewport={isNearViewport} />
      ) : null}
      {tab === 'trending' ? <PerpsSocialTrending /> : null}
      {tab === 'top_traders' ? (
        <>
          <SocialLeaderboard
            source={TOP_TRADERS_SOURCE}
            location="perps_home"
            limit={TOP_TRADERS_LIMIT}
          />
          <Box twClassName="px-4 pt-3">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              isFullWidth
              onPress={handleOpenSocial}
              testID={PerpsHomeViewSelectorsIDs.SOCIAL_FEED_SEE_MORE}
            >
              {strings('perps.home.see_more')}
            </Button>
          </Box>
        </>
      ) : null}
    </Box>
  );
};

const PerpsSocialFeedSection: React.FC<PerpsSocialFeedSectionProps> = ({
  isNearViewport = false,
}) => {
  const isEnabled = usePerpsSocialEnabled();
  if (!isEnabled) {
    return null;
  }
  return <PerpsSocialFeedSectionInner isNearViewport={isNearViewport} />;
};

export default PerpsSocialFeedSection;
