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
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import {
  SafeAreaInsetsContext,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { useHaptics } from '../../../../util/haptics';
import socialTermsOfUseContent from '../../../../util/termsOfUse/socialTermsOfUseContent';
import {
  connectX,
  XAuthError,
  XAuthErrorType,
} from '../../../../core/XAuthService';
import { getSessionProfileId } from '../../../../util/notifications/utils/get-session-profile-id';
import MarketingMoment from '../../../UI/MarketingMoment';
import MarketingMomentTitle from '../../../UI/MarketingMomentTitle';
import { useProfileController } from '../ManageProfileView/hooks/useProfileController';
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
  isUneditedXUsername,
  normalizeUsername,
  onboardingProfileFingerprint,
  type ProfileOnboardingDraft,
  type ProfileOnboardingPath,
  type ProfileOnboardingStep,
} from './profileOnboardingDraft';
import { getUsernameLocalError } from './utils/getUsernameLocalError';
import { getUsernameFeedback } from './utils/getUsernameFeedback';
import UsernameStatusLine from './UsernameStatusLine';
import OnboardingProgress from './OnboardingProgress';
import ProfileOnboardingIntroAnimation from './ProfileOnboardingIntroAnimation';
import ProfileReadyAnimation from './ProfileReadyAnimation';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import { useLinkableSocialAccounts } from '../hooks/useLinkableSocialAccounts';
import ProfileAvatarPicker from './ProfileAvatarPicker';
import {
  generateUsername,
  generateUsernameWithNumber,
  MAX_USERNAME_LENGTH,
} from './generateUsername';
import LinkedAccountPicker from './LinkedAccountPicker';
import UsernameShuffleDie from './UsernameShuffleDie';
import XProfileIdentityStep from './XProfileIdentityStep';
import { SocialEvent, useSocialScreenAnalytics } from '../analytics';
import SocialTermsSheet from '../terms/SocialTermsSheet';
import {
  acceptSocialTerms,
  hasAcceptedSocialTerms,
} from '../terms/socialTermsAcceptance';

const { Interaction, Outcome, Screen, Step } = SocialEvent;
// Future live source: https://metamask.com/terms-of-use
/** Wait until typing pauses before asking if a handle is free. */
const USERNAME_CHECK_DEBOUNCE_MS = 400;

/**
 * `superseded` means a newer check started before this one finished. That is
 * not the same as the name being taken, and callers must not replace the draft.
 */
type UsernameCheckOutcome = 'available' | 'unavailable' | 'superseded';

/**
 * A server answer for one handle. `taken` is the only result that means
 * another name should be suggested; `invalid` and `error` keep the name and
 * show why it can't be claimed yet.
 */
interface UsernameAvailability {
  status: 'available' | 'taken' | 'invalid' | 'error';
  claimError: string | null;
}

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

/**
 * Step title. Grotzec Cond Bold via the marketing-moment title, which is the
 * design-system hero face and falls back when the language is not in the font.
 * Spacing stays on the wrapper. The title paints its metrics as a style, so a
 * padding class on the text would lose to that style.
 */
const OnboardingTitle: React.FC<{
  children: React.ReactNode;
  twClassName?: string;
}> = ({ children, twClassName }) => (
  <Box twClassName={twClassName}>
    <MarketingMomentTitle
      variant={TextVariant.DisplayLg}
      twClassName="w-full text-center"
    >
      {children}
    </MarketingMomentTitle>
  </Box>
);

/**
 * "Connect [X logo] account". The logo stands in for the word X, so the
 * label is built from parts instead of one string. The button's text color
 * only reaches string children, so the parts set the primary inverse color.
 */
