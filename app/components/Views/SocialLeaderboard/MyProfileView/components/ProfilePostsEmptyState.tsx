import {
  Box,
  BoxAlignItems,
  Button,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import superheroAvatar from '../../../../../images/socialV1/superhero.png';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';

interface ProfilePostsEmptyStateProps {
  onShareFirstTrade: () => void;
  onResetProfile: () => void;
}

const ProfilePostsEmptyState: React.FC<ProfilePostsEmptyStateProps> = ({
  onShareFirstTrade,
  onResetProfile,
}) => {
  const tw = useTailwind();

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      paddingHorizontal={4}
      paddingTop={5}
      paddingBottom={4}
      testID={MyProfileViewSelectorsIDs.EMPTY_STATE}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        twClassName="relative w-full h-52"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          twClassName="absolute left-8 top-6"
          variant={TextVariant.HeadingLg}
        >
          🦊
        </Text>
        <Text
          twClassName="absolute right-8 top-4"
          variant={TextVariant.HeadingLg}
        >
          🦊
        </Text>
        <Text
          twClassName="absolute right-7 bottom-4"
          variant={TextVariant.HeadingLg}
        >
          🦊
        </Text>
        <Box
          twClassName="rounded-full bg-primary-default px-5 py-2"
          marginBottom={2}
        >
          <Text
            variant={TextVariant.BodyLg}
            fontWeight={FontWeight.Medium}
            color={TextColor.PrimaryInverse}
          >
            {strings('social_leaderboard.my_profile.first_trade_prompt')}
          </Text>
        </Box>
        <Box twClassName="rounded-full border-4 border-primary-default p-1">
          <Image
            source={superheroAvatar}
            style={tw.style('w-24 h-24 rounded-full')}
          />
        </Box>
      </Box>

      <Text
        variant={TextVariant.HeadingLg}
        fontWeight={FontWeight.Bold}
        twClassName="text-center"
      >
        {strings('social_leaderboard.my_profile.empty_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center pt-2"
      >
        {strings('social_leaderboard.my_profile.empty_description')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center pt-5"
      >
        {strings('social_leaderboard.my_profile.empty_fee_description')}
      </Text>

      <Button
        variant={ButtonVariant.Primary}
        isFullWidth
        endIconName={IconName.Arrow2Right}
        onPress={onShareFirstTrade}
        twClassName="mt-3"
        testID={MyProfileViewSelectorsIDs.SHARE_FIRST_TRADE_BUTTON}
      >
        {strings('social_leaderboard.my_profile.share_first_trade')}
      </Button>
      <Button
        variant={ButtonVariant.Tertiary}
        isFullWidth
        onPress={onResetProfile}
        testID={MyProfileViewSelectorsIDs.DEBUG_RESET_PROFILE_BUTTON}
      >
        {strings('social_leaderboard.my_profile.debug_reset_profile')}
      </Button>
    </Box>
  );
};

export default ProfilePostsEmptyState;
