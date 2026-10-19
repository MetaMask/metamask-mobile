import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Switch, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { strings } from '../../../../../locales/i18n';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../util/deviceCapability/types';
import { useTheme } from '../../../../util/theme';
import ProfileAvatar from '../MyProfileView/components/ProfileAvatar';
import type {
  ProfileOnboardingDraft,
  UsernameStatus,
} from './profileOnboardingDraft';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import UsernameShuffleDie from './UsernameShuffleDie';

interface XProfileIdentityStepProps {
  draft: ProfileOnboardingDraft;
  usernameStatus: UsernameStatus;
  usernameClaimError: string | null;
  onToggleUsername: (enabled: boolean) => void;
  onToggleAvatar: (enabled: boolean) => void;
  onUsernameChange: (value: string) => void;
  onShuffleUsername: () => void;
  onEditAvatar: () => void;
}

const IdentityToggle: React.FC<{
  label: string;
  value: boolean;
  onValueChange: (enabled: boolean) => void;
  testID: string;
}> = ({ label, value, onValueChange, testID }) => {
  const { brandColors, colors } = useTheme();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      gap={3}
    >
      <Text variant={TextVariant.BodyMd} twClassName="flex-1">
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        ios_backgroundColor={colors.border.muted}
        thumbColor={brandColors.white}
        trackColor={{
          false: colors.border.muted,
          true: colors.primary.default,
        }}
        testID={testID}
      />
    </Box>
  );
};

/**
 * X connect identity step. Reuses the manual username field and fox avatar,
 * and offers toggles to keep the X handle and profile picture.
 */
/** Matches the identity-step avatar in the X onboarding design. */
const X_IDENTITY_AVATAR_DIAMETER = 120;
const CROSSFADE_MS = 240;

/**
 * A local opacity crossfade. Skip it with Reduce Motion, and on a low-end
 * device over slow cellular, where the capability matrix asks for less motion.
 * Offline does not matter: nothing is fetched.
 */
const shouldCrossfade = (
  reducedMotion: boolean | null,
  hardware: HardwareTier | null,
  network: NetworkTier | null,
): boolean =>
  reducedMotion !== true &&
  !(hardware === 'LOW' && network === 'SLOW_CELLULAR');

