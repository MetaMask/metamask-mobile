import {
  Box,
  BoxAlignItems,
  Button,
  ButtonVariant,
  FontWeight,
  SectionHeader,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { strings } from '../../../../../../locales/i18n';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import { formatFollowerCountLabel } from '../../../../UI/SocialFeed/utils/formatters';
import ConnectionRow from '../../FollowConnectionsView/components/ConnectionRow';
import { useFollowWithNotificationSetup } from '../../hooks/useFollowWithNotificationSetup';
import { navigateToSocialV1Profile } from '../../navigation/navigateToSocialV1Profile';
import { usePopularTraders } from '../../SocialV1View/feed/hooks/usePopularTraders';
import { ProfilesToFollowViewSelectorsIDs } from '../../ProfilesToFollowView/ProfilesToFollowView.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../../Homepage/Sections/TopTraders/types';

export const FOLLOWING_SUGGESTIONS_TEST_ID = 'social-v1-following-suggestions';

/**
 * Suggested traders for a Following tab with nobody followed yet. Same
 * ranking, rows, and follow flow as Profiles to follow. The Follow button
 * is the secondary style.
 */
const FollowingSuggestions: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { followWithSetup } = useFollowWithNotificationSetup({
    requireSocialTerms: true,
    requireSocialProfile: true,
  });
  const {
    traders,
    isLoading,
    isFetching,
    hasFetched,
    error,
    refresh,
    toggleFollow,
  } = usePopularTraders();
  const isInFlight = isLoading || isFetching;
  const showLoading = isInFlight && traders.length === 0 && !hasFetched;
  const showError = Boolean(error) && traders.length === 0 && !isInFlight;

  const handleRowPress = useCallback(
    (trader: TopTrader) => {
      navigateToSocialV1Profile(navigation, {
        traderId: trader.id,
        traderName: trader.username,
        traderAddress: trader.address,
        traderAvatarUri: trader.avatarUri,
        source: 'profiles_to_follow',
        traderRank: trader.rank,
      });
    },
    [navigation],
  );

  const handleFollowPress = useCallback(
    async (trader: TopTrader) => {
      await followWithSetup(trader.isFollowing, () =>
        toggleFollow(trader.id, {
          source: 'profiles_to_follow',
          traderAddress: trader.address,
          traderUsername: trader.username,
          traderRank: trader.rank,
          traderAvatarUri: trader.avatarUri,
        }),
      );
    },
    [followWithSetup, toggleFollow],
  );

  const list = (() => {
    if (showLoading) {
      return (
        <Box alignItems={BoxAlignItems.Center} twClassName="py-6">
          <Spinner />
        </Box>
      );
    }
    if (showError) {
      return (
        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="px-4 py-6 gap-4"
          testID={ProfilesToFollowViewSelectorsIDs.ERROR}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.profiles_to_follow.error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            onPress={() => {
              refresh().catch(() => undefined);
            }}
            testID={ProfilesToFollowViewSelectorsIDs.RETRY}
          >
            {strings('social_leaderboard.profiles_to_follow.retry')}
          </Button>
        </Box>
      );
    }
    return traders.map((trader) => (
      <ConnectionRow
        key={trader.id}
        id={trader.id}
        username={trader.username}
        subtitle={formatFollowerCountLabel(trader.followerCount)}
        address={trader.address}
        avatarUri={trader.avatarUri}
        isFollowing={trader.isFollowing}
        followVariant={ButtonVariant.Secondary}
        onFollowPress={() => {
          handleFollowPress(trader).catch(() => undefined);
        }}
        onRowPress={() => handleRowPress(trader)}
      />
    ));
  })();

  return (
    <Box testID={FOLLOWING_SUGGESTIONS_TEST_ID}>
      <SectionHeader
        title={strings(
          'social_leaderboard.feed.v1_empty.following_suggestions.title',
        )}
        twClassName="pt-4"
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings(
            'social_leaderboard.feed.v1_empty.following_suggestions.description',
          )}
        </Text>
      </SectionHeader>
      {list}
    </Box>
  );
};

export default FollowingSuggestions;
