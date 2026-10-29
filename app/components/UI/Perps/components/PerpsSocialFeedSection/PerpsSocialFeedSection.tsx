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
import { pushSocialLeaderboard } from '../../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import {
  SocialLeaderboard,
  type SocialLeaderboardSource,
} from '../../../SocialLeaderboard';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import { usePerpsSocialEnabled } from '../../hooks/usePerpsSocialEnabled';
import PerpsSocialTrending from './PerpsSocialTrending';

type SocialFeedTab = 'trending' | 'top_traders';

const TOP_TRADERS_LIMIT = 5;
const TOP_TRADERS_SOURCE: SocialLeaderboardSource = {
  kind: 'all',
  assetClass: 'perps',
};

const PerpsSocialFeedSectionInner: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [tab, setTab] = useState<SocialFeedTab>('trending');

  const handleOpenSocial = useCallback(() => {
    pushSocialLeaderboard(navigation.navigate, {
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      initialTab: tab === 'top_traders' ? 'leaderboard' : 'trending',
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
          onChange={(value) => setTab(value as SocialFeedTab)}
          twClassName="gap-2"
        >
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
      {tab === 'trending' ? (
        <PerpsSocialTrending />
      ) : (
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
      )}
    </Box>
  );
};

const PerpsSocialFeedSection: React.FC = () => {
  const isEnabled = usePerpsSocialEnabled();
  if (!isEnabled) {
    return null;
  }
  return <PerpsSocialFeedSectionInner />;
};

export default PerpsSocialFeedSection;
