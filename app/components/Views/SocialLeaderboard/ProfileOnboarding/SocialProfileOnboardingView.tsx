import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  SafeAreaInsetsContext,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { useHaptics } from '../../../../util/haptics';
import { getSessionProfileId } from '../../../../util/notifications/utils/get-session-profile-id';
import MarketingMoment from '../../../UI/MarketingMoment';
import { useProfileController } from '../ManageProfileView/hooks/useProfileController';
import Foxicon from '../../../../component-library/components-temp/Foxicon';
import { PROFILE_AVATAR_PRESETS } from '../MyProfileView/avatarPresets';
import ProfileAvatar from '../MyProfileView/components/ProfileAvatar';
import { saveLocalSocialProfile } from '../MyProfileView/hooks/localSocialProfileStore';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import {
  SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID,
  applyXOnboardingProfile,
  startManualOnboarding,
  buildCreateProfileParams,
  buildOnboardedSocialProfile,
  canContinueUsernameStep,
  createInitialOnboardingDraft,
  displayNameFromUsername,
  getUsernameStatus,
  normalizeUsername,
  type ProfileOnboardingDraft,
  type ProfileOnboardingPath,
  type ProfileOnboardingStep,
} from './profileOnboardingDraft';
import ProfileOnboardingIntroAnimation from './ProfileOnboardingIntroAnimation';
import ProfileReadyAnimation from './ProfileReadyAnimation';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import { useLinkableSocialAccounts } from '../hooks/useLinkableSocialAccounts';
import AvatarBackgroundCarousel from './AvatarBackgroundCarousel';
import {
  generateUsername,
  generateUsernameWithNumber,
} from './generateUsername';
import LinkedAccountPicker from './LinkedAccountPicker';
import UsernameShuffleDie from './UsernameShuffleDie';
import XProfileIdentityStep from './XProfileIdentityStep';

const AVATAR_TILE_SIZE = 60;
/** Four 60pt tiles with 20pt gaps. */
const AVATAR_GRID_WIDTH = 300;
/** Wait until typing pauses before asking if a handle is free. */
const USERNAME_CHECK_DEBOUNCE_MS = 400;

/**
 * `superseded` means a newer check started before this one finished. That is
 * not the same as the name being taken, and callers must not replace the draft.
 */
type UsernameCheckOutcome = 'available' | 'unavailable' | 'superseded';

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

const MANUAL_PROGRESS_SEGMENT_COUNT = 4;
const X_PROGRESS_SEGMENT_COUNT = 3;

const progressSegmentCount = (path: ProfileOnboardingPath): number =>
  path === 'x' ? X_PROGRESS_SEGMENT_COUNT : MANUAL_PROGRESS_SEGMENT_COUNT;

