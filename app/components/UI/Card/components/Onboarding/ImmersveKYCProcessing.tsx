import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, StatusBar, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  IconSize,
  Spinner,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  resetOnboardingState,
  selectImmersveFundingSourceId,
} from '../../../../../core/redux/slices/card';
import { selectCardSelectedCountry } from '../../../../../selectors/cardController';
import { useImmersveSpendingPrerequisites } from '../../hooks/useImmersveSpendingPrerequisites';
import { useImmersveOnboardingRouter } from '../../hooks/useImmersveOnboardingRouter';
import { useImmersveMoneyAccountFundingApproval } from '../../hooks/useImmersveMoneyAccountFundingApproval';
import { useIsImmersveMoneyAccountCountry } from '../../hooks/useImmersveFundingChannel';
import { useExitCardFlow } from '../../hooks/useExitCardFlow';
import { useImmersveKycOutcome } from '../../hooks/useImmersveKycOutcome';
import {
  describeImmersveKycFailureDetail,
  describeImmersveKycRejection,
} from '../../util/immersveKycReasons';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardScreens,
  withCardProvider,
} from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { KYC_REDIRECT_URL } from '../../constants';
import type { ImmersveNextAction } from '../../util/immersvePrerequisites';
import {
  setImmersveKycOnClose,
  clearImmersveKycOnClose,
} from '../ImmersveKYCModal/ImmersveKYCModal';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import { useReduceMotion } from '../../../Money/hooks/useReduceMotion';
import ImmersveVerifyingIdentityAnimation from './ImmersveVerifyingIdentityAnimation';
import CardVerifiedContent from './CardVerifiedContent';
import KYCFailedContent from './KYCFailedContent';

// While the user waits on this screen, poll spending-prerequisites; give up after
// this window and send them to Card home (KYC still pending). Immersve permits
// 2-3 min of direct-integration polling — we keep the 30s used by the Veriff
// progress screen since real background checks take minutes to days.
export const POLLING_TIMEOUT_MS = 30000;

/**
 * After the webview closes, hold the spinner at least this long so a fast poll
 * result doesn't flash past. Cold entries (resume) skip it: only a webview
 * close starts the hold.
 */
export const IMMERSVE_KYC_RESULT_MIN_DWELL_MS = 2000;

/**
 * After Sumsub redirects back as completed, keep the spinner while Immersve
 * still reports KYC. A manual close does not start this hold.
 */
export const IMMERSVE_KYC_COMPLETION_HOLD_MS = 30000;

/** How often this screen asks Immersve for a new result. */
export const IMMERSVE_KYC_POLL_INTERVAL_MS = 2000;

type WebviewPhase = 'none' | 'open' | 'closed';

type ImmersveKycView =
  | 'blank'
  | 'loading'
  | 'verifying'
  | 'verified'
  | 'failed'
  | 'retry'
  | 'reopen'
  | 'pollError'
  | 'expired';

interface DeriveViewInput {
  webviewPhase: WebviewPhase;
  holdVerifying: boolean;
  holdForCompletion: boolean;
  nextAction: ImmersveNextAction | null;
  isLoading: boolean;
  isRetryingPoll: boolean;
  error: string | null;
  promptHint: boolean;
  isExpiring: boolean;
}

/**
 * What the screen shows. The webview covers this screen while it is open, so
 * that phase stays blank — a stale result must not flash as the webview closes.
 *
 * `loading` is a bare spinner: the minimum after close, a poll with no result,
 * and the wait for Immersve to catch up after Sumsub completes. `verifying`
 * keeps the illustration, and only when Immersve says the check is pending.
 */
