import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Rive, {
  Alignment,
  AutoBind,
  Fit,
  FilesHandledMapping,
  RNRiveError,
  RNRiveErrorType,
  useRive,
  useRiveBoolean,
  useRiveNumber,
  useRiveString,
  useRiveTrigger,
} from 'rive-react-native';

import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import StorageWrapper from '../../../../store/storage-wrapper';
import { SOCIAL_LEADERBOARD_ONBOARDING_SHOWN } from '../../../../constants/storage';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Logger from '../../../../util/Logger';

import {
  selectIsMetamaskNotificationsEnabled,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../../selectors/notifications';
import { selectSocialLeaderboardPerpsEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications/constants/config';
import { usePushPermissionNotificationSetup } from '../../../../util/notifications/hooks/usePushPermissionNotificationSetup';

// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useTopTraders } from '../../Homepage/Sections/TopTraders/hooks';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { hasRealAvatar } from '../../Homepage/Sections/TopTraders/utils/avatarFallback';
import { ALL_CHAINS, SPOT_CHAINS } from '../../shared/top-traders-constants';

import {
  SocialLeaderboardEventProperties,
  useSocialLeaderboardAnalytics,
} from '../analytics';
import { formatSignedFullUsdNoDecimals } from '../utils/formatters';
import createStyles from './SocialLeaderboardOnboarding.styles';
import { SocialLeaderboardOnboardingSelectorsIDs } from './SocialLeaderboardOnboarding.testIds';
import {
  NOTIFY_STEP_INDEX,
  ONBOARDING_TOP_TRADERS_LIMIT,
  RIVE_ARTBOARD_NAME,
  RIVE_AVATAR_ASSET_KEYS,
  RIVE_AVATAR_PLACEHOLDERS,
  RIVE_BOOLEAN_BINDINGS,
  RIVE_NUMBER_BINDINGS,
  RIVE_STATE_MACHINE_NAME,
  RIVE_TRANSITION_SPEED,
  RIVE_TRIGGERS,
  SLIDE_BY_STEP_INDEX,
  isSocialLeaderboardOnboardingSkipSeen,
  riveStepTextBinding,
  riveTraderBinding,
} from './constants';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const SocialLeaderboardNuxAnimation = require('../../../../animations/onboarding_nux_v4.riv');

const ONBOARDING_SOURCE = 'nux';

/**
 * Rive errors that mean the artboard cannot render at all — only these fall back
 * to the leaderboard. Everything else (a missing data binding, text run, or an
 * unused/failed referenced asset) is logged but must NOT boot the user out of
 * the onboarding, or one bad avatar URL / renamed binding would skip the whole
 * flow.
 */
const FATAL_RIVE_ERROR_TYPES: ReadonlySet<RNRiveErrorType> = new Set([
  RNRiveErrorType.FileNotFound,
  RNRiveErrorType.MalformedFile,
  RNRiveErrorType.UnsupportedRuntimeVersion,
  RNRiveErrorType.IncorrectRiveFileUrl,
  RNRiveErrorType.IncorrectArtboardName,
  RNRiveErrorType.IncorrectStateMachineName,
]);

/** Rive runtime handle returned by `useRive` (null until the runtime is ready). */
type RiveInstance = ReturnType<typeof useRive>[1];

interface StepButtons {
  primaryButton: string;
  secondaryButton: string;
}

/**
 * Binds one slide's localized button labels into its `stepText{slot}/*Button`
 * Rive properties. Extracted as a component so the `useRiveString` hooks stay
 * top-level (rules-of-hooks) while the parent renders one per slide.
 *
 * NOTE: the v4 ("hybrid") artboard no longer carries `title`/`content` text —
 * those are rendered by React Native (see the overlay below) — so only the
 * button labels are pushed here.
 */
const RiveStepButtonsBinding: React.FC<{
  riveRef: RiveInstance;
  slot: number;
  buttons: StepButtons;
}> = ({ riveRef, slot, buttons }) => {
  const [, setPrimary] = useRiveString(
    riveRef,
    riveStepTextBinding(slot, 'primaryButton'),
  );
  const [, setSecondary] = useRiveString(
    riveRef,
    riveStepTextBinding(slot, 'secondaryButton'),
  );

  useEffect(() => {
    if (!riveRef) return;
    setPrimary(buttons.primaryButton);
    setSecondary(buttons.secondaryButton);
  }, [riveRef, buttons, setPrimary, setSecondary]);

  return null;
};

/**
 * Binds one trader card's live text (`traderTop{rank}/name` + `/profitAmount`)
 * into the Rive artboard. Avatars are handled separately via `referencedAssets`.
 */
const RiveTraderCardBinding: React.FC<{
  riveRef: RiveInstance;
  rank: number;
  name?: string;
  profitAmount?: string;
}> = ({ riveRef, rank, name, profitAmount }) => {
  const [, setName] = useRiveString(riveRef, riveTraderBinding(rank, 'name'));
  const [, setProfitAmount] = useRiveString(
    riveRef,
    riveTraderBinding(rank, 'profitAmount'),
  );

  useEffect(() => {
    if (!riveRef || !name) return;
    setName(name);
    setProfitAmount(profitAmount ?? '');
  }, [riveRef, name, profitAmount, setName, setProfitAmount]);

  return null;
};

const markOnboardingSeen = () => {
  if (isSocialLeaderboardOnboardingSkipSeen) {
    return;
  }
  return StorageWrapper.setItem(SOCIAL_LEADERBOARD_ONBOARDING_SHOWN, 'true', {
    emitEvent: false,
  });
};

/**
 * Social Leaderboard onboarding shown once on app start (Rive + RN hybrid,
 * modeled on `MoneyOnboardingView`).
 *
 * The `onboarding_nux_v4.riv` artboard renders the visuals — background, trader
 * cards, buttons — and owns step navigation through its state machine. React
 * Native is the "hybrid" half. It renders each step's title + description as an
 * overlay (v4 no longer bakes copy into the Rive), pushes button labels + live
 * top-trader data (usernames/PnL via data bindings, avatars via
 * `referencedAssets`) into the artboard, observes the state-machine triggers to
 * run the follow / notification / analytics / persistence logic and to track the
 * current step, and routes the user out to the leaderboard when the flow
 * completes.
 *
 * Step order (Figma) is Trade -> Follow -> Notify. The authored Rive state
 * names are opaque (`init`/`scenario1`/`first`…), so the current step is tracked
 * from the triggers, not `onStateChanged`. Completion (`allowNotifications` /
 * `gotIt`) is gated on being on the Notify step, so a mis-wired earlier button
 * can never navigate the user out early.
 */
const SocialLeaderboardOnboarding: React.FC = () => {
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(), []);
  const insets = useSafeAreaInsets();
  const { track } = useSocialLeaderboardAnalytics();

  const isPerpsEnabled = useSelector(selectSocialLeaderboardPerpsEnabled);
  const isNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const isPushEnabled = useSelector(selectIsMetaMaskPushNotificationsEnabled);
  const { enableNotificationsInBackground, requestPushPermission } =
    usePushPermissionNotificationSetup();

  const shouldPromptNotifications =
    isNotificationsFeatureEnabled() &&
    !(isNotificationsEnabled && isPushEnabled);

  const chains = useMemo(
    () => (isPerpsEnabled ? ALL_CHAINS : SPOT_CHAINS),
    [isPerpsEnabled],
  );

  const {
    traders,
    toggleFollow,
    isLoading: isLoadingTraders,
  } = useTopTraders({
    limit: ONBOARDING_TOP_TRADERS_LIMIT,
    chains,
  });

  const topTraders = useMemo(
    () => traders.slice(0, ONBOARDING_TOP_TRADERS_LIMIT),
    [traders],
  );

  const [ref, riveRef] = useRive();

  // Current step (index into SLIDE_BY_STEP_INDEX): 0 Trade, 1 Follow, 2 Notify
  // (post-follow), 3 Notify ("3.1" / maybe-later variant). Driven by the Rive
  // triggers since the authored state names are opaque. `stepIndex` renders the
  // overlay copy; `stepIndexRef` gates completion inside memoized callbacks.
  const [stepIndex, setStepIndex] = useState(0);
  const stepIndexRef = useRef(0);
  const setStep = useCallback((next: number) => {
    stepIndexRef.current = next;
    setStepIndex(next);
  }, []);

  const hasCompletedRef = useRef(false);
  const lastTrackedSlideRef = useRef<string | null>(null);
  // "Maybe later" transitions to the Notify "3.1" slide, and that transition
  // pulses the visible button's completion trigger as the slide animates in
  // (the Figma flow even inserts a deliberate "RIVE DB" delay here, so the pulse
  // can arrive late — a time-based guard isn't reliable). We latch on the
  // maybe-later tap and swallow exactly that one spurious completion pulse; the
  // user's real "Allow notifications"/"Got it" tap afterwards still completes.
  const swallowNextCompletionRef = useRef(false);

  const [, setTransitionSpeed] = useRiveNumber(
    riveRef,
    RIVE_NUMBER_BINDINGS.TRANSITION_SPEED,
  );
  const [, setAllowNotificationsBoolean] = useRiveBoolean(
    riveRef,
    RIVE_BOOLEAN_BINDINGS.ALLOW_NOTIFICATIONS,
  );
  const [, setIsReady] = useRiveBoolean(
    riveRef,
    RIVE_BOOLEAN_BINDINGS.IS_READY,
  );

  // Localized title + description rendered by RN per step (v4 no longer bakes
  // these into the Rive). Index matches SLIDE_BY_STEP_INDEX; slots 2 and 3 share
  // the Notify title but differ in description (post-follow vs "maybe later").
  const stepText = useMemo(
    () => [
      {
        title: strings('social_leaderboard.onboarding.slide_trade.title'),
        description: strings(
          'social_leaderboard.onboarding.slide_trade.description',
        ),
      },
      {
        title: strings('social_leaderboard.onboarding.slide_follow.title'),
        description: strings(
          'social_leaderboard.onboarding.slide_follow.description',
        ),
      },
      {
        title: strings('social_leaderboard.onboarding.slide_notify.title'),
        description: strings(
          'social_leaderboard.onboarding.slide_notify.description_followed',
        ),
      },
      {
        title: strings('social_leaderboard.onboarding.slide_notify.title'),
        description: strings(
          'social_leaderboard.onboarding.slide_notify.description_default',
        ),
      },
    ],
    [],
  );

  // Localized button labels per authored `stepText{slot}` (1-based). Slots 3 and
  // 4 are both the Notify slide; the visible button ("Allow notifications" vs
  // "Got it") is toggled inside the Rive by `allowNotificationsBoolean`.
  const stepButtons = useMemo<{ slot: number; buttons: StepButtons }[]>(() => {
    const notifyButtons: StepButtons = {
      primaryButton: strings(
        'social_leaderboard.onboarding.allow_notifications',
      ),
      secondaryButton: strings('social_leaderboard.onboarding.got_it'),
    };
    return [
      {
        slot: 1,
        buttons: {
          primaryButton: strings('social_leaderboard.onboarding.next'),
          secondaryButton: '',
        },
      },
      {
        slot: 2,
        buttons: {
          primaryButton: strings(
            'social_leaderboard.onboarding.follow_top_three',
          ),
          secondaryButton: strings('social_leaderboard.onboarding.maybe_later'),
        },
      },
      { slot: 3, buttons: notifyButtons },
      { slot: 4, buttons: notifyButtons },
    ];
  }, []);

  // Live trader card text (avatars handled separately via referencedAssets).
  const traderCards = useMemo(
    () =>
      Array.from({ length: ONBOARDING_TOP_TRADERS_LIMIT }, (_, index) => {
        const trader = topTraders[index];
        return {
          rank: index + 1,
          name: trader?.username,
          profitAmount: trader
            ? formatSignedFullUsdNoDecimals(trader.pnlValue)
            : undefined,
        };
      }),
    [topTraders],
  );

  // Dynamic avatars streamed into the Rive card slots. Real profile images use
  // the live HTTPS URL; missing/placeholder avatars fall back to the bundled
  // per-slot placeholder (the legacy runtime can only consume image
  // URLs/bundled files, not the address-derived Maskicon used elsewhere).
  //
  // CRITICAL: the native runtime calls `reloadView()` (full artboard + state
  // machine teardown/recreate) every time the `referencedAssets` prop identity
  // changes. If we let it swap from placeholders to live URLs when the
  // leaderboard loads — or churn as `traders` is rebuilt on follow/refetch — the
  // Rive view reloads mid-flight while our data-binding writes hit a
  // half-initialized view, which crashes the app. So `referencedAssets` is
  // computed ONCE from the first settled trader data and then frozen for the
  // artboard's lifetime, and the artboard is only mounted after it is ready.
  const [referencedAssets, setReferencedAssets] =
    useState<FilesHandledMapping | null>(null);

  useEffect(() => {
    if (referencedAssets || isLoadingTraders) {
      return;
    }
    const mapping: FilesHandledMapping = {};
    RIVE_AVATAR_ASSET_KEYS.forEach((assetKey, index) => {
      const uri = topTraders[index]?.avatarUri;
      mapping[assetKey] = hasRealAvatar(uri)
        ? { source: { uri } }
        : { source: RIVE_AVATAR_PLACEHOLDERS[index] };
    });
    setReferencedAssets(mapping);
  }, [referencedAssets, isLoadingTraders, topTraders]);

  // `AutoBind(true)` builds a fresh object each call; memoize it so the Rive
  // `dataBinding` prop keeps a stable identity and isn't reconfigured per render.
  const dataBinding = useMemo(() => AutoBind(true), []);

  // Push static config once the Rive runtime is ready, and signal readiness.
  useEffect(() => {
    if (!riveRef) return;
    setTransitionSpeed(RIVE_TRANSITION_SPEED);
    setIsReady(true);
  }, [riveRef, setTransitionSpeed, setIsReady]);

  // Tell the Notify step which button to show: "Allow notifications" while we
  // still need to prompt, "Got it" once notifications are already enabled.
  useEffect(() => {
    if (!riveRef) return;
    setAllowNotificationsBoolean(shouldPromptNotifications);
  }, [riveRef, shouldPromptNotifications, setAllowNotificationsBoolean]);

  // Track SCREEN_VIEWED whenever the reported slide changes. Runs on mount
  // (Trade) and whenever `stepIndex` moves to a new slide; the two Notify steps
  // share the `notify` screen, so 2 -> 3 does not double-count.
  useEffect(() => {
    const slide = SLIDE_BY_STEP_INDEX[stepIndex];
    if (lastTrackedSlideRef.current === slide) {
      return;
    }
    lastTrackedSlideRef.current = slide;
    track(MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_SCREEN_VIEWED, {
      [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
      [SocialLeaderboardEventProperties.SCREEN]: slide,
    });
  }, [stepIndex, track]);

  const exitToLeaderboard = useCallback(() => {
    navigation.dispatch(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, {
        source: ONBOARDING_SOURCE,
      }),
    );
  }, [navigation]);

  const goToLeaderboard = useCallback(() => {
    if (hasCompletedRef.current) {
      return;
    }
    hasCompletedRef.current = true;
    void markOnboardingSeen();
    track(MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_COMPLETED, {
      [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
    });
    exitToLeaderboard();
  }, [track, exitToLeaderboard]);

  const handleClose = useCallback(() => {
    void markOnboardingSeen();
    track(MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_DISMISSED, {
      [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
      [SocialLeaderboardEventProperties.SCREEN]:
        SLIDE_BY_STEP_INDEX[stepIndexRef.current],
    });
    navigation.goBack();
  }, [navigation, track]);

  // Trade step: advance to Follow. Rive runs its own transition; RN only tracks
  // the step so the overlay copy and analytics stay in sync.
  const handleNext = useCallback(() => {
    setStep(1);
  }, [setStep]);

  // Step back one slide (Notify -> Follow, Follow -> Trade).
  const handleBack = useCallback(() => {
    setStep(stepIndexRef.current >= NOTIFY_STEP_INDEX ? 1 : 0);
  }, [setStep]);

  // Follow step (not terminal): advance to the post-follow Notify copy, then
  // follow the not-yet-followed top traders.
  const handleFollowTopThree = useCallback(async () => {
    setStep(2);
    await Promise.all(
      topTraders
        .filter((trader) => !trader.isFollowing)
        .map((trader) =>
          toggleFollow(trader.id, {
            source: ONBOARDING_SOURCE,
            traderAddress: trader.address,
            traderUsername: trader.username,
            traderRank: trader.rank,
          }),
        ),
    );
  }, [topTraders, toggleFollow, setStep]);

  // Follow step (not terminal): advance to the "maybe later" Notify copy variant
  // and arm the latch so the transition's spurious completion pulse is ignored.
  const handleMaybeLater = useCallback(() => {
    setStep(3);
    swallowNextCompletionRef.current = true;
  }, [setStep]);

  // Notify step (terminal): enable notifications, then complete the flow.
  //
  // Two guards prevent a premature exit:
  // 1. Must be on the Notify step, so an earlier button that (mis)fires this
  //    trigger can't navigate the user out early.
  // 2. Must be the *visible* button's trigger. The Notify step shows exactly one
  //    of "Allow notifications" / "Got it" (toggled by `allowNotificationsBoolean`),
  //    and the state machine pulses the hidden variant's trigger when the Notify
  //    slide animates in (notably the "3.1" / maybe-later variant) — honoring it
  //    would boot the user to the leaderboard the instant the slide appears.
  const handleAllowNotifications = useCallback(async () => {
    if (
      stepIndexRef.current < NOTIFY_STEP_INDEX ||
      !shouldPromptNotifications
    ) {
      return;
    }
    if (swallowNextCompletionRef.current) {
      swallowNextCompletionRef.current = false;
      return;
    }
    const granted = await requestPushPermission();
    enableNotificationsInBackground(granted);
    track(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_NOTIFICATIONS_ENABLED,
      {
        [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
      },
    );
    goToLeaderboard();
  }, [
    shouldPromptNotifications,
    requestPushPermission,
    enableNotificationsInBackground,
    track,
    goToLeaderboard,
  ]);

  // Notify step (terminal): notifications already enabled, just complete. Same
  // guards as `handleAllowNotifications` — "Got it" is only the visible button
  // when we no longer need to prompt.
  const handleGotIt = useCallback(() => {
    if (stepIndexRef.current < NOTIFY_STEP_INDEX || shouldPromptNotifications) {
      return;
    }
    if (swallowNextCompletionRef.current) {
      swallowNextCompletionRef.current = false;
      return;
    }
    goToLeaderboard();
  }, [shouldPromptNotifications, goToLeaderboard]);

  // Rive owns navigation; RN observes the triggers to track the current step and
  // run each button's side effect. Completion is gated on the Notify step above.
  useRiveTrigger(riveRef, RIVE_TRIGGERS.CLOSE, handleClose);
  useRiveTrigger(riveRef, RIVE_TRIGGERS.NEXT, handleNext);
  useRiveTrigger(riveRef, RIVE_TRIGGERS.BACK, handleBack);
  useRiveTrigger(
    riveRef,
    RIVE_TRIGGERS.FOLLOW_TOP_TRADERS,
    handleFollowTopThree,
  );
  useRiveTrigger(riveRef, RIVE_TRIGGERS.MAYBE_LATER, handleMaybeLater);
  useRiveTrigger(
    riveRef,
    RIVE_TRIGGERS.ALLOW_NOTIFICATIONS,
    handleAllowNotifications,
  );
  useRiveTrigger(riveRef, RIVE_TRIGGERS.GOT_IT, handleGotIt);

  const handleError = useCallback(
    (riveError: RNRiveError) => {
      const description = `SocialLeaderboardOnboarding: Rive error: ${riveError.message} - ${riveError.type}`;

      // Non-fatal (missing binding/text run, unused or failed referenced asset):
      // log and keep the onboarding on screen so a single mismatch doesn't skip
      // the flow.
      if (!FATAL_RIVE_ERROR_TYPES.has(riveError.type)) {
        Logger.log(description);
        return;
      }

      Logger.error(new Error(description));
      if (hasCompletedRef.current) {
        return;
      }
      hasCompletedRef.current = true;
      void markOnboardingSeen();
      exitToLeaderboard();
    },
    [exitToLeaderboard],
  );

  const currentText = stepText[stepIndex] ?? stepText[0];

  return (
    <View
      style={styles.container}
      testID={SocialLeaderboardOnboardingSelectorsIDs.CONTAINER}
    >
      {stepButtons.map(({ slot, buttons }) => (
        <RiveStepButtonsBinding
          key={slot}
          riveRef={riveRef}
          slot={slot}
          buttons={buttons}
        />
      ))}
      {traderCards.map((card) => (
        <RiveTraderCardBinding
          key={card.rank}
          riveRef={riveRef}
          rank={card.rank}
          name={card.name}
          profitAmount={card.profitAmount}
        />
      ))}
      {/* Mount only once `referencedAssets` is resolved and frozen, so the prop
          never changes afterwards (a change triggers a native `reloadView()`). */}
      {referencedAssets && (
        <Rive
          ref={ref}
          source={SocialLeaderboardNuxAnimation}
          artboardName={RIVE_ARTBOARD_NAME}
          stateMachineName={RIVE_STATE_MACHINE_NAME}
          dataBinding={dataBinding}
          referencedAssets={referencedAssets}
          fit={Fit.Cover}
          alignment={Alignment.Center}
          onError={handleError}
          style={StyleSheet.absoluteFillObject}
          testID={SocialLeaderboardOnboardingSelectorsIDs.RIVE_ANIMATION}
        />
      )}
      {/* Title + description overlay. */}
      <View
        style={[styles.textOverlay, { top: insets.top + 48 }]}
        pointerEvents="none"
      >
        <Text
          style={styles.title}
          testID={SocialLeaderboardOnboardingSelectorsIDs.STEP_TITLE}
        >
          {currentText.title}
        </Text>
        <Text
          style={styles.description}
          testID={SocialLeaderboardOnboardingSelectorsIDs.STEP_DESCRIPTION}
        >
          {currentText.description}
        </Text>
      </View>
    </View>
  );
};

export default SocialLeaderboardOnboarding;
