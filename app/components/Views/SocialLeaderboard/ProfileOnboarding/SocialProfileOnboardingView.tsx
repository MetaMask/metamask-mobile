import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonVariant,
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  StackActions,
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  SafeAreaInsetsContext,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type {
  AppStackNavigationProp,
  RootStackParamList,
} from '../../../../core/NavigationService/types';
import { useHaptics } from '../../../../util/haptics';
import socialTermsOfUseContent from '../../../../util/termsOfUse/socialTermsOfUseContent';
import {
  connectX,
  XAuthError,
  XAuthErrorType,
} from '../../../../core/XAuthService';
import { getSocialProfileId } from '../../../../util/social/getSocialProfileId';
import { finishProfileOnboardingToSocialTab } from '../Onboarding/socialLeaderboardOnboardingNavigation';
import MarketingMoment from '../../../UI/MarketingMoment';
import MarketingMomentTitle from '../../../UI/MarketingMomentTitle';
import { useProfileController } from '../ManageProfileView/hooks/useProfileController';
import { getProfileCreateErrorCopy } from '../ManageProfileView/errors/profileApiErrorMessageKeys';
import { getHandleAvailabilityRejection } from '../ManageProfileView/screens/handleAvailabilityError';
import { getXConnectError } from '../ManageProfileView/screens/xAuthError';
import ProfileVerifiedBadge from '../shared/ProfileVerifiedBadge';
import ProfileAvatar from '../MyProfileView/components/ProfileAvatar';
import { saveLocalSocialProfile } from '../MyProfileView/hooks/localSocialProfileStore';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import {
  applyXOnboardingProfile,
  startManualOnboarding,
  buildCreateProfileParams,
  buildOnboardedSocialProfile,
  canContinueUsernameStep,
  createInitialOnboardingDraft,
  MAX_DISPLAY_NAME_LENGTH,
  displayNameFromUsername,
  getUsernameStatus,
  isUneditedXUsername,
  normalizeUsername,
  onboardingProfileFingerprint,
  type ProfileOnboardingDraft,
  type ProfileOnboardingPath,
  type ProfileOnboardingStep,
} from './profileOnboardingDraft';
import { getDisplayNameError } from './utils/getDisplayNameError';
import { getUsernameLocalError } from './utils/getUsernameLocalError';
import { getUsernameFeedback } from './utils/getUsernameFeedback';
import UsernameStatusLine from './UsernameStatusLine';
import OnboardingProgress from './OnboardingProgress';
import ProfileOnboardingIntroAnimation from './ProfileOnboardingIntroAnimation';
import ProfileReadyAnimation from './ProfileReadyAnimation';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import { useLinkableSocialAccounts } from '../hooks/useLinkableSocialAccounts';
import { lookUpExistingSocialProfile } from '../hooks/lookUpExistingSocialProfile';
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
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';

const { Interaction, Outcome, Screen, Step } = SocialEvent;
// Future live source: https://metamask.com/terms-of-use
/** Wait until typing pauses before asking if a handle is free. */
const USERNAME_CHECK_DEBOUNCE_MS = 400;

const EXISTING_PROFILE_LOOKUP_QUERY_KEY = [
  'social',
  'profileOnboardingExistingProfile',
] as const;

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
 * DisplayLg on iOS is an 80% line (32px) with 8px of clip padding. Spacing
 * stays on the wrapper.
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

const INTRO_TITLE_KEYS = {
  1: 'social_leaderboard.profile_onboarding.intro_title_activity',
  2: 'social_leaderboard.profile_onboarding.intro_title',
  3: 'social_leaderboard.profile_onboarding.intro_title_post',
} as const;

const INTRO_TITLE_STEPS = [1, 2, 3] as const;

/** How long the outgoing and incoming intro titles crossfade. */
const INTRO_TITLE_FADE_MS = 280;

const INTRO_TITLE_FADE_EASING = Easing.out(Easing.cubic);

const introTitleStep = (step: number | undefined): 1 | 2 | 3 =>
  step === 2 || step === 3 ? step : 1;