export const deriveImmersveKycView = ({
  webviewPhase,
  holdVerifying,
  holdForCompletion,
  nextAction,
  isLoading,
  isRetryingPoll,
  error,
  promptHint,
  isExpiring,
}: DeriveViewInput): ImmersveKycView => {
  if (webviewPhase === 'open') {
    return 'blank';
  }
  // The minimum only applies to the close that just happened. A result that
  // arrives later replaces the spinner immediately, because the hold has ended.
  if (webviewPhase === 'closed' && holdVerifying) {
    return 'loading';
  }
  if (error) {
    return 'pollError';
  }
  if (isExpiring) {
    return 'expired';
  }
  if (!nextAction) {
    // Try again, the poll that follows a webview close, and the wait after
    // Sumsub completes have no result yet. Keep the spinner for that gap. A
    // first mount with no result, and a webview that has not opened yet, stay
    // blank.
    return isRetryingPoll ||
      holdForCompletion ||
      (webviewPhase === 'closed' && isLoading)
      ? 'loading'
      : 'blank';
  }

  switch (nextAction.type) {
    case 'funding':
    case 'active':
      return 'verified';
    case 'rejected':
      return nextAction.canRetry ? 'retry' : 'failed';
    case 'pending':
    case 'expected_spend':
      return 'verifying';
    case 'kyc':
      // Sumsub finished, but Immersve still reports KYC. Keep the spinner
      // until a real result arrives or the completion hold ends. "Additional
      // information needed" is excluded by the caller: that is a real answer.
      if (holdForCompletion) {
        return 'loading';
      }
      // A re-poll still in flight must not flash "Finish verifying" before the
      // completed result arrives. A cold entry with a backend hint shows the
      // prompt as soon as that poll settles.
      if (webviewPhase === 'closed' && isLoading) {
        return 'loading';
      }
      if (webviewPhase === 'closed' || (promptHint && !isLoading)) {
        return 'reopen';
      }
      return 'blank';
    default:
      return 'blank';
  }
};

/**
 * What to speak when the result changes. iOS VoiceOver ignores
 * accessibilityLiveRegion, so the screen announces instead of marking a region.
 */
const announcementForKycView = ({
  view,
  error,
  failureDetail,
  retryDescription,
  reopenTitle,
  reopenDescription,
  reasonLine,
}: {
  view: ImmersveKycView;
  error: string | null;
  failureDetail: string | null;
  retryDescription: string | null;
  reopenTitle: string;
  reopenDescription: string;
  reasonLine: string | null;
}): string | null => {
  switch (view) {
    case 'verified':
      return strings('card.card_onboarding.complete.title');
    case 'failed': {
      const title = strings('card.card_onboarding.kyc_failed.title');
      return failureDetail ? `${title}. ${failureDetail}` : title;
    }
    case 'retry':
      return retryDescription
        ? `${strings('card.card_onboarding.kyc_rejected.retry_title')}. ${retryDescription}`
        : strings('card.card_onboarding.kyc_rejected.retry_title');
    case 'reopen': {
      const spoken = `${reopenTitle}. ${reopenDescription}`;
      return reasonLine ? `${spoken}. ${reasonLine}` : spoken;
    }
    case 'pollError':
      return `${strings(
        'card.card_onboarding.immersve_kyc_processing.error_title',
      )}. ${error ?? ''}`;
    case 'expired':
      return `${strings(
        'card.card_onboarding.immersve_kyc_processing.expired_title',
      )}. ${strings('card.card_onboarding.immersve_kyc_processing.expiring_error')}`;
    default:
      return null;
  }
};

interface KycIdentityLayoutProps {
  title: string;
  description: string;
  descriptionTestID?: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
  buttonTestID?: string;
  reasonLine?: string | null;
}

