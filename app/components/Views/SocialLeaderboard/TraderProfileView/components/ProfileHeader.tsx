import React, { useCallback } from 'react';
import { Linking, Pressable } from 'react-native';
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
import { strings } from '../../../../../../locales/i18n';
import type { TraderProfile } from '@metamask/social-controllers';
import { TraderProfileViewSelectorsIDs } from '../TraderProfileView.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../Homepage/Sections/TopTraders/components/TraderAvatar';

const AVATAR_SIZE = 40;

export interface ProfileHeaderProps {
  profile: TraderProfile;
  twitterHandle?: string | null;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  twitterHandle,
}) => {
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
      testID={TraderProfileViewSelectorsIDs.PROFILE_HEADER}
    >
      <TraderAvatar
        imageUrl={profile.imageUrl}
        address={profile.address}
        size={AVATAR_SIZE}
      />

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
      </Box>
    </Box>
  );
};

export default ProfileHeader;