const IntroTitleText: React.FC<{
  step: 1 | 2 | 3;
  testID?: string;
}> = ({ step, testID }) => (
  <MarketingMomentTitle
    variant={TextVariant.DisplayLg}
    twClassName="w-full text-center"
    testID={testID}
  >
    {strings(INTRO_TITLE_KEYS[step])}
  </MarketingMomentTitle>
);

/**
 * Scene title. Hidden copies of the three lines are measured, and the slot
 * stays as tall as the tallest one, so a longer title or a larger text size
 * stays clear of the animation. A scene change crossfades the outgoing line
 * out while the incoming line fades in. The first paint and Reduce Motion
 * swap the line with no fade.
 */
const IntroStepTitle: React.FC<{ step: 1 | 2 | 3 }> = ({ step }) => {
  const tw = useTailwind();
  const reducedMotion = useReducedMotion();
  const shownStepRef = useRef(step);
  const skipFade = useRef(true);
  const measuredHeights = useRef<Partial<Record<1 | 2 | 3, number>>>({});
  const [slotHeight, setSlotHeight] = useState(0);
  const [currentStep, setCurrentStep] = useState(step);
  const [previousStep, setPreviousStep] = useState<1 | 2 | 3 | null>(null);
  const incomingOpacity = useSharedValue(1);
  const outgoingOpacity = useSharedValue(0);

  const handleSizerLayout = useCallback(
    (sizerStep: 1 | 2 | 3, event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      if (measuredHeights.current[sizerStep] === nextHeight) {
        return;
      }
      measuredHeights.current[sizerStep] = nextHeight;
      const tallest = Math.max(
        ...INTRO_TITLE_STEPS.map(
          (titleStep) => measuredHeights.current[titleStep] ?? 0,
        ),
      );
      setSlotHeight((current) => (current === tallest ? current : tallest));
    },
    [],
  );

  useEffect(() => {
    if (skipFade.current) {
      skipFade.current = false;
      shownStepRef.current = step;
      setCurrentStep(step);
      return;
    }

    const outgoing = shownStepRef.current;
    if (outgoing === step) {
      return;
    }
    shownStepRef.current = step;

    if (reducedMotion) {
      setPreviousStep(null);
      setCurrentStep(step);
      incomingOpacity.value = 1;
      outgoingOpacity.value = 0;
      return;
    }

    setPreviousStep(outgoing);
    setCurrentStep(step);
    outgoingOpacity.value = 1;
    incomingOpacity.value = 0;
    const timing = {
      duration: INTRO_TITLE_FADE_MS,
      easing: INTRO_TITLE_FADE_EASING,
    };
    outgoingOpacity.value = withTiming(0, timing);
    incomingOpacity.value = withTiming(1, timing);
  }, [incomingOpacity, outgoingOpacity, reducedMotion, step]);

  const incomingStyle = useAnimatedStyle(() => ({
    opacity: incomingOpacity.value,
  }));
  const outgoingStyle = useAnimatedStyle(() => ({
    opacity: outgoingOpacity.value,
  }));

  return (
    <Box
      twClassName="relative w-full"
      style={slotHeight > 0 ? { minHeight: slotHeight } : undefined}
      testID={SocialProfileOnboardingSelectorsIDs.INTRO_TITLE_SLOT}
    >
      {INTRO_TITLE_STEPS.map((sizerStep) => (
        <Box
          key={sizerStep}
          twClassName="absolute left-0 right-0 top-0 w-full opacity-0"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          onLayout={(event) => handleSizerLayout(sizerStep, event)}
          testID={`${SocialProfileOnboardingSelectorsIDs.INTRO_TITLE_SIZER}-${sizerStep}`}
        >
          <IntroTitleText step={sizerStep} />
        </Box>
      ))}
      {previousStep !== null && (
        <Animated.View
          style={[tw.style('absolute left-0 right-0 top-0'), outgoingStyle]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID={SocialProfileOnboardingSelectorsIDs.INTRO_TITLE_OUTGOING}
        >
          <IntroTitleText step={previousStep} />
        </Animated.View>
      )}
      <Animated.View
        style={[tw.style('absolute left-0 right-0 top-0'), incomingStyle]}
        testID={SocialProfileOnboardingSelectorsIDs.INTRO_TITLE_INCOMING}
      >
        <IntroTitleText
          step={currentStep}
          testID={SocialProfileOnboardingSelectorsIDs.INTRO_TITLE}
        />
      </Animated.View>
    </Box>
  );
};

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
  isVerified: boolean;
}> = ({ avatarPresetId, avatarBackgroundId, imageUrl, handle, isVerified }) => (
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
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        twClassName="pt-3"
      >
        <Text
          variant={TextVariant.BodyMd}
          testID={SocialProfileOnboardingSelectorsIDs.READY_HANDLE}
        >
          @{handle}
        </Text>
        {isVerified ? (
          <ProfileVerifiedBadge
            testID={SocialProfileOnboardingSelectorsIDs.READY_VERIFIED_BADGE}
          />
        ) : null}
      </Box>
    </Box>
  </>
);

