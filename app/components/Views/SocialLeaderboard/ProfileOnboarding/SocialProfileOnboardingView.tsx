import {
  AvatarAccount,
  AvatarAccountSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  RadioButton,
  Switch,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { useHaptics } from '../../../../util/haptics';
import { PROFILE_AVATAR_PRESETS } from '../MyProfileView/avatarPresets';
import ProfileAvatar, {
  ProfileAvatarArt,
} from '../MyProfileView/components/ProfileAvatar';
import { saveLocalSocialProfile } from '../MyProfileView/hooks/localSocialProfileStore';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import {
  buildOnboardedSocialProfile,
  canContinueUsernameStep,
  createInitialOnboardingDraft,
  displayNameFromUsername,
  getUsernameStatus,
  nextUsernameSuggestion,
  normalizeUsername,
  type ProfileOnboardingDraft,
  type ProfileOnboardingStep,
} from './profileOnboardingDraft';
import ProfileOnboardingIntroAnimation from './ProfileOnboardingIntroAnimation';
import ProfileReadyAnimation from './ProfileReadyAnimation';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import { useSocialOnboardingAccounts } from './useSocialOnboardingAccounts';
import AvatarBackgroundCarousel from './AvatarBackgroundCarousel';

const AVATAR_TILE_SIZE = 60;
/** Four 60pt tiles with 20pt gaps. */
const AVATAR_GRID_WIDTH = 300;

const LIVE_ACTIVITY = [
  {
    id: 'jilio',
    name: 'Jilio',
    action: 'bought' as const,
    asset: 'SOL',
    emoji: '🦊',
    seconds: null,
  },
  {
    id: 'sebastian',
    name: 'Sebastian',
    action: 'sold' as const,
    asset: 'ETH',
    emoji: '🐱',
    seconds: 2,
  },
  {
    id: 'pain',
    name: 'Pain',
    action: 'bought' as const,
    asset: 'BONK',
    emoji: '😎',
    seconds: 3,
  },
];

const progressFill = (
  step: ProfileOnboardingStep,
): readonly (0 | 0.5 | 1)[] => {
  switch (step) {
    case 'intro':
    case 'username':
      return [1, 0, 0];
    case 'avatar':
      return [1, 1, 0];
    case 'account':
      return [1, 1, 0.5];
    case 'ready':
      return [1, 1, 1];
    default:
      return [0, 0, 0];
  }
};

const fillClassName = (fill: 0 | 0.5 | 1): string => {
  if (fill === 1) {
    return 'w-full';
  }
  if (fill === 0.5) {
    return 'w-1/2';
  }
  return 'w-0';
};

/**
 * Step title: Display Md size on the 32px heading line height, medium weight,
 * centered.
 */
const OnboardingTitle: React.FC<{
  children: React.ReactNode;
  twClassName?: string;
}> = ({ children, twClassName }) => (
  <Text
    variant={TextVariant.DisplayMd}
    fontWeight={FontWeight.Medium}
    twClassName={`text-center leading-heading-lg ${twClassName ?? ''}`}
  >
    {children}
  </Text>
);

/**
 * Sits above the header, so it carries the top inset. A static inset rather
 * than a safe-area edge, which recalculates mid push transition (TSA-970).
 */
const OnboardingProgress: React.FC<{
  step: ProfileOnboardingStep;
  topInset: number;
}> = ({ step, topInset }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    gap={1}
    paddingHorizontal={4}
    paddingBottom={4}
    style={{ paddingTop: topInset + 8 }}
    testID={SocialProfileOnboardingSelectorsIDs.PROGRESS}
  >
    {progressFill(step).map((fill, index) => (
      <Box
        key={`progress-${index}`}
        twClassName="flex-1 h-1 rounded-full bg-muted overflow-hidden"
      >
        <Box twClassName={`h-full bg-icon-default ${fillClassName(fill)}`} />
      </Box>
    ))}
  </Box>
);

const LiveActivityFallback: React.FC = () => (
  <Box
    twClassName="flex-1 justify-center px-8"
    gap={3}
    testID={SocialProfileOnboardingSelectorsIDs.INTRO_FALLBACK}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      twClassName="px-2"
    >
      <Box twClassName="w-2 h-2 rounded-full bg-error-default" />
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('social_leaderboard.profile_onboarding.live_activity')}
      </Text>
    </Box>
    {LIVE_ACTIVITY.map((trade) => (
      <Box
        key={trade.id}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        twClassName="bg-muted rounded-full px-3 py-2"
      >
        <Text variant={TextVariant.BodyLg}>{trade.emoji}</Text>
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {trade.name}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={
            trade.action === 'bought'
              ? TextColor.SuccessDefault
              : TextColor.ErrorDefault
          }
        >
          {strings(`social_leaderboard.profile_onboarding.${trade.action}`)}
        </Text>
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {trade.asset}
        </Text>
        <Box twClassName="flex-1" />
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {trade.seconds == null
            ? strings('social_leaderboard.profile_onboarding.just_now')
            : strings('social_leaderboard.profile_onboarding.seconds_ago', {
                count: trade.seconds,
              })}
        </Text>
      </Box>
    ))}
  </Box>
);