/** Verifying, Finish verifying, retry, and the two error states share this layout. */
const KycIdentityLayout = ({
  title,
  description,
  descriptionTestID = 'onboarding-description',
  buttonLabel,
  onButtonPress,
  buttonTestID,
  reasonLine,
}: KycIdentityLayoutProps) => {
  const tw = useTailwind();

  return (
    <View style={tw.style('flex-1')}>
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 pb-6')}
      >
        <TitleStandard
          title={title}
          bottomLabel={description}
          titleProps={{
            twClassName: 'text-center',
            testID: 'onboarding-title',
          }}
          titleWrapperProps={{ justifyContent: BoxJustifyContent.Center }}
          bottomLabelProps={{
            twClassName: 'text-center',
            testID: descriptionTestID,
          }}
          bottomLabelWrapperProps={{
            justifyContent: BoxJustifyContent.Center,
          }}
          topAccessory={
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="mb-5 w-full overflow-hidden"
              testID="immersve-kyc-processing-illustration"
            >
              <ImmersveVerifyingIdentityAnimation />
            </Box>
          }
        />
        {reasonLine ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-4 text-center"
            testID="immersve-kyc-processing-reason"
          >
            {reasonLine}
          </Text>
        ) : null}
      </ScrollView>
      {buttonLabel ? (
        <Box twClassName="gap-2 px-4 pb-2 pt-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onButtonPress}
            testID={buttonTestID}
          >
            {buttonLabel}
          </Button>
        </Box>
      ) : null}
    </View>
  );
};

/**
 * Immersve KYC orchestrator (Immersve-conducted, direct integration).
 * One screen for the whole post-webview wait: it opens the hosted KYC webview,
 * then polls spending-prerequisites and swaps the result in place.
 * - before and during the webview → blank
 * - no result yet, the minimum after close, and the wait after Sumsub completes → spinner
 * - pending / expected_spend → Verifying, with the illustration
 * - funding / active → You're verified; Finish setup routes onward
 * - rejected and retryable → retry prompt; permanent → Not eligible, in place
 * - kyc still outstanding → Finish verifying (never auto-reopens)
 * - poll failure → Try again; KYC_EXPIRING → Back to home
 * - still pending or expected_spend after 30s → opener, or Card home, plus an in-review toast
 */