const SocialProfileOnboardingView: React.FC = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const isFocused = useIsFocused();
  const navigation = useNavigation<AppStackNavigationProp>();
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
  const {
    profile: controllerProfile,
    checkUsernameAvailability,
    checkDisplayNameValidity,
    createProfile,
    updateProfile,
    fetchAndUpdateProfile,
  } = useProfileController();
  const isTermsOnlyRoute = route.params?.termsOnly === true;
  // The entry gates only read ProfileController, which is empty on a fresh
  // install until the profile is fetched. Ask the server before offering to
  // create one, so an existing profile is never replaced.
  const existingProfileLookup = useQuery({
    queryKey: EXISTING_PROFILE_LOOKUP_QUERY_KEY,
    queryFn: async () =>
      lookUpExistingSocialProfile(
        await getSocialProfileId(),
        fetchAndUpdateProfile,
      ),
    enabled: !isTermsOnlyRoute,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    retry: false,
  });
  const isCheckingExistingProfile =
    !isTermsOnlyRoute && existingProfileLookup.isPending;
  const existingProfileLookupResult = existingProfileLookup.data;
  const [step, setStep] = useState<ProfileOnboardingStep>('intro');
  const [introSceneStep, setIntroSceneStep] = useState<number | undefined>(
    undefined,
  );
  const handleIntroSceneStep = useCallback((nextStep: number) => {
    setIntroSceneStep(nextStep);
  }, []);
  const [draft, setDraft] = useState<ProfileOnboardingDraft>(
    createInitialOnboardingDraft,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameClaimError, setUsernameClaimError] = useState<string | null>(
    null,
  );
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const displayNameCheckId = useRef(0);

  useEffect(() => {
    displayNameCheckId.current += 1;
    setDisplayNameError(null);
  }, [draft.displayName]);

  // VoiceOver keeps focus on Continue and ignores accessibilityLiveRegion, so
  // announce the error explicitly. TalkBack reads the alert live region.
  useEffect(() => {
    if (!displayNameError) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(displayNameError);
  }, [displayNameError]);
  const [finishError, setFinishError] = useState<string | null>(null);
  // Path the user picked while the terms sheet is open; null when it is closed.
  const [pendingTermsPath, setPendingTermsPath] =
    useState<ProfileOnboardingPath | null>(null);
  const [pendingTermsOnly, setPendingTermsOnly] = useState(isTermsOnlyRoute);
  const rivePaused =
    !isFocused || Boolean(pendingTermsPath || pendingTermsOnly);
  const [connectXError, setConnectXError] = useState<string | null>(null);
  const [isConnectingX, setIsConnectingX] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
  const isProfileCreatedAndVerified =
    profileCreated && controllerProfile?.verified === true;
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
  const fetchAndUpdateProfileRef = useRef(fetchAndUpdateProfile);
  const existingProfileLookupResultRef = useRef(existingProfileLookupResult);
  const trackInteractionRef = useRef(trackInteraction);
  draftRef.current = draft;
  accountsRef.current = accounts;
  stepRef.current = step;
  createProfileRef.current = createProfile;
  updateProfileRef.current = updateProfile;
  fetchAndUpdateProfileRef.current = fetchAndUpdateProfile;
  existingProfileLookupResultRef.current = existingProfileLookupResult;
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

  // An existing profile skips creation. An older accepted terms version still
  // has to be accepted again, so that case keeps only the terms sheet.
  const openExistingProfile = useCallback(() => {
    if (hasAcceptedSocialTerms()) {
      finishProfileOnboardingToSocialTab(navigation);
      return;
    }
    setPendingTermsOnly(true);
  }, [navigation]);

  useEffect(() => {
    if (
      existingProfileLookupResult !== 'found' ||
      stepRef.current !== 'intro'
    ) {
      return;
    }
    openExistingProfile();
  }, [existingProfileLookupResult, openExistingProfile]);

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
        switch (getHandleAvailabilityRejection(availability)) {
          case null:
            return { status: 'available', claimError: null };
          case 'invalidFormat':
            return {
              status: 'invalid',
              claimError: strings(
                'social_leaderboard.profile_onboarding.username_invalid',
              ),
            };
          case 'reserved':
            return {
              status: 'taken',
              claimError: strings(
                'social_leaderboard.profile_onboarding.username_reserved',
              ),
            };
          default:
            return {
              status: 'taken',
              claimError: strings(
                'social_leaderboard.profile_onboarding.username_unavailable',
              ),
            };
        }
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

  const checkDisplayName = useCallback(
    async (displayName: string): Promise<boolean> => {
      const requestId = ++displayNameCheckId.current;
      const error = await getDisplayNameError(
        displayName,
        checkDisplayNameValidity,
      );
      if (requestId !== displayNameCheckId.current) {
        return false;
      }
      setDisplayNameError(error);
      return error === null;
    },
    [checkDisplayNameValidity],
  );

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
          error instanceof XAuthError
            ? getXConnectError(error)
            : strings('social_leaderboard.profile_onboarding.connect_x_error'),
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
      // The termsOnly route is pushed by a Social entry gate that expects to
      // return to its caller. An existing profile found on open has no caller
      // to return to, so it opens the Social tab instead.
      if (isTermsOnlyRoute) {
        navigation.goBack();
      } else {
        finishProfileOnboardingToSocialTab(navigation);
      }
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
    isTermsOnlyRoute,
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
      if (step === 'username' && !(await checkDisplayName(draft.displayName))) {
        return;
      }
      setStep(step === 'x-identity' ? 'account' : 'avatar');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    checkDisplayName,
    checkHandle,
    clearUsernameCheckTimer,
    draft,
    playSelection,
    step,
  ]);

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

  /**
   * @returns `existing` when the session already owns a profile, so nothing
   * was written.
   */
  const writeOnboardingProfile = async (
    current: ProfileOnboardingDraft,
  ): Promise<'saved' | 'existing'> => {
    const linkedAccount = accountsRef.current.find(
      (account) => account.id === current.linkedAccountId,
    );
    const profileId = await getSocialProfileId();
    if (!profileId) {
      throw new Error('Social profile id is not available');
    }
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
      return 'saved';
    }
    // The check on open ends without an answer when sign-in or the profile
    // read fails. Ask again now that there is a profile id, so a profile that
    // already exists is never replaced.
    if (
      existingProfileLookupResultRef.current !== 'not-found' &&
      (await lookUpExistingSocialProfile(
        profileId,
        fetchAndUpdateProfileRef.current,
      )) === 'found'
    ) {
      return 'existing';
    }
    await createProfileRef.current(params);
    return 'saved';
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
      let writeResult: 'saved' | 'existing';
      try {
        writeResult = await writeOnboardingProfile(currentDraft);
      } catch (error) {
        if (stepRef.current === 'ready') {
          setFinishError(
            getProfileCreateErrorCopy(error) ??
              strings('social_leaderboard.profile_onboarding.save_error'),
          );
        }
        setIsSubmitting(false);
        return;
      }
      if (writeResult === 'existing') {
        setIsSubmitting(false);
        if (navigation.isFocused()) {
          openExistingProfile();
        }
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

  // Set before Let's go. The native stack reads this screen's animation when
  // the transition starts, and a pop with the default option leaves to the right.
  useLayoutEffect(() => {
    if (step !== 'ready') {
      return;
    }
    navigation.setOptions({ animation: 'slide_from_left' });
  }, [navigation, step]);

  const handleFinish = useCallback(() => {
    if (!profileCreatedRef.current) {
      return;
    }
    if (draft.path === 'x') {
      // Replace drops onboarding from the stack. My Profile's replace is a pop,
      // so this screen's slide_from_left plays and it leaves toward the left.
      navigation.dispatch(StackActions.replace(Routes.SOCIAL.MY_PROFILE));
      return;
    }
    finishProfileOnboardingToSocialTab(navigation);
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
  // The first step of either path has no earlier step to return to, so it hides back.
  const hasBackStep =
    step !== 'intro' && step !== 'username' && step !== 'x-identity';
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
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        twClassName="px-4"
        title=""
        onBack={hasBackStep ? handleBack : undefined}
        onClose={handleClose}
        backButtonProps={
          hasBackStep
            ? { testID: SocialProfileOnboardingSelectorsIDs.BACK_BUTTON }
            : undefined
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
                title={<IntroStepTitle step={introTitleStep(introSceneStep)} />}
                // 20px matches "Claim a username": that step's progress bar
                // is an 8px inset plus a 4px track, then pt-2. The intro has
                // no progress bar, so this margin makes up the difference.
                copyClassName="mt-5"
                artwork={
                  <ProfileOnboardingIntroAnimation
                    fallback={<LiveActivityFallback />}
                    onStepChange={handleIntroSceneStep}
                    paused={rivePaused}
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
                  isLoading: isConnectingX || isCheckingExistingProfile,
                  isDisabled: isConnectingX || isCheckingExistingProfile,
                  testID: SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON,
                }}
                secondaryAction={{
                  label: strings(
                    'social_leaderboard.profile_onboarding.create_manually',
                  ),
                  onPress: handleCreateManually,
                  isDisabled: isConnectingX || isCheckingExistingProfile,
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
                  <OnboardingTitle twClassName="pt-4 pb-5">
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
                      isError={Boolean(displayNameError)}
                      endAccessory={
                        draft.displayName.trim() && !displayNameError ? (
                          <Icon
                            name={IconName.Check}
                            size={IconSize.Sm}
                            color={IconColor.PrimaryDefault}
                          />
                        ) : undefined
                      }
                      inputProps={{
                        autoCapitalize: 'words',
                        maxLength: MAX_DISPLAY_NAME_LENGTH,
                        testID:
                          SocialProfileOnboardingSelectorsIDs.DISPLAY_NAME_INPUT,
                      }}
                    />
                    {displayNameError ? (
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.ErrorDefault}
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite"
                      >
                        {displayNameError}
                      </Text>
                    ) : null}
                  </Box>
                </Box>
              ) : null}

              {step === 'avatar' ? (
                <Box alignItems={BoxAlignItems.Center}>
                  <OnboardingTitle twClassName="m-0.5 pt-3 pb-8">
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
                  gap={3}
                  twClassName="flex-1"
                  testID={SocialProfileOnboardingSelectorsIDs.ACCOUNT_STEP}
                >
                  <OnboardingTitle twClassName="m-0.5 pt-3 px-3 pb-3">
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
                  twClassName="flex-1"
                  testID={SocialProfileOnboardingSelectorsIDs.READY_STEP}
                >
                  <OnboardingTitle twClassName="pt-2">
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
                  <Box
                    twClassName="w-full flex-1 items-center justify-center"
                    testID={SocialProfileOnboardingSelectorsIDs.READY_CARD_SLOT}
                  >
                    <ProfileReadyAnimation
                      displayName={draft.displayName}
                      handle={username}
                      avatarPresetId={draft.avatarPresetId}
                      avatarBackgroundId={draft.avatarBackgroundId}
                      imageUrl={readyImageUrl}
                      isVerified={isProfileCreatedAndVerified}
                      paused={rivePaused}
                      fallback={
                        <ReadyCardFallback
                          avatarPresetId={draft.avatarPresetId}
                          avatarBackgroundId={draft.avatarBackgroundId}
                          imageUrl={readyImageUrl}
                          handle={username}
                          isVerified={isProfileCreatedAndVerified}
                        />
                      }
                    />
                  </Box>
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