const CrossDissolve: React.FC<{
  /** When true, `primary` is shown. Otherwise `secondary`. */
  showPrimary: boolean;
  primary: React.ReactNode;
  secondary: React.ReactNode;
  alignItems?: 'center' | 'stretch';
}> = ({ showPrimary, primary, secondary, alignItems = 'stretch' }) => {
  const tw = useTailwind();
  const reducedMotion = useReducedMotion();
  const networkTier = useNetworkTier();
  const hardwareTier = useMemo(() => getHardwareTier(), []);
  const animate = shouldCrossfade(reducedMotion, hardwareTier, networkTier);
  const progress = useSharedValue(showPrimary ? 1 : 0);
  const primaryHeight = useSharedValue(0);
  const secondaryHeight = useSharedValue(0);
  const [keepPrimary, setKeepPrimary] = useState(showPrimary);
  const [keepSecondary, setKeepSecondary] = useState(!showPrimary);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }

    if (!animate) {
      progress.value = showPrimary ? 1 : 0;
      setKeepPrimary(showPrimary);
      setKeepSecondary(!showPrimary);
      return;
    }

    setKeepPrimary(true);
    setKeepSecondary(true);
    progress.value = withTiming(
      showPrimary ? 1 : 0,
      {
        duration: CROSSFADE_MS,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        if (!finished) {
          return;
        }
        scheduleOnRN(setKeepPrimary, showPrimary);
        scheduleOnRN(setKeepSecondary, !showPrimary);
      },
    );
  }, [animate, progress, showPrimary]);

  const frameStyle = useAnimatedStyle(() => {
    const primarySize = primaryHeight.value;
    const secondarySize = secondaryHeight.value;
    if (primarySize === 0 && secondarySize === 0) {
      return { width: '100%' };
    }
    if (primarySize === 0) {
      return { width: '100%', height: secondarySize };
    }
    if (secondarySize === 0) {
      return { width: '100%', height: primarySize };
    }
    return {
      width: '100%',
      height:
        primarySize * progress.value + secondarySize * (1 - progress.value),
    };
  });

  const primaryStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const secondaryStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  const overlay = keepPrimary && keepSecondary;
  const layerStyle = overlay
    ? {
        position: 'absolute' as const,
        left: 0,
        right: 0,
        top: 0,
      }
    : undefined;

  const rememberHeight =
    (shared: typeof primaryHeight) => (event: LayoutChangeEvent) => {
      shared.value = event.nativeEvent.layout.height;
    };

  return (
    <Animated.View style={frameStyle}>
      {keepPrimary ? (
        <Animated.View
          pointerEvents={showPrimary ? 'auto' : 'none'}
          accessibilityElementsHidden={!showPrimary}
          style={[
            layerStyle,
            tw.style(
              'w-full',
              alignItems === 'center' ? 'items-center' : 'items-stretch',
            ),
            overlay ? primaryStyle : undefined,
          ]}
          onLayout={rememberHeight(primaryHeight)}
        >
          {primary}
        </Animated.View>
      ) : null}
      {keepSecondary ? (
        <Animated.View
          pointerEvents={showPrimary ? 'none' : 'auto'}
          accessibilityElementsHidden={showPrimary}
          style={[
            layerStyle,
            tw.style(
              'w-full',
              alignItems === 'center' ? 'items-center' : 'items-stretch',
            ),
            overlay ? secondaryStyle : undefined,
          ]}
          onLayout={rememberHeight(secondaryHeight)}
        >
          {secondary}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const XProfileIdentityStep: React.FC<XProfileIdentityStepProps> = ({
  draft,
  usernameStatus,
  usernameClaimError,
  onToggleUsername,
  onToggleAvatar,
  onUsernameChange,
  onShuffleUsername,
  onEditAvatar,
}) => {
  const tw = useTailwind();
  const xUsername = draft.xUsername ?? '';

  return (
    <Box
      twClassName="flex-1"
      testID={SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP}
    >
      <Text
        variant={TextVariant.DisplayMd}
        fontWeight={FontWeight.Bold}
        twClassName="w-full text-center px-2"
      >
        {strings('social_leaderboard.profile_onboarding.choose_x_identity')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="w-full text-center pt-3"
      >
        {strings(
          'social_leaderboard.profile_onboarding.choose_x_identity_description',
        )}
      </Text>

      <Box alignItems={BoxAlignItems.Center} twClassName="pt-10 w-full" gap={4}>
        <CrossDissolve
          showPrimary={draft.useXAvatar}
          alignItems="center"
          primary={
            <ProfileAvatar
              imageUrl={draft.xAvatarUrl}
              avatarPresetId={draft.avatarPresetId}
              avatarBackgroundId={draft.avatarBackgroundId}
              size="xl"
              diameter={X_IDENTITY_AVATAR_DIAMETER}
              testID={SocialProfileOnboardingSelectorsIDs.X_AVATAR}
            />
          }
          secondary={
            <Box>
              <ProfileAvatar
                avatarPresetId={draft.avatarPresetId}
                avatarBackgroundId={draft.avatarBackgroundId}
                size="xl"
                diameter={X_IDENTITY_AVATAR_DIAMETER}
                testID={SocialProfileOnboardingSelectorsIDs.X_AVATAR}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={strings(
                  'social_leaderboard.profile_onboarding.edit_avatar',
                )}
                onPress={onEditAvatar}
                testID={SocialProfileOnboardingSelectorsIDs.EDIT_AVATAR_BUTTON}
                style={tw.style(
                  'absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-default border border-muted items-center justify-center',
                )}
              >
                <Icon name={IconName.Edit} size={IconSize.Sm} />
              </Pressable>
            </Box>
          }
        />

        <CrossDissolve
          showPrimary={draft.useXUsername}
          alignItems="stretch"
          primary={
            <Box alignItems={BoxAlignItems.Center} gap={1}>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
              >
                <Text
                  variant={TextVariant.HeadingMd}
                  testID={SocialProfileOnboardingSelectorsIDs.X_DISPLAY_NAME}
                >
                  {draft.xDisplayName}
                </Text>
                <Icon
                  name={IconName.VerifiedFilled}
                  size={IconSize.Sm}
                  twClassName="text-info-default"
                />
              </Box>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                testID={SocialProfileOnboardingSelectorsIDs.X_HANDLE}
              >
                @{xUsername}
              </Text>
              {usernameClaimError ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                  twClassName="text-center"
                  testID={SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS}
                >
                  {usernameClaimError}
                </Text>
              ) : null}
            </Box>
          }
          secondary={
            <Box twClassName="self-stretch" gap={2}>
              <TextField
                value={draft.username}
                onChangeText={onUsernameChange}
                isError={
                  usernameStatus === 'invalid' || Boolean(usernameClaimError)
                }
                startAccessory={
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    @
                  </Text>
                }
                endAccessory={
                  <UsernameShuffleDie
                    onPress={onShuffleUsername}
                    accessibilityLabel={strings(
                      'social_leaderboard.profile_onboarding.shuffle_username',
                    )}
                    testID={
                      SocialProfileOnboardingSelectorsIDs.SHUFFLE_USERNAME_BUTTON
                    }
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
                  {strings(
                    'social_leaderboard.profile_onboarding.username_available',
                  )}
                </Text>
              ) : null}
              {usernameStatus === 'invalid' ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                  testID={SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS}
                >
                  {strings(
                    'social_leaderboard.profile_onboarding.username_invalid',
                  )}
                </Text>
              ) : null}
            </Box>
          }
        />
      </Box>

      <Box twClassName="mt-auto w-full pt-10 pb-4" gap={5}>
        <IdentityToggle
          label={strings(
            'social_leaderboard.profile_onboarding.use_x_username',
            { username: xUsername },
          )}
          value={draft.useXUsername}
          onValueChange={onToggleUsername}
          testID={SocialProfileOnboardingSelectorsIDs.USE_X_USERNAME_SWITCH}
        />
        <IdentityToggle
          label={strings('social_leaderboard.profile_onboarding.use_x_avatar')}
          value={draft.useXAvatar}
          onValueChange={onToggleAvatar}
          testID={SocialProfileOnboardingSelectorsIDs.USE_X_AVATAR_SWITCH}
        />
      </Box>
    </Box>
  );
};

export default XProfileIdentityStep;