const progressFilledCount = (
  step: ProfileOnboardingStep,
  path: ProfileOnboardingPath,
): number => {
  if (path === 'x') {
    switch (step) {
      case 'x-identity':
      case 'avatar':
        return 1;
      case 'account':
        return 2;
      case 'ready':
        return 3;
      default:
        return 0;
    }
  }

  switch (step) {
    case 'username':
      return 1;
    case 'avatar':
      return 2;
    case 'account':
      return 3;
    case 'ready':
      return 4;
    default:
      return 0;
  }
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
 * No bottom padding: the 56px header centers its 24px icons, which puts the
 * arrow and close button 16px below this bar.
 */
const OnboardingProgress: React.FC<{
  step: ProfileOnboardingStep;
  path: ProfileOnboardingPath;
  topInset: number;
}> = ({ step, path, topInset }) => {
  const filledCount = progressFilledCount(step, path);
  const segmentCount = progressSegmentCount(path);
  if (filledCount === 0) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      gap={1}
      paddingHorizontal={4}
      style={{ paddingTop: topInset + 8 }}
      testID={SocialProfileOnboardingSelectorsIDs.PROGRESS}
    >
      {Array.from({ length: segmentCount }, (_, index) => (
        <Box
          key={`progress-${index}`}
          twClassName="flex-1 h-1 rounded-full bg-muted overflow-hidden"
          testID={`${SocialProfileOnboardingSelectorsIDs.PROGRESS}-segment-${index}`}
        >
          <Box
            twClassName={`h-full bg-icon-default ${
              index < filledCount ? 'w-full' : 'w-0'
            }`}
          />
        </Box>
      ))}
    </Box>
  );
};

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
  imageUrl?: string | null;
  handle: string;
}> = ({ avatarPresetId, avatarBackgroundId, imageUrl, handle }) => (
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
          imageUrl={imageUrl}
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
  const introInsets = useMemo(
    () => ({ top: 0, bottom: 0, left: insets.left, right: insets.right }),
    [insets.left, insets.right],
  );
  const accounts = useLinkableSocialAccounts();
  const { playSelection } = useHaptics();
  const { checkUsernameAvailability, createProfile } = useProfileController();
  const [step, setStep] = useState<ProfileOnboardingStep>('intro');
  const [draft, setDraft] = useState<ProfileOnboardingDraft>(
    createInitialOnboardingDraft,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameClaimError, setUsernameClaimError] = useState<string | null>(
    null,
  );
  const [finishError, setFinishError] = useState<string | null>(null);
  const usernameCheckId = useRef(0);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearUsernameCheckTimer = useCallback(() => {
    if (usernameCheckTimer.current) {
      clearTimeout(usernameCheckTimer.current);
      usernameCheckTimer.current = null;
    }
  }, []);

  useEffect(() => clearUsernameCheckTimer, [clearUsernameCheckTimer]);

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
        case 'x-identity':
          return 'intro';
        case 'avatar':
          return draft.path === 'x' ? 'x-identity' : 'username';
        case 'account':
          return draft.path === 'x' ? 'x-identity' : 'avatar';
        case 'ready':
          return 'account';
        default:
          return current;
      }
    });
  }, [draft.path]);

  const applyUsername = useCallback((username: string) => {
    setUsernameClaimError(null);
    setDraft((current) => ({
      ...current,
      username,
      displayName: current.displayNameEdited
        ? current.displayName
        : displayNameFromUsername(username),
    }));
  }, []);

  const checkHandle = useCallback(
    async (username: string): Promise<UsernameCheckOutcome> => {
      const requestId = ++usernameCheckId.current;
      try {
        const availability = await checkUsernameAvailability(username);
        if (requestId !== usernameCheckId.current) {
          return 'superseded';
        }
        if (!availability.available || !availability.valid) {
          setUsernameClaimError(
            strings(
              'social_leaderboard.profile_onboarding.username_unavailable',
            ),
          );
          return 'unavailable';
        }
        setUsernameClaimError(null);
        return 'available';
      } catch {
        if (requestId !== usernameCheckId.current) {
          return 'superseded';
        }
        setUsernameClaimError(
          strings('social_leaderboard.profile_onboarding.username_check_error'),
        );
        return 'unavailable';
      }
    },
    [checkUsernameAvailability],
  );

  const scheduleUsernameCheck = useCallback(
    (username: string) => {
      clearUsernameCheckTimer();
      if (getUsernameStatus(username) !== 'available') {
        usernameCheckId.current += 1;
        return;
      }
      usernameCheckTimer.current = setTimeout(() => {
        checkHandle(username).catch(() => undefined);
      }, USERNAME_CHECK_DEBOUNCE_MS);
    },
    [checkHandle, clearUsernameCheckTimer],
  );

  const handleUsernameChange = useCallback(
    (value: string) => {
      const username = value.replace(/^@+/, '');
      applyUsername(username);
      scheduleUsernameCheck(normalizeUsername(username));
    },
    [applyUsername, scheduleUsernameCheck],
  );

  const handleShuffleUsername = useCallback(() => {
    clearUsernameCheckTimer();
    const claimGeneratedUsername = async () => {
      let username = generateUsername();
      applyUsername(username);
      // Only a completed "taken" result may replace the handle. A superseded
      // check returns after the user has moved on, and must leave the draft.
      if ((await checkHandle(username)) !== 'unavailable') {
        return;
      }
      username = generateUsernameWithNumber();
      applyUsername(username);
      await checkHandle(username);
    };
    claimGeneratedUsername().catch(() => undefined);
  }, [applyUsername, checkHandle, clearUsernameCheckTimer]);

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

  const handleConnectX = useCallback(() => {
    playSelection().catch(() => undefined);
    setDraft((current) => applyXOnboardingProfile(current));
    setStep('x-identity');
  }, [playSelection]);

  const handleCreateManually = useCallback(() => {
    playSelection().catch(() => undefined);
    setUsernameClaimError(null);
    setDraft((current) => startManualOnboarding(current));
    setStep('username');
  }, [playSelection]);

  const handleToggleXUsername = useCallback(
    (enabled: boolean) => {
      playSelection().catch(() => undefined);
      setUsernameClaimError(null);
      if (enabled) {
        setDraft((current) => ({
          ...current,
          useXUsername: true,
          username: current.xUsername ?? current.username,
        }));
        return;
      }

      const nextUsername =
        draft.username === draft.xUsername
          ? generateUsername()
          : draft.username;
      setDraft((current) => ({
        ...current,
        useXUsername: false,
        username: nextUsername,
      }));
      scheduleUsernameCheck(normalizeUsername(nextUsername));
    },
    [draft.username, draft.xUsername, playSelection, scheduleUsernameCheck],
  );

  const handleToggleXAvatar = useCallback(
    (enabled: boolean) => {
      playSelection().catch(() => undefined);
      setDraft((current) => ({ ...current, useXAvatar: enabled }));
    },
    [playSelection],
  );

  const handleContinue = useCallback(async () => {
    playSelection().catch(() => undefined);
    if (step !== 'username' && step !== 'x-identity') {
      setStep((current) => {
        switch (current) {
          case 'avatar':
            return draft.path === 'x' ? 'x-identity' : 'account';
          case 'account':
            return 'ready';
          default:
            return current;
        }
      });
      return;
    }

    clearUsernameCheckTimer();
    setUsernameClaimError(null);
    setIsSubmitting(true);
    try {
      const outcome = await checkHandle(normalizeUsername(draft.username));
      if (outcome !== 'available') {
        return;
      }
      setStep(step === 'x-identity' ? 'account' : 'avatar');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    checkHandle,
    clearUsernameCheckTimer,
    draft.path,
    draft.username,
    playSelection,
    step,
  ]);

  const handleFinish = useCallback(async () => {
    setFinishError(null);
    setIsSubmitting(true);
    try {
      const profileId =
        (await getSessionProfileId()) ?? SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID;
      await createProfile(buildCreateProfileParams(draft, profileId));
      saveLocalSocialProfile(buildOnboardedSocialProfile(draft));
      navigation.navigate(
        draft.path === 'x' ? Routes.SOCIAL.MY_PROFILE : Routes.SOCIAL.V1,
      );
    } catch {
      setFinishError(
        strings('social_leaderboard.profile_onboarding.save_error'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [createProfile, draft, navigation]);

  const usernameStatus = getUsernameStatus(draft.username);
  const username = normalizeUsername(draft.username);
  const continueDisabled =
    ((step === 'username' || step === 'x-identity') &&
      !canContinueUsernameStep(draft)) ||
    (step === 'account' && !draft.linkedAccountId);
  const readyImageUrl =
    draft.useXAvatar && draft.xAvatarUrl ? draft.xAvatarUrl : null;

  return (
    <SafeAreaView
      edges={[...SCROLLABLE_SCREEN_SAFE_AREA_EDGES, 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={SocialProfileOnboardingSelectorsIDs.CONTAINER}
    >
      {step === 'intro' ? (
        <Box style={{ paddingTop: insets.top }} />
      ) : (
        <OnboardingProgress
          step={step}
          path={draft.path}
          topInset={insets.top}
        />
      )}
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
            <SafeAreaInsetsContext.Provider value={introInsets}>
              <MarketingMoment
                testID={SocialProfileOnboardingSelectorsIDs.INTRO}
                title={strings(
                  'social_leaderboard.profile_onboarding.intro_title',
                )}
                titleProps={{
                  testID: SocialProfileOnboardingSelectorsIDs.INTRO_TITLE,
                  twClassName: 'px-1',
                }}
                artwork={
                  <ProfileOnboardingIntroAnimation
                    fallback={<LiveActivityFallback />}
                  />
                }
                artworkWrapperProps={{
                  alignItems: BoxAlignItems.Stretch,
                  paddingHorizontal: 0,
                }}
                artworkWrapperAnimatedViewProps={{
                  entering: undefined,
                }}
                primaryAction={{
                  label: strings(
                    'social_leaderboard.profile_onboarding.connect_x',
                  ),
                  startIconName: IconName.X,
                  onPress: handleConnectX,
                  testID: SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON,
                }}
                secondaryAction={{
                  label: strings(
                    'social_leaderboard.profile_onboarding.create_manually',
                  ),
                  onPress: handleCreateManually,
                  testID:
                    SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
                }}
              />
            </SafeAreaInsetsContext.Provider>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
            >
              {step === 'x-identity' ? (
                <XProfileIdentityStep
                  draft={draft}
                  usernameStatus={usernameStatus}
                  usernameClaimError={usernameClaimError}
                  onToggleUsername={handleToggleXUsername}
                  onToggleAvatar={handleToggleXAvatar}
                  onUsernameChange={handleUsernameChange}
                  onShuffleUsername={handleShuffleUsername}
                  onEditAvatar={() => {
                    playSelection().catch(() => undefined);
                    setStep('avatar');
                  }}
                />
              ) : null}

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
                      isError={
                        usernameStatus === 'invalid' ||
                        Boolean(usernameClaimError)
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
                    {usernameClaimError ? (
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.ErrorDefault}
                        testID={
                          SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS
                        }
                      >
                        {usernameClaimError}
                      </Text>
                    ) : null}
                    {usernameStatus === 'available' && !usernameClaimError ? (
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.SuccessDefault}
                        testID={
                          SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS
                        }
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
                          <Foxicon
                            variant={preset.id}
                            size={AVATAR_TILE_SIZE * 0.85}
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
                  twClassName="flex-1"
                  testID={SocialProfileOnboardingSelectorsIDs.ACCOUNT_STEP}
                >
                  <OnboardingTitle twClassName="pt-2">
                    {strings(
                      'social_leaderboard.profile_onboarding.link_account',
                    )}
                  </OnboardingTitle>
                  <LinkedAccountPicker
                    accounts={accounts}
                    selectedAccountId={draft.linkedAccountId}
                    onSelect={(account) => {
                      playSelection().catch(() => undefined);
                      setDraft((current) => ({
                        ...current,
                        linkedAccountId: account.id,
                        linkedAccountAddress: account.address,
                      }));
                    }}
                  />
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
                    avatarBackgroundId={draft.avatarBackgroundId}
                    imageUrl={readyImageUrl}
                    isVerified={draft.path === 'x'}
                    fallback={
                      <ReadyCardFallback
                        avatarPresetId={draft.avatarPresetId}
                        avatarBackgroundId={draft.avatarBackgroundId}
                        imageUrl={readyImageUrl}
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
              {finishError ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                  twClassName="text-center pb-3"
                >
                  {finishError}
                </Text>
              ) : null}
              {step === 'ready' ? (
                <Button
                  variant={ButtonVariant.Primary}
                  isFullWidth
                  isLoading={isSubmitting}
                  onPress={() => {
                    handleFinish().catch(() => undefined);
                  }}
                  testID={SocialProfileOnboardingSelectorsIDs.LETS_GO_BUTTON}
                >
                  {strings(
                    draft.path === 'x'
                      ? 'social_leaderboard.profile_onboarding.view_profile'
                      : 'social_leaderboard.profile_onboarding.lets_go',
                  )}
                </Button>
              ) : (
                <Button
                  variant={ButtonVariant.Primary}
                  isFullWidth
                  isDisabled={continueDisabled || isSubmitting}
                  isLoading={isSubmitting}
                  onPress={() => {
                    handleContinue().catch(() => undefined);
                  }}
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