const ReadyCardFallback: React.FC<{
  avatarPresetId: string | null | undefined;
  avatarBackgroundId: string | null | undefined;
  handle: string;
}> = ({ avatarPresetId, avatarBackgroundId, handle }) => (
  <>
    <Text twClassName="absolute left-6 top-6" variant={TextVariant.HeadingLg}>
      🦊
    </Text>
    <Text twClassName="absolute right-8 top-10" variant={TextVariant.HeadingMd}>
      ✨
    </Text>
    <Text
      twClassName="absolute left-10 bottom-16"
      variant={TextVariant.HeadingMd}
    >
      🐱
    </Text>
    <Box
      alignItems={BoxAlignItems.Center}
      twClassName="pt-10"
      testID={SocialProfileOnboardingSelectorsIDs.READY_FALLBACK}
    >
      <Box twClassName="bg-success-muted rounded-full px-4 py-2 mb-2">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('social_leaderboard.profile_onboarding.hi')}
        </Text>
      </Box>
      <Box twClassName="rounded-full border-4 border-success-default p-1">
        <ProfileAvatar
          avatarPresetId={avatarPresetId}
          avatarBackgroundId={avatarBackgroundId}
          size="xl"
        />
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        twClassName="pt-3"
        testID={SocialProfileOnboardingSelectorsIDs.READY_HANDLE}
      >
        @{handle}
      </Text>
    </Box>
  </>
);