const ImmersveKYCProcessing = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const reduceMotion = useReduceMotion();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const headerHandlers = useCardHeaderHandlers('close-direct');
  const isDarkTheme = useTheme().themeAppearance === AppThemeKey.dark;
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(
        isDarkTheme ? 'light-content' : 'dark-content',
        true,
      );
    }, [isDarkTheme]),
  );
  // Funding approval is pushed on top of this screen, so Finish setup has to
  // work again when the user comes back. The cleanup runs on blur.
  const isFinishingSetupRef = useRef(false);
  const [isFinishingSetup, setIsFinishingSetup] = useState(false);
  // Resolves the promise that holds the linking toasts. Blur and unmount both
  // run this cleanup, and nothing is pushed over this view for a Money account
  // country, so a blur means the user has left.
  const userLeftResolveRef = useRef<(() => void) | null>(null);
  useFocusEffect(
    useCallback(
      () => () => {
        isFinishingSetupRef.current = false;
        setIsFinishingSetup(false);
        userLeftResolveRef.current?.();
        userLeftResolveRef.current = null;
      },
      [],
    ),
  );
  const { countryKey, kycUrl } = useParams<{
    countryKey?: string;
    kycUrl?: string;
  }>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const fundingSourceId = useSelector(selectImmersveFundingSourceId);
  const selectedCountry = useSelector(selectCardSelectedCountry);
  const fundingCountry = countryKey ?? selectedCountry ?? undefined;
  const isMoneyAccountCountry =
    useIsImmersveMoneyAccountCountry(fundingCountry);
  const { approveFunding } = useImmersveMoneyAccountFundingApproval();
  const route = useImmersveOnboardingRouter();
  const exitCardFlow = useExitCardFlow();
  const { notifyKycRejected, notifyKycInReview } = useImmersveKycOutcome();
  const hasStartedFundingApproval = useRef(false);
  const hasNotifiedRejection = useRef(false);
  const [webviewPhase, setWebviewPhase] = useState<WebviewPhase>('none');
  const [holdVerifying, setHoldVerifying] = useState(false);
  const [awaitingCompletedResult, setAwaitingCompletedResult] = useState(false);
  const [isRetryingPoll, setIsRetryingPoll] = useState(false);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDwellTimer = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
  }, []);

  const clearCompletionTimer = useCallback(() => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, []);

  const clearCompletionHold = useCallback(() => {
    clearCompletionTimer();
    setAwaitingCompletedResult(false);
  }, [clearCompletionTimer]);

  const { nextAction, error, isLoading, refresh } =
    useImmersveSpendingPrerequisites({
      fundingSourceId: fundingSourceId ?? undefined,
      kycRegion: countryKey,
      kycRedirectUrl: KYC_REDIRECT_URL,
      pollIntervalMs: IMMERSVE_KYC_POLL_INTERVAL_MS,
    });

  const ctaHint = nextAction?.type === 'kyc' ? nextAction.ctaHint : undefined;
  const isInfoNeeded = ctaHint === 'KYC_INFORMATION_NEEDED';
  const promptHint = ctaHint === 'KYC_NOT_COMPLETED' || isInfoNeeded;
  const isExpiring = ctaHint === 'KYC_EXPIRING';
  // "Additional information needed" is a real answer, so it is not held.
  const holdForCompletion = awaitingCompletedResult && !isInfoNeeded;

  // The url opens the webview in an effect, one commit after this render.
  // Treat that entry as already covered so a rejection cannot flash, or
  // notify, underneath the webview that is about to open.
  const webviewCoversScreen =
    webviewPhase === 'open' || (webviewPhase === 'none' && Boolean(kycUrl));

  const view = deriveImmersveKycView({
    webviewPhase: webviewCoversScreen ? 'open' : webviewPhase,
    holdVerifying,
    holdForCompletion,
    nextAction,
    isLoading,
    isRetryingPoll,
    error,
    promptHint,
    isExpiring,
  });

  const failureDetail =
    nextAction?.type === 'rejected'
      ? describeImmersveKycFailureDetail(nextAction.reasons)
      : null;
  const retryDescription =
    view === 'retry' && nextAction?.type === 'rejected'
      ? describeImmersveKycRejection(nextAction.reasons, true)
      : null;
  const reopenTitle = strings(
    isInfoNeeded
      ? 'card.card_onboarding.immersve_kyc_processing.info_needed_title'
      : 'card.card_onboarding.immersve_kyc_processing.incomplete_title',
  );
  const reopenDescription = strings(
    isInfoNeeded
      ? 'card.card_onboarding.immersve_kyc_processing.info_needed_description'
      : 'card.card_onboarding.immersve_kyc_processing.incomplete_description',
  );
  const reasonLine =
    isInfoNeeded &&
    nextAction?.type === 'kyc' &&
    (nextAction.reasons?.length ?? 0) > 0
      ? describeImmersveKycRejection(nextAction.reasons, true)
      : null;
  const announcement = announcementForKycView({
    view,
    error,
    failureDetail,
    retryDescription,
    reopenTitle,
    reopenDescription,
    reasonLine,
  });

  useEffect(() => {
    if (!announcement) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);

  const openKycWebview = useCallback(
    (url: string) => {
      // A reopen must not let the previous close's dwell or completion hold
      // reveal a result underneath the webview that is about to cover the screen.
      clearDwellTimer();
      setHoldVerifying(false);
      clearCompletionHold();
      setWebviewPhase('open');
      // A later rejection after this retry must be reported again, including
      // a permanent one that signs the user out.
      hasNotifiedRejection.current = false;
      navigation.navigate(Routes.CARD.ONBOARDING.IMMERSVE_KYC, {
        url,
        redirectUrl: KYC_REDIRECT_URL,
      });
    },
    [navigation, clearDwellTimer, clearCompletionHold],
  );

  const leaveToHome = useCallback(() => {
    exitCardFlow();
  }, [exitCardFlow]);

  // Initial poll (needed for the resume/no-url entry).
  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  // Entry shortcut: SignUp already derived the KYC url, so open the webview
  // immediately instead of waiting for a poll.
  useEffect(() => {
    if (webviewPhase !== 'none' || !kycUrl) {
      return;
    }
    openKycWebview(kycUrl);
  }, [webviewPhase, kycUrl, openKycWebview]);

  // Auto-open the webview the first time only, and only when the backend
  // hasn't told us to prompt instead (KYC_NOT_COMPLETED / KYC_INFORMATION_NEEDED
  // ⇒ show the button, never silently reopen; KYC_EXPIRING ⇒ expired state).
  useEffect(() => {
    if (webviewPhase !== 'none' || kycUrl) {
      return;
    }
    if (nextAction?.type === 'kyc' && !promptHint && !isExpiring) {
      openKycWebview(nextAction.url ?? '');
    }
  }, [
    webviewPhase,
    kycUrl,
    nextAction,
    promptHint,
    isExpiring,
    openKycWebview,
  ]);

  // Re-poll when the webview closes back onto this screen. Exit to the wallet
  // tears this screen down before focus returns, so useFocusEffect cannot be
  // the signal — the webview invokes this callback instead.
  const handleWebviewClosed = useCallback(
    (completed: boolean) => {
      clearDwellTimer();
      setWebviewPhase('closed');
      setHoldVerifying(true);
      dwellTimerRef.current = setTimeout(() => {
        dwellTimerRef.current = null;
        setHoldVerifying(false);
      }, IMMERSVE_KYC_RESULT_MIN_DWELL_MS);
      // A completed Sumsub redirect can return before Immersve has caught up.
      // A manual close (the X, or back) shows Finish verifying as soon as the
      // minimum dwell ends.
      clearCompletionTimer();
      setAwaitingCompletedResult(completed);
      if (completed) {
        completionTimerRef.current = setTimeout(() => {
          completionTimerRef.current = null;
          setAwaitingCompletedResult(false);
        }, IMMERSVE_KYC_COMPLETION_HOLD_MS);
      }
      refresh().catch(() => undefined);
    },
    [clearDwellTimer, clearCompletionTimer, refresh],
  );

  useEffect(() => {
    setImmersveKycOnClose(handleWebviewClosed);
    return () => clearImmersveKycOnClose();
  }, [handleWebviewClosed]);

  useEffect(() => clearDwellTimer, [clearDwellTimer]);
  useEffect(() => clearCompletionTimer, [clearCompletionTimer]);

  // A funding, rejection, or review result ends the wait. So does "additional
  // information needed": that prompt is the answer, not a lagging KYC.
  useEffect(() => {
    if (!awaitingCompletedResult || !nextAction) {
      return;
    }
    if (nextAction.type !== 'kyc' || isInfoNeeded) {
      clearCompletionHold();
    }
  }, [awaitingCompletedResult, nextAction, isInfoNeeded, clearCompletionHold]);

  // The prerequisites hook only auto-polls `pending`. After Sumsub completes,
  // ask again once each poll settles on KYC until the hold ends.
  useEffect(() => {
    if (
      !holdForCompletion ||
      nextAction?.type !== 'kyc' ||
      isLoading ||
      error
    ) {
      return undefined;
    }
    const id = setTimeout(() => {
      refresh().catch(() => undefined);
    }, IMMERSVE_KYC_POLL_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [holdForCompletion, nextAction, isLoading, error, refresh]);

  useEffect(() => {
    if (
      (view !== 'failed' && view !== 'retry') ||
      nextAction?.type !== 'rejected'
    ) {
      return;
    }
    // The screen is the explanation, so this does not toast. Only a permanent
    // rejection resets onboarding; notifyKycRejected signs that session out.
    if (!nextAction.canRetry) {
      dispatch(resetOnboardingState());
    }
    if (hasNotifiedRejection.current) {
      return;
    }
    hasNotifiedRejection.current = true;
    notifyKycRejected(nextAction, {
      source: 'processing',
      toast: false,
    }).catch(() => undefined);
  }, [view, nextAction, dispatch, notifyKycRejected]);

  const viewedScreen =
    view === 'verifying' || view === 'loading'
      ? CardScreens.KYC_PROCESSING
      : view === 'verified'
        ? CardScreens.COMPLETE
        : view === 'failed'
          ? CardScreens.KYC_FAILED
          : null;

  useEffect(() => {
    if (!viewedScreen) {
      return;
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            screen: viewedScreen,
          }),
        )
        .build(),
    );
  }, [viewedScreen, trackEvent, createEventBuilder]);

  // 30s cutoff while background checks are pending, and when Immersve asks for
  // an expected spend amount (no form on this screen, so it must not sit on
  // Verifying forever). Not while the webview is open, and not over an error
  // the user can retry.
  const isWaitingOnReview =
    !error &&
    !webviewCoversScreen &&
    (nextAction?.type === 'pending' || nextAction?.type === 'expected_spend');

  useEffect(() => {
    if (!isWaitingOnReview) {
      return undefined;
    }
    const id = setTimeout(() => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Immersve, {
              action: CardActions.KYC_PENDING_TIMEOUT,
              screen: CardScreens.KYC_PROCESSING,
            }),
          )
          .build(),
      );
      exitCardFlow({ fallback: 'card-home-pending' });
      notifyKycInReview();
    }, POLLING_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [
    isWaitingOnReview,
    exitCardFlow,
    notifyKycInReview,
    trackEvent,
    createEventBuilder,
  ]);

  useEffect(() => {
    if (
      view !== 'verified' ||
      nextAction?.type !== 'funding' ||
      !isMoneyAccountCountry ||
      hasStartedFundingApproval.current
    ) {
      return;
    }
    // Money account approval has no screen of its own. Start it while You're
    // verified is on screen so Card Home mounts with the link already going.
    // Toasts wait until the user leaves, so the success screen stays quiet.
    hasStartedFundingApproval.current = true;
    const userLeft = new Promise<void>((resolve) => {
      userLeftResolveRef.current = resolve;
    });
    approveFunding(CardEntryPoint.SIGN_UP, {
      holdToastsUntil: userLeft,
    }).catch(() => undefined);
  }, [view, nextAction, isMoneyAccountCountry, approveFunding]);

  const handleReopen = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.KYC_REOPEN,
            cta_hint: ctaHint,
          }),
        )
        .build(),
    );
    openKycWebview((nextAction?.type === 'kyc' && nextAction.url) || '');
  }, [trackEvent, createEventBuilder, ctaHint, openKycWebview, nextAction]);

  const handleRejectedRetry = useCallback(() => {
    if (nextAction?.type !== 'rejected') {
      return;
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.KYC_REOPEN,
          }),
        )
        .build(),
    );
    openKycWebview(nextAction.retryUrl ?? '');
  }, [nextAction, trackEvent, createEventBuilder, openKycWebview]);

  const handleRetry = useCallback(() => {
    setIsRetryingPoll(true);
    refresh()
      .catch(() => undefined)
      .finally(() => {
        setIsRetryingPoll(false);
      });
  }, [refresh]);

  const handleFinishSetup = useCallback(() => {
    if (isFinishingSetupRef.current) {
      return;
    }
    if (nextAction?.type !== 'funding' && nextAction?.type !== 'active') {
      return;
    }
    isFinishingSetupRef.current = true;
    setIsFinishingSetup(true);
    route(nextAction, {
      countryKey: fundingCountry,
      showAccountExistsToast: false,
    });
  }, [nextAction, route, fundingCountry]);

  const renderBody = () => {
    if (view === 'verified') {
      return (
        <CardVerifiedContent
          onContinue={handleFinishSetup}
          isLoading={isFinishingSetup}
        />
      );
    }
    if (view === 'failed') {
      return (
        <KYCFailedContent onClose={leaveToHome} reasonLine={failureDetail} />
      );
    }
    if (view === 'retry') {
      return (
        <KycIdentityLayout
          title={strings('card.card_onboarding.kyc_rejected.retry_title')}
          description={retryDescription ?? ''}
          buttonLabel={strings(
            'card.card_onboarding.immersve_kyc_processing.continue_button',
          )}
          onButtonPress={handleRejectedRetry}
          buttonTestID="immersve-kyc-processing-rejected-retry-button"
        />
      );
    }
    if (view === 'blank') {
      return null;
    }
    if (view === 'loading') {
      return (
        <View
          style={tw.style('flex-1 items-center justify-center')}
          accessibilityRole="progressbar"
          accessibilityLabel={strings(
            'card.card_onboarding.immersve_kyc_processing.loading_label',
          )}
          testID="immersve-kyc-processing-spinner"
        >
          <Spinner spinnerIconProps={{ size: IconSize.Xl }} />
        </View>
      );
    }
    if (view === 'reopen') {
      return (
        <KycIdentityLayout
          title={reopenTitle}
          description={reopenDescription}
          buttonLabel={strings(
            isInfoNeeded
              ? 'card.card_onboarding.immersve_kyc_processing.info_needed_button'
              : 'card.card_onboarding.immersve_kyc_processing.continue_button',
          )}
          onButtonPress={handleReopen}
          buttonTestID="immersve-kyc-processing-reopen-button"
          reasonLine={reasonLine}
        />
      );
    }
    if (view === 'pollError') {
      return (
        <KycIdentityLayout
          title={strings(
            'card.card_onboarding.immersve_kyc_processing.error_title',
          )}
          description={error ?? ''}
          descriptionTestID="immersve-kyc-processing-error"
          buttonLabel={strings(
            'card.card_onboarding.immersve_kyc_processing.try_again_button',
          )}
          onButtonPress={handleRetry}
          buttonTestID="immersve-kyc-processing-retry-button"
        />
      );
    }
    if (view === 'expired') {
      return (
        <KycIdentityLayout
          title={strings(
            'card.card_onboarding.immersve_kyc_processing.expired_title',
          )}
          description={strings(
            'card.card_onboarding.immersve_kyc_processing.expiring_error',
          )}
          descriptionTestID="immersve-kyc-processing-error"
          buttonLabel={strings(
            'card.card_onboarding.immersve_kyc_processing.back_to_home_button',
          )}
          onButtonPress={leaveToHome}
          buttonTestID="immersve-kyc-processing-back-home-button"
        />
      );
    }
    return (
      <KycIdentityLayout
        title={strings(
          'card.card_onboarding.immersve_kyc_processing.in_progress_title',
        )}
        description={strings(
          'card.card_onboarding.immersve_kyc_processing.in_progress_description',
        )}
      />
    );
  };

  const header =
    view === 'verified' ? (
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
      />
    ) : view === 'failed' ? (
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        onBack={leaveToHome}
        backButtonProps={{ testID: 'kyc-failed-back-button' }}
      />
    ) : (
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        twClassName="bg-background-default"
        {...headerHandlers}
      />
    );

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID="immersve-kyc-processing"
    >
      {header}
      <Animated.View
        key={view}
        style={tw.style('flex-1')}
        entering={
          reduceMotion
            ? undefined
            : FadeIn.duration(AnimationDuration.Regularly)
        }
        exiting={
          reduceMotion
            ? undefined
            : FadeOut.duration(AnimationDuration.Regularly)
        }
      >
        {renderBody()}
      </Animated.View>
    </SafeAreaView>
  );
};

export default ImmersveKYCProcessing;
