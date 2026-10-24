import {
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import UsernameShuffleDie from './UsernameShuffleDie';
import type { UsernameStatus } from './profileOnboardingDraft';

export interface UsernameClaimStepProps {
  username: string;
  displayName: string;
  usernameStatus: UsernameStatus;
  usernameClaimError: string | null;
  onUsernameChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onShuffleUsername: () => void;
}

/** Username and display-name fields on the manual profile-claim step. */
const UsernameClaimStep: React.FC<UsernameClaimStepProps> = ({
  username,
  displayName,
  usernameStatus,
  usernameClaimError,
  onUsernameChange,
  onDisplayNameChange,
  onShuffleUsername,
}) => (
  <Box gap={4} testID={SocialProfileOnboardingSelectorsIDs.USERNAME_STEP}>
    <Text
      variant={TextVariant.DisplayMd}
      fontWeight={FontWeight.Medium}
      twClassName="text-center leading-heading-lg pt-2"
    >
      {strings('social_leaderboard.profile_onboarding.claim_username')}
    </Text>
    <Box gap={2}>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('social_leaderboard.profile_onboarding.username_label')}
      </Text>
      <TextField
        value={username}
        onChangeText={onUsernameChange}
        isError={usernameStatus === 'invalid' || Boolean(usernameClaimError)}
        startAccessory={
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            @
          </Text>
        }
        endAccessory={
          <UsernameShuffleDie
            onPress={onShuffleUsername}
            accessibilityLabel={strings(
              'social_leaderboard.profile_onboarding.shuffle_username',
            )}
            testID={SocialProfileOnboardingSelectorsIDs.SHUFFLE_USERNAME_BUTTON}
          />
        }
        inputProps={{
          autoCapitalize: 'none',
          autoCorrect: false,
          testID: SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT,
        }}
      />
      {usernameClaimError ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          testID={SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS}
        >
          {usernameClaimError}
        </Text>
      ) : null}
      {usernameStatus === 'available' && !usernameClaimError ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.SuccessDefault}
          testID={SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS}
        >
          {strings('social_leaderboard.profile_onboarding.username_available')}
        </Text>
      ) : null}
      {usernameStatus === 'invalid' ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          testID={SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS}
        >
          {strings('social_leaderboard.profile_onboarding.username_invalid')}
        </Text>
      ) : null}
    </Box>
    <Box gap={2}>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('social_leaderboard.profile_onboarding.display_name_label')}
      </Text>
      <TextField
        value={displayName}
        onChangeText={onDisplayNameChange}
        endAccessory={
          displayName.trim() ? (
            <Icon
              name={IconName.Check}
              size={IconSize.Sm}
              color={IconColor.PrimaryDefault}
            />
          ) : undefined
        }
        inputProps={{
          autoCapitalize: 'words',
          testID: SocialProfileOnboardingSelectorsIDs.DISPLAY_NAME_INPUT,
        }}
      />
    </Box>
  </Box>
);

export default UsernameClaimStep;