const SocialProfileOnboardingView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const accounts = useSocialOnboardingAccounts();
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const avatarVariant = getAvatarAccountVariant(avatarAccountType);
  const { playSelection } = useHaptics();
  const [step, setStep] = useState<ProfileOnboardingStep>('intro');
  const [draft, setDraft] = useState<ProfileOnboardingDraft>(
    createInitialOnboardingDraft,
  );

  useEffect(() => {
    if (accounts.length === 0) {
      return;
    }
    setDraft((current) => {
      if (current.linkedAccountId) {
        return current;
      }
      return {
        ...current,
        linkedAccountId: accounts[0].id,
        linkedAccountAddress: accounts[0].address,
      };
    });
  }, [accounts]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBack = useCallback(() => {
    setStep((current) => {
      switch (current) {
        case 'username':
          return 'intro';
        case 'avatar':
          return 'username';
        case 'account':
          return 'avatar';
        case 'ready':
          return 'account';
        default:
          return current;
      }
    });
  }, []);

  const handleUsernameChange = useCallback((value: string) => {
    const username = value.replace(/^@+/, '');
    setDraft((current) => ({
      ...current,
      username,
      displayName: current.displayNameEdited
        ? current.displayName
        : displayNameFromUsername(username),
    }));
  }, []);

  const handleShuffleUsername = useCallback(() => {
    setDraft((current) => {
      const username = nextUsernameSuggestion(current.username);
      return {
        ...current,
        username,
        displayName: current.displayNameEdited
          ? current.displayName
          : displayNameFromUsername(username),
      };
    });
  }, []);

  const handleDisplayNameChange = useCallback((value: string) => {
    setDraft((current) => ({
      ...current,
      displayName: value,
      displayNameEdited: true,
    }));
  }, []);

  const handleAvatarSelect = useCallback(
    (presetId: string) => {
      if (presetId === draft.avatarPresetId) {
        return;
      }
      playSelection().catch(() => undefined);
      setDraft((current) => ({ ...current, avatarPresetId: presetId }));
    },
    [draft.avatarPresetId, playSelection],
  );

  const handleAvatarBackgroundSelect = useCallback((backgroundId: string) => {
    setDraft((current) => ({ ...current, avatarBackgroundId: backgroundId }));
  }, []);

  const handleContinue = useCallback(() => {
    setStep((current) => {
      switch (current) {
        case 'username':
          return 'avatar';
        case 'avatar':
          return 'account';
        case 'account':
          return 'ready';
        default:
          return current;
      }
    });
  }, []);

  const handleFinish = useCallback(() => {
    saveLocalSocialProfile(buildOnboardedSocialProfile(draft));
    navigation.navigate(Routes.SOCIAL.V1);
  }, [draft, navigation]);

  const usernameStatus = getUsernameStatus(draft.username);
  const username = normalizeUsername(draft.username);
  const continueDisabled =
    (step === 'username' && !canContinueUsernameStep(draft)) ||
    (step === 'account' && !draft.linkedAccountId);

  return (
    <SafeAreaView
      edges={[...SCROLLABLE_SCREEN_SAFE_AREA_EDGES, 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={SocialProfileOnboardingSelectorsIDs.CONTAINER}
    >
      <OnboardingProgress step={step} topInset={insets.top} />
      <HeaderStandard
        title=""
        onBack={step === 'intro' ? undefined : handleBack}
        onClose={handleClose}
        backButtonProps={{
          testID: SocialProfileOnboardingSelectorsIDs.BACK_BUTTON,
        }}
        closeButtonProps={{
          testID: SocialProfileOnboardingSelectorsIDs.CLOSE_BUTTON,
        }}
        testID={SocialProfileOnboardingSelectorsIDs.HEADER}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw.style('flex-1')}
      >
        <Box twClassName="flex-1">
          {step === 'intro' ? (
            <Box
              twClassName="flex-1"
              testID={SocialProfileOnboardingSelectorsIDs.INTRO}
            >
              <OnboardingTitle twClassName="px-6 pt-4">
                {strings('social_leaderboard.profile_onboarding.intro_title')}
              </OnboardingTitle>
              <ProfileOnboardingIntroAnimation
                fallback={<LiveActivityFallback />}
              />
              <Box paddingHorizontal={4} paddingBottom={4} gap={3}>
                <Button
                  variant={ButtonVariant.Primary}
                  isFullWidth
                  startIconName={IconName.X}
                  onPress={() => undefined}
                  testID={SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON}
                >
                  {strings('social_leaderboard.profile_onboarding.connect_x')}
                </Button>
                <Button
                  variant={ButtonVariant.Tertiary}
                  isFullWidth
                  onPress={() => setStep('username')}
                  testID={
                    SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON
                  }
                >
                  {strings(
                    'social_leaderboard.profile_onboarding.create_manually',
                  )}
                </Button>
              </Box>
            </Box>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
            >
              {step === 'username' ? (
                <Box
                  gap={4}
                  testID={SocialProfileOnboardingSelectorsIDs.USERNAME_STEP}
                >
                  <OnboardingTitle twClassName="pt-2">
                    {strings(
                      'social_leaderboard.profile_onboarding.claim_username',
                    )}
                  </OnboardingTitle>
                  <Box gap={2}>
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {strings(
                        'social_leaderboard.profile_onboarding.username_label',
                      )}
                    </Text>
                    <TextField
                      value={draft.username}
                      onChangeText={handleUsernameChange}
                      isError={usernameStatus === 'invalid'}
                      startAccessory={
                        <Text
                          variant={TextVariant.BodyMd}
                          color={TextColor.TextAlternative}
                        >
                          @
                        </Text>
                      }
                      endAccessory={
                        <ButtonIcon
                          iconName={IconName.Refresh}
                          size={ButtonIconSize.Sm}
                          onPress={handleShuffleUsername}
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
                        testID:
                          SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT,
                      }}
                    />
                    {usernameStatus === 'available' ? (
                      <Box
                        flexDirection={BoxFlexDirection.Row}
                        alignItems={BoxAlignItems.Center}
                        gap={1}
                        testID={
                          SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS
                        }
                      >
                        <Icon
                          name={IconName.Check}
                          size={IconSize.Sm}
                          color={IconColor.SuccessDefault}
                        />
                        <Text
                          variant={TextVariant.BodySm}
                          color={TextColor.SuccessDefault}
                        >
                          {strings(
                            'social_leaderboard.profile_onboarding.username_available',
                            { handle: username },
                          )}
                        </Text>
                      </Box>
                    ) : null}
                    {usernameStatus === 'invalid' ? (
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.ErrorDefault}
                        testID={
                          SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS
                        }
                      >
                        {strings(
                          'social_leaderboard.profile_onboarding.username_invalid',
                        )}
                      </Text>
                    ) : null}
                  </Box>
                  <Box gap={2}>
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {strings(
                        'social_leaderboard.profile_onboarding.display_name_label',
                      )}
                    </Text>
                    <TextField
                      value={draft.displayName}
                      onChangeText={handleDisplayNameChange}
                      endAccessory={
                        draft.displayName.trim() ? (
                          <Icon
                            name={IconName.Check}
                            size={IconSize.Sm}
                            color={IconColor.PrimaryDefault}
                          />
                        ) : undefined
                      }
                      inputProps={{
                        autoCapitalize: 'words',
                        testID:
                          SocialProfileOnboardingSelectorsIDs.DISPLAY_NAME_INPUT,
                      }}
                    />
                  </Box>
                </Box>
              ) : null}

              {step === 'avatar' ? (
                <Box
                  alignItems={BoxAlignItems.Center}
                  testID={SocialProfileOnboardingSelectorsIDs.AVATAR_STEP}
                >
                  <OnboardingTitle twClassName="pb-14">
                    {strings(
                      'social_leaderboard.profile_onboarding.customize_avatar',
                    )}
                  </OnboardingTitle>
                  <AvatarBackgroundCarousel
                    avatarPresetId={draft.avatarPresetId}
                    selectedBackgroundId={draft.avatarBackgroundId}
                    onSelect={handleAvatarBackgroundSelect}
                  />
                  <Box
                    twClassName="flex-row flex-wrap justify-center gap-5 mt-11"
                    style={tw.style({ width: AVATAR_GRID_WIDTH })}
                  >
                    {PROFILE_AVATAR_PRESETS.map((preset) => {
                      const isSelected = draft.avatarPresetId === preset.id;
                      return (
                        <Pressable
                          key={preset.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          onPress={() => handleAvatarSelect(preset.id)}
                          testID={`${SocialProfileOnboardingSelectorsIDs.AVATAR_OPTION}-${preset.id}`}
                          style={tw.style(
                            'items-center justify-center rounded-full border',
                            isSelected ? 'border-icon-default' : 'border-muted',
                            {
                              width: AVATAR_TILE_SIZE,
                              height: AVATAR_TILE_SIZE,
                            },
                          )}
                        >
                          <ProfileAvatarArt
                            preset={preset}
                            sizePx={AVATAR_TILE_SIZE * 0.85}
                          />
                        </Pressable>
                      );
                    })}
                  </Box>
                </Box>
              ) : null}

              {step === 'account' ? (
                <Box
                  gap={4}
                  testID={SocialProfileOnboardingSelectorsIDs.ACCOUNT_STEP}
                >
                  <OnboardingTitle twClassName="pt-2">
                    {strings(
                      'social_leaderboard.profile_onboarding.link_account',
                    )}
                  </OnboardingTitle>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {strings(
                      'social_leaderboard.profile_onboarding.link_account_description',
                    )}
                  </Text>
                  <Box twClassName="bg-muted rounded-2xl overflow-hidden">
                    {accounts.map((account, index) => {
                      const isSelected = draft.linkedAccountId === account.id;
                      return (
                        <Pressable
                          key={account.id}
                          accessibilityRole="button"
                          onPress={() =>
                            setDraft((current) => ({
                              ...current,
                              linkedAccountId: account.id,
                              linkedAccountAddress: account.address,
                            }))
                          }
                          testID={`${SocialProfileOnboardingSelectorsIDs.ACCOUNT_ROW}-${account.id}`}
                        >
                          <Box
                            flexDirection={BoxFlexDirection.Row}
                            alignItems={BoxAlignItems.Center}
                            justifyContent={BoxJustifyContent.Between}
                            twClassName={`px-4 py-3 ${
                              index > 0 ? 'border-t border-muted' : ''
                            }`}
                          >
                            <Box
                              flexDirection={BoxFlexDirection.Row}
                              alignItems={BoxAlignItems.Center}
                              twClassName="flex-1 min-w-0 mr-3"
                              gap={3}
                            >
                              <AvatarAccount
                                address={account.address}
                                size={AvatarAccountSize.Md}
                                variant={avatarVariant}
                              />
                              <Box twClassName="flex-1 min-w-0">
                                <Text
                                  variant={TextVariant.BodyMd}
                                  fontWeight={FontWeight.Medium}
                                  numberOfLines={1}
                                >
                                  {account.name}
                                </Text>
                                {account.balanceLabel ? (
                                  <Text
                                    variant={TextVariant.BodySm}
                                    color={TextColor.TextAlternative}
                                  >
                                    {account.balanceLabel}
                                  </Text>
                                ) : null}
                              </Box>
                            </Box>
                            <RadioButton
                              isChecked={isSelected}
                              onPress={() =>
                                setDraft((current) => ({
                                  ...current,
                                  linkedAccountId: account.id,
                                  linkedAccountAddress: account.address,
                                }))
                              }
                            />
                          </Box>
                        </Pressable>
                      );
                    })}
                  </Box>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    justifyContent={BoxJustifyContent.Between}
                    gap={3}
                  >
                    <Box twClassName="flex-1" gap={1}>
                      <Text
                        variant={TextVariant.HeadingSm}
                        fontWeight={FontWeight.Bold}
                      >
                        {strings(
                          'social_leaderboard.profile_onboarding.share_trading_activity',
                        )}
                      </Text>
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {strings(
                          'social_leaderboard.profile_onboarding.share_trading_activity_description',
                        )}
                      </Text>
                    </Box>
                    <Switch
                      isOn={draft.shareTradingActivity}
                      onValueChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          shareTradingActivity: value,
                        }))
                      }
                      testID={
                        SocialProfileOnboardingSelectorsIDs.SHARE_ACTIVITY_SWITCH
                      }
                    />
                  </Box>
                </Box>
              ) : null}

              {step === 'ready' ? (
                <Box
                  twClassName="relative flex-1 items-center justify-center py-8"
                  testID={SocialProfileOnboardingSelectorsIDs.READY_STEP}
                >
                  <OnboardingTitle>
                    {strings(
                      'social_leaderboard.profile_onboarding.feed_awaits',
                    )}
                  </OnboardingTitle>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    twClassName="text-center pt-3 px-4"
                  >
                    {strings(
                      'social_leaderboard.profile_onboarding.feed_awaits_description',
                    )}
                  </Text>
                  <ProfileReadyAnimation
                    displayName={draft.displayName}
                    handle={username}
                    avatarPresetId={draft.avatarPresetId}
                    fallback={
                      <ReadyCardFallback
                        avatarPresetId={draft.avatarPresetId}
                        avatarBackgroundId={draft.avatarBackgroundId}
                        handle={username}
                      />
                    }
                  />
                </Box>
              ) : null}
            </ScrollView>
          )}

          {step !== 'intro' ? (
            <Box paddingHorizontal={4} paddingBottom={4}>
              {step === 'ready' ? (
                <Button
                  variant={ButtonVariant.Primary}
                  isFullWidth
                  onPress={handleFinish}
                  testID={SocialProfileOnboardingSelectorsIDs.LETS_GO_BUTTON}
                >
                  {strings('social_leaderboard.profile_onboarding.lets_go')}
                </Button>
              ) : (
                <Button
                  variant={ButtonVariant.Primary}
                  isFullWidth
                  isDisabled={continueDisabled}
                  onPress={handleContinue}
                  testID={SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON}
                >
                  {strings('social_leaderboard.profile_onboarding.continue')}
                </Button>
              )}
            </Box>
          ) : null}
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SocialProfileOnboardingView;
