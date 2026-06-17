import React, { useCallback } from 'react';
import { Linking, Pressable, View } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { TraderProfile } from '@metamask/social-controllers';
import { TraderProfileViewSelectorsIDs } from '../TraderProfileView.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../Homepage/Sections/TopTraders/components/TraderAvatar';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { RankMedal } from '../../../Homepage/Sections/TopTraders/topRank';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { isTopRank } from '../../../Homepage/Sections/TopTraders/topRank/topRank.colors';

const AVATAR_SIZE = 40;

export interface ProfileHeaderProps {
  profile: TraderProfile;
  followerCount: number;
  twitterHandle?: string | null;
  /**
   * Leaderboard rank used to overlay the podium medal badge on the avatar for
   * ranks 1–3. Ranks outside 1–3 render a plain avatar.
   */
  rank?: number;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  followerCount,
  twitterHandle,
  rank,
}) => {
  const tw = useTailwind();
  const showMedal = rank != null && isTopRank(rank);
  const handleTwitterPress = useCallback(() => {
    if (twitterHandle) {
      Linking.openURL(`https://x.com/${twitterHandle}`);
    }
  }, [twitterHandle]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 py-3"
      gap={4}
      testID={TraderProfileViewSelectorsIDs.HEADER}
    >
      <View>
        <TraderAvatar
          imageUrl={profile.imageUrl}
          address={profile.address}
          size={AVATAR_SIZE}
        />
        {showMedal ? (
          <View style={tw.style('absolute -bottom-1 -right-1')}>
            <RankMedal rank={rank} />
          </View>
        ) : null}
      </View>

      <Box twClassName="flex-1 min-w-0">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
            twClassName="flex-shrink"
          >
            {profile.name}
          </Text>
          {twitterHandle ? (
            <Pressable
              onPress={handleTwitterPress}
              testID={TraderProfileViewSelectorsIDs.TWITTER_LINK}
              accessibilityRole="link"
              accessibilityLabel={strings(
                'social_leaderboard.trader_profile.twitter_link',
              )}
            >
              <Icon
                name={IconName.X}
                size={IconSize.Sm}
                color={IconColor.IconDefault}
              />
            </Pressable>
          ) : null}
        </Box>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings(
            followerCount === 1
              ? 'social_leaderboard.trader_profile.followers_count'
              : 'social_leaderboard.trader_profile.followers_count_plural',
            { count: followerCount },
          )}
        </Text>
      </Box>
    </Box>
  );
};

export default ProfileHeader;