const ConnectXLabel: React.FC = () => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={1}
  >
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.PrimaryInverse}
    >
      {strings('social_leaderboard.profile_onboarding.connect_x_before_logo')}
    </Text>
    <Icon
      name={IconName.X}
      size={IconSize.Md}
      color={IconColor.PrimaryInverse}
      testID={SocialProfileOnboardingSelectorsIDs.CONNECT_X_LOGO}
    />
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.PrimaryInverse}
    >
      {strings('social_leaderboard.profile_onboarding.connect_x_after_logo')}
    </Text>
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
  const route =
    useRoute<RouteProp<RootStackParamList, 'SocialProfileOnboardingView'>>();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  // Zero the insets this screen already accounts for. MarketingMoment pads
  // from this context, so a second top or bottom inset would lift the actions.
  const introInsets = useMemo(
    () => ({ top: 0, bottom: 0, left: insets.left, right: insets.right }),
    [insets.left, insets.right],
  );
  const accounts = useLinkableSocialAccounts();
  const { playSelection } = useHaptics();
  const { checkUsernameAvailability, createProfile, updateProfile } =
    useProfileController();
  const [step, setStep] = useState<ProfileOnboardingStep>('intro');
  const [draft, setDraft] = useState<ProfileOnboardingDraft>(
    createInitialOnboardingDraft,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameClaimError, setUsernameClaimError] = useState<string | null>(
    null,
  );
  const [finishError, setFinishError] = useState<string | null>(null);
  // Path the user picked while the terms sheet is open; null when it is closed.
  const [pendingTermsPath, setPendingTermsPath] =
    useState<ProfileOnboardingPath | null>(null);
  const [pendingTermsOnly, setPendingTermsOnly] = useState(
    () => route.params?.termsOnly === true,
  );
  const [connectXError, setConnectXError] = useState<string | null>(null);
  const [isConnectingX, setIsConnectingX] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
  const analyticsStep = step === 'x-identity' ? Step.X_IDENTITY : step;
  const trackInteraction = useSocialScreenAnalytics(Screen.PROFILE_ONBOARDING, {
    step: analyticsStep,
  });
  const usernameCheckId = useRef(0);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileCreatedRef = useRef(false);
  /** Fingerprint of the profile already stored on the server. */
  const serverProfileFingerprintRef = useRef<string | null>(null);
  const syncPromiseRef = useRef<Promise<void> | null>(null);
  const startSyncRef = useRef<() => Promise<void>>(async () => undefined);
  const connectAbortRef = useRef<AbortController | null>(null);
  const draftRef = useRef(draft);
  const accountsRef = useRef(accounts);
  const stepRef = useRef(step);
  const previousStepRef = useRef(step);
  const createProfileRef = useRef(createProfile);
  const updateProfileRef = useRef(updateProfile);
  const trackInteractionRef = useRef(trackInteraction);
  draftRef.current = draft;
  accountsRef.current = accounts;
  stepRef.current = step;
  createProfileRef.current = createProfile;
  updateProfileRef.current = updateProfile;
  trackInteractionRef.current = trackInteraction;

  const clearUsernameCheckTimer = useCallback(() => {
    if (usernameCheckTimer.current) {
      clearTimeout(usernameCheckTimer.current);
      usernameCheckTimer.current = null;
    }
  }, []);

  useEffect(() => clearUsernameCheckTimer, [clearUsernameCheckTimer]);

  useEffect(() => {
    trackInteraction(Interaction.STEP_VIEWED);
  }, [analyticsStep, trackInteraction]);

  useEffect(() => {
    if (pendingTermsOnly) {
      trackInteraction(Interaction.SHEET_DISPLAYED, { step: Step.TERMS });
    }
  }, [pendingTermsOnly, trackInteraction]);

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

  const cancelConnectX = useCallback(() => {
    connectAbortRef.current?.abort();
    connectAbortRef.current = null;
  }, []);

  useEffect(() => cancelConnectX, [cancelConnectX]);

  const handleClose = useCallback(() => {
    cancelConnectX();
    setIsConnectingX(false);
    trackInteraction(Interaction.BUTTON_CLICKED, Outcome.DISMISSED);
    navigation.goBack();
  }, [cancelConnectX, navigation, trackInteraction]);

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

  const fetchUsernameAvailability = useCallback(
    async (username: string): Promise<UsernameAvailability> => {
      try {
        const availability = await checkUsernameAvailability(username);
        if (!availability.valid) {
          return {
            status: 'invalid',
            claimError: strings(
              'social_leaderboard.profile_onboarding.username_invalid',
            ),
          };
        }
        if (!availability.available) {
          return {
            status: 'taken',
            claimError: strings(
              'social_leaderboard.profile_onboarding.username_unavailable',
            ),
          };
        }
        return { status: 'available', claimError: null };
      } catch {
        return {
          status: 'error',
          claimError: strings(
            'social_leaderboard.profile_onboarding.username_check_error',
          ),
        };
      }
    },
    [checkUsernameAvailability],
  );

  const checkHandle = useCallback(
    async (username: string): Promise<UsernameCheckOutcome> => {
      const requestId = ++usernameCheckId.current;
      const { status, claimError } = await fetchUsernameAvailability(username);
      if (requestId !== usernameCheckId.current) {
        return 'superseded';
      }
      setUsernameClaimError(claimError);
      return status === 'available' ? 'available' : 'unavailable';
    },
    [fetchUsernameAvailability],
  );

  const scheduleUsernameCheck = useCallback(
    (username: string) => {
      clearUsernameCheckTimer();
      // Any edit makes in-flight checks stale, including a shuffle that has
      // not shown its name yet.
      usernameCheckId.current += 1;
      if (getUsernameStatus(username) !== 'available') {
        setUsernameClaimError(null);
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
    trackInteraction(Interaction.USERNAME_SHUFFLED);
    // Check the suggestion before showing it, so one tap shows one name. A
    // superseded check means the user typed or continued in the meantime, and
    // the draft must stay as they left it.
    const requestId = ++usernameCheckId.current;
    const claimGeneratedUsername = async () => {
      const username = generateUsername();
      const { status, claimError } = await fetchUsernameAvailability(username);
      if (requestId !== usernameCheckId.current) {
        return;
      }
      if (status === 'taken') {
        const numberedUsername = generateUsernameWithNumber();
        applyUsername(numberedUsername);
        await checkHandle(numberedUsername);
        return;
      }
      applyUsername(username);
      setUsernameClaimError(claimError);
    };
    claimGeneratedUsername().catch(() => undefined);
  }, [
    applyUsername,
    checkHandle,
    clearUsernameCheckTimer,
    fetchUsernameAvailability,
    trackInteraction,
  ]);

  const handleDisplayNameChange = useCallback((value: string) => {
    setDraft((current) => ({
      ...current,
      displayName: value,
      displayNameEdited: true,
    }));
  }, []);

  const handleAvatarSelect = useCallback(
    (presetId: string) => {
      trackInteraction(Interaction.AVATAR_CHANGED);
      setDraft((current) => ({ ...current, avatarPresetId: presetId }));
    },
    [trackInteraction],
  );

  const handleAvatarBackgroundSelect = useCallback(
    (backgroundId: string) => {
      trackInteraction(Interaction.AVATAR_CHANGED);
      setDraft((current) => ({ ...current, avatarBackgroundId: backgroundId }));
    },
    [trackInteraction],
  );

  const startManualPath = useCallback(() => {
    setUsernameClaimError(null);
    setDraft((current) => startManualOnboarding(current));
    setStep('username');
  }, []);

  const beginConnectX = useCallback(() => {
    playSelection().catch(() => undefined);
    cancelConnectX();
    const controller = new AbortController();
    connectAbortRef.current = controller;
    setConnectXError(null);
    setIsConnectingX(true);
    const connect = async () => {
      try {
        const xProfile = await connectX({ signal: controller.signal });
        if (controller.signal.aborted) {
          return;
        }
        setDraft((current) =>
          applyXOnboardingProfile(current, {
            username: xProfile.username,
            displayName: xProfile.displayName,
            avatarUrl: xProfile.avatarUrl || null,
          }),
        );
        setStep('x-identity');
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof XAuthError &&
            error.type === XAuthErrorType.UserCancelled)
        ) {
          return;
        }
        setConnectXError(
          strings('social_leaderboard.profile_onboarding.connect_x_error'),
        );
      } finally {
        if (connectAbortRef.current === controller) {
          connectAbortRef.current = null;
        }
        if (!controller.signal.aborted) {
          setIsConnectingX(false);
        }
      }
    };
    connect().catch(() => undefined);
  }, [cancelConnectX, playSelection]);

  const requestPath = useCallback(
    (path: ProfileOnboardingPath) => {
      if (hasAcceptedSocialTerms()) {
        if (path === 'x') {
          beginConnectX();
        } else {
          playSelection().catch(() => undefined);
          startManualPath();
        }
        return;
      }
      playSelection().catch(() => undefined);
      trackInteraction(Interaction.SHEET_DISPLAYED, { step: Step.TERMS });
      setPendingTermsPath(path);
    },
    [beginConnectX, playSelection, startManualPath, trackInteraction],
  );

  const handleConnectX = useCallback(() => requestPath('x'), [requestPath]);

  const handleCreateManually = useCallback(
    () => requestPath('manual'),
    [requestPath],
  );

  const handleTermsAgree = useCallback(() => {
    if (!pendingTermsPath && !pendingTermsOnly) {
      return;
    }
    trackInteraction(Interaction.BUTTON_CLICKED, {
      outcome: Outcome.SUCCESS,
      step: Step.TERMS,
    });
    acceptSocialTerms().catch(() => undefined);
    if (pendingTermsOnly) {
      setPendingTermsOnly(false);
      navigation.goBack();
      return;
    }
    const path = pendingTermsPath;
    setPendingTermsPath(null);
    if (path === 'x') {
      beginConnectX();
    } else {
      startManualPath();
    }
  }, [
    beginConnectX,
    navigation,
    pendingTermsOnly,
    pendingTermsPath,
    startManualPath,
    trackInteraction,
  ]);

  const handleTermsClose = useCallback(() => {
    trackInteraction(Interaction.SHEET_DISMISSED, {
      outcome: Outcome.DISMISSED,
      step: Step.TERMS,
    });
    if (pendingTermsOnly) {
      setPendingTermsOnly(false);
      navigation.goBack();
      return;
    }
    setPendingTermsPath(null);
  }, [navigation, pendingTermsOnly, trackInteraction]);

  const handleToggleXUsername = useCallback(
    (enabled: boolean) => {
      playSelection().catch(() => undefined);
      setUsernameClaimError(null);
      if (enabled) {
        clearUsernameCheckTimer();
        usernameCheckId.current += 1;
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
    [
      clearUsernameCheckTimer,
      draft.username,
      draft.xUsername,
      playSelection,
      scheduleUsernameCheck,
    ],
  );

  const handleToggleXAvatar = useCallback(
    (enabled: boolean) => {
      playSelection().catch(() => undefined);
      if (enabled === draft.useXAvatar) {
        return;
      }
      trackInteraction(Interaction.AVATAR_CHANGED);
      setDraft((current) => ({ ...current, useXAvatar: enabled }));
    },
    [draft.useXAvatar, playSelection, trackInteraction],
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
    if (!canContinueUsernameStep(draft)) {
      return;
    }
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
  }, [checkHandle, clearUsernameCheckTimer, draft, playSelection, step]);

  const fingerprintForDraft = (
    current: ProfileOnboardingDraft,
  ): string | null => {
    const linkedAccount = accountsRef.current.find(
      (account) => account.id === current.linkedAccountId,
    );
    return onboardingProfileFingerprint(
      current,
      linkedAccount?.linkedAddresses,
    );
  };

  const writeOnboardingProfile = async (current: ProfileOnboardingDraft) => {
    const linkedAccount = accountsRef.current.find(
      (account) => account.id === current.linkedAccountId,
    );
    const profileId =
      (await getSessionProfileId()) ?? SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID;
    const params = buildCreateProfileParams(
      current,
      profileId,
      linkedAccount?.linkedAddresses,
    );
    // createProfile has no abort signal. Keep a successful in-flight create
    // and patch it when the draft changes, instead of issuing a second create
    // that fails because the username or profile already exists.
    if (serverProfileFingerprintRef.current) {
      await updateProfileRef.current({
        username: params.username,
        display_name: params.display_name,
        bio: params.bio,
        linked_addresses: params.linked_addresses,
        avatar_url: params.avatar_url,
        trading_privacy: params.trading_privacy,
      });
      return;
    }
    await createProfileRef.current(params);
  };

  const publishCreatedProfile = (current: ProfileOnboardingDraft) => {
    saveLocalSocialProfile(buildOnboardedSocialProfile(current));
    profileCreatedRef.current = true;
    setProfileCreated(true);
    setIsSubmitting(false);
  };

  const runSync = async (): Promise<void> => {
    while (stepRef.current === 'ready') {
      const currentDraft = draftRef.current;
      const fingerprint = fingerprintForDraft(currentDraft);
      if (!fingerprint) {
        setIsSubmitting(false);
        return;
      }
      if (serverProfileFingerprintRef.current === fingerprint) {
        publishCreatedProfile(currentDraft);
        return;
      }
      profileCreatedRef.current = false;
      setProfileCreated(false);
      setFinishError(null);
      setIsSubmitting(true);
      const hadProfile = serverProfileFingerprintRef.current !== null;
      try {
        await writeOnboardingProfile(currentDraft);
      } catch {
        if (stepRef.current === 'ready') {
          setFinishError(
            strings('social_leaderboard.profile_onboarding.save_error'),
          );
        }
        setIsSubmitting(false);
        return;
      }
      serverProfileFingerprintRef.current = fingerprint;
      if (!hadProfile) {
        trackInteractionRef.current(Interaction.USERNAME_CLAIMED, {
          outcome: Outcome.SUCCESS,
          step: currentDraft.path === 'x' ? Step.X_IDENTITY : Step.USERNAME,
        });
      }
      if (stepRef.current !== 'ready') {
        setIsSubmitting(false);
        return;
      }
      if (fingerprintForDraft(draftRef.current) !== fingerprint) {
        continue;
      }
      publishCreatedProfile(currentDraft);
      return;
    }
    setIsSubmitting(false);
  };

  const startSync = (): Promise<void> => {
    const inFlight = syncPromiseRef.current;
    if (inFlight) {
      return inFlight.then(() => {
        if (stepRef.current !== 'ready') {
          return undefined;
        }
        const latest = fingerprintForDraft(draftRef.current);
        if (latest && serverProfileFingerprintRef.current === latest) {
          publishCreatedProfile(draftRef.current);
          return undefined;
        }
        if (
          latest &&
          serverProfileFingerprintRef.current &&
          serverProfileFingerprintRef.current !== latest
        ) {
          return startSync();
        }
        return undefined;
      });
    }

    const run = runSync().finally(() => {
      if (syncPromiseRef.current === run) {
        syncPromiseRef.current = null;
      }
    });
    syncPromiseRef.current = run;
    return run;
  };
  startSyncRef.current = startSync;

  const profileFingerprint = useMemo(() => {
    const linkedAccount = accounts.find(
      (account) => account.id === draft.linkedAccountId,
    );
    return onboardingProfileFingerprint(draft, linkedAccount?.linkedAddresses);
  }, [accounts, draft]);

  useEffect(() => {
    const previousStep = previousStepRef.current;
    previousStepRef.current = step;
    if (step !== 'ready') {
      if (previousStep === 'ready') {
        setIsSubmitting(false);
      }
      if (
        serverProfileFingerprintRef.current &&
        profileFingerprint &&
        serverProfileFingerprintRef.current !== profileFingerprint
      ) {
        profileCreatedRef.current = false;
        setProfileCreated(false);
        setFinishError(null);
      }
      return;
    }
    if (
      profileCreatedRef.current &&
      serverProfileFingerprintRef.current === profileFingerprint
    ) {
      return;
    }
    if (serverProfileFingerprintRef.current !== profileFingerprint) {
      profileCreatedRef.current = false;
      setProfileCreated(false);
    }
    setFinishError(null);
    startSyncRef.current().catch(() => undefined);
  }, [profileFingerprint, step]);

  const createOnboardingProfile = useCallback(() => startSyncRef.current(), []);

  const handleFinish = useCallback(() => {
    if (!profileCreatedRef.current) {
      return;
    }
    navigation.navigate(
      draft.path === 'x' ? Routes.SOCIAL.MY_PROFILE : Routes.SOCIAL.V1,
    );
  }, [draft.path, navigation]);

  const usernameStatus = getUsernameStatus(draft.username);
  const username = normalizeUsername(draft.username);
  const usernameLocalError = getUsernameLocalError(draft, usernameStatus);
  const usernameFeedback = getUsernameFeedback({
    localError: usernameLocalError,
    claimError: usernameClaimError,
    status: usernameStatus,
    showAvailable: !isUneditedXUsername(draft),
  });
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
        backButtonProps={
          step === 'intro'
            ? undefined
            : { testID: SocialProfileOnboardingSelectorsIDs.BACK_BUTTON }
        }
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
                  variant: TextVariant.DisplayLg,
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
                description={connectXError ?? undefined}
                descriptionProps={
                  connectXError
                    ? {
                        color: TextColor.ErrorDefault,
                        testID:
                          SocialProfileOnboardingSelectorsIDs.CONNECT_X_ERROR,
                      }
                    : undefined
                }
                primaryAction={{
                  label: <ConnectXLabel />,
                  accessibilityLabel: strings(
                    'social_leaderboard.profile_onboarding.connect_x',
                  ),
                  onPress: handleConnectX,
                  isLoading: isConnectingX,
                  isDisabled: isConnectingX,
                  testID: SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON,
                }}
                secondaryAction={{
                  label: strings(
                    'social_leaderboard.profile_onboarding.create_manually',
                  ),
                  onPress: handleCreateManually,
                  isDisabled: isConnectingX,
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
                  usernameFeedback={usernameFeedback}
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
                      isError={usernameFeedback?.tone === 'error'}
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
                        maxLength: MAX_USERNAME_LENGTH,
                        testID:
                          SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT,
                      }}
                    />
                    <UsernameStatusLine feedback={usernameFeedback} />
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
                <Box alignItems={BoxAlignItems.Center}>
                  <OnboardingTitle twClassName="pb-14">
                    {strings(
                      'social_leaderboard.profile_onboarding.customize_avatar',
                    )}
                  </OnboardingTitle>
                  <ProfileAvatarPicker
                    avatarPresetId={draft.avatarPresetId}
                    avatarBackgroundId={draft.avatarBackgroundId}
                    onSelectPreset={handleAvatarSelect}
                    onSelectBackground={handleAvatarBackgroundSelect}
                  />
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
                    shareTradingActivity={draft.shareTradingActivity}
                    onShareTradingActivityChange={(enabled) => {
                      playSelection().catch(() => undefined);
                      setDraft((current) => ({
                        ...current,
                        shareTradingActivity: enabled,
                      }));
                    }}
                    onSelect={(account) => {
                      trackInteraction(Interaction.LINKED_ACCOUNT_SELECTED);
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
                <Box gap={3}>
                  {finishError ? (
                    <Button
                      variant={ButtonVariant.Secondary}
                      isFullWidth
                      isLoading={isSubmitting}
                      isDisabled={isSubmitting}
                      onPress={() => {
                        createOnboardingProfile().catch(() => undefined);
                      }}
                      testID={
                        SocialProfileOnboardingSelectorsIDs.RETRY_CREATE_BUTTON
                      }
                    >
                      {strings(
                        'social_leaderboard.profile_onboarding.try_again',
                      )}
                    </Button>
                  ) : null}
                  <Button
                    variant={ButtonVariant.Primary}
                    isFullWidth
                    isLoading={!profileCreated && isSubmitting}
                    isDisabled={!profileCreated || isSubmitting}
                    onPress={handleFinish}
                    testID={SocialProfileOnboardingSelectorsIDs.LETS_GO_BUTTON}
                  >
                    {strings(
                      draft.path === 'x'
                        ? 'social_leaderboard.profile_onboarding.view_profile'
                        : 'social_leaderboard.profile_onboarding.lets_go',
                    )}
                  </Button>
                </Box>
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
      {pendingTermsPath || pendingTermsOnly ? (
        <SocialTermsSheet
          html={socialTermsOfUseContent}
          onAgree={handleTermsAgree}
          onClose={handleTermsClose}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default SocialProfileOnboardingView;
