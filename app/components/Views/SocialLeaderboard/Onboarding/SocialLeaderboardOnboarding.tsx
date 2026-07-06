import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, PixelRatio, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Rive, {
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
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { TAB_BAR_HEIGHT } from '../../../../component-library/components/Navigation/TabBar/TabBar.constants';
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
import createStyles, {
  ONBOARDING_GRADIENT_COLORS,
  OVERLAY_TOP_OFFSET,
} from './SocialLeaderboardOnboarding.styles';
import { SocialLeaderboardOnboardingSelectorsIDs } from './SocialLeaderboardOnboarding.testIds';
import {
  NOTIFY_STEP_INDEX,
  ONBOARDING_TOP_TRADERS_LIMIT,
  REFERENCED_ASSETS_TIMEOUT_MS,
  RIVE_ARTBOARD_NAME,
  RIVE_AVATAR_ASSET_KEYS,
  RIVE_AVATAR_PLACEHOLDERS,
  RIVE_BOOLEAN_BINDINGS,
  RIVE_NUMBER_BINDINGS,
  RIVE_STATE_MACHINE_NAME,
  RIVE_TOKEN_ASSET_SOURCES,
  RIVE_TRANSITION_SPEED,
  RIVE_TRIGGERS,
  TEXT_FADE_DURATION_MS,
  SLIDE_BY_STEP_INDEX,
  isSocialLeaderboardOnboardingSkipSeen,
  riveStepTextBinding,
  riveTraderBinding,
} from './constants';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const SocialLeaderboardNuxAnimation = require('../../../../animations/onboarding_nux_v6.riv');

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
 * The rive animation renders the visuals — background, trader
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
  const { toastRef } = useContext(ToastContext);

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

  // Localized button labels per authored `stepText{slot}` (1-based).
  //
  // Slots 3 and 4 are both the Notify slide (follow-path step 3 and maybe-later
  // step 3.1). Their labels follow notification state.
  //
  // IMPORTANT: on this artboard the `primaryButton` run feeds the ghost button
  // (which fires the `gotIt` trigger) and the `secondaryButton` run feeds the
  // solid CTA (which fires the `allowNotifications` trigger) — i.e. the run
  // names are inverted relative to the visual/trigger roles. So we place the
  // "Allow notifications" label on `secondaryButton` (solid, enables) and
  // "Got it" on `primaryButton` (ghost, dismisses) to match the Figma design:
  // - prompt still needed → ghost "Got it" (`primaryButton`) + solid "Allow
  //   notifications" (`secondaryButton`), paired with `allowNotificationsBoolean
  //   = true` (two buttons);
  // - already enabled → both labels "Got it", paired with
  //   `allowNotificationsBoolean = false` (single "Got it").
  const stepButtons = useMemo<{ slot: number; buttons: StepButtons }[]>(() => {
    const gotIt = strings('social_leaderboard.onboarding.got_it');
    const notifyButtons: StepButtons = shouldPromptNotifications
      ? {
          primaryButton: gotIt,
          secondaryButton: strings(
            'social_leaderboard.onboarding.allow_notifications',
          ),
        }
      : {
          primaryButton: gotIt,
          secondaryButton: gotIt,
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
  }, [shouldPromptNotifications]);

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

  // Read inside the timeout/settle effect below via a ref so it always sees the
  // latest fetch result without re-arming the timeout on every re-render (the
  // hook returns a new `traders` array identity on each fetch tick).
  const topTradersRef = useRef(topTraders);
  topTradersRef.current = topTraders;

  // Pure safety net: `Wallet` only navigates here once this query's data is in
  // cache, so the artboard normally mounts with live data on the first effect
  // run. This guards the rare case the data isn't ready at mount (e.g. cache
  // evicted between prefetch and navigation) so we don't wait on
  // `referencedAssets` forever. If the fetch settles after this forced mount,
  // the name/PnL text bindings above still pick up the real data (they're not
  // frozen) — only the avatars stay on the placeholder for that session, since
  // swapping them would trigger the `reloadView()` crash.
  const [forceMountAssets, setForceMountAssets] = useState(false);
  useEffect(() => {
    const timer = setTimeout(
      () => setForceMountAssets(true),
      REFERENCED_ASSETS_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (referencedAssets || (isLoadingTraders && !forceMountAssets)) {
      return;
    }
    const mapping: FilesHandledMapping = {};
    // Static token logos on the Notify-step buy cards (nova/blast/punch). These
    // never change, so they're folded into the same frozen mapping.
    Object.entries(RIVE_TOKEN_ASSET_SOURCES).forEach(([assetKey, source]) => {
      mapping[assetKey] = { source };
    });
    RIVE_AVATAR_ASSET_KEYS.forEach((assetKey, index) => {
      const uri = topTradersRef.current[index]?.avatarUri;
      mapping[assetKey] = hasRealAvatar(uri)
        ? { source: { uri } }
        : { source: RIVE_AVATAR_PLACEHOLDERS[index] };
    });
    setReferencedAssets(mapping);
  }, [referencedAssets, isLoadingTraders, forceMountAssets]);

  // `AutoBind(true)` builds a fresh object each call; memoize it so the Rive
  // `dataBinding` prop keeps a stable identity and isn't reconfigured per render.
  const dataBinding = useMemo(() => AutoBind(true), []);

  // Push static config once the Rive runtime is ready, and signal readiness.
  useEffect(() => {
    if (!riveRef) return;
    setTransitionSpeed(RIVE_TRANSITION_SPEED);
    setIsReady(true);
  }, [riveRef, setTransitionSpeed, setIsReady]);

  // Toggle the Notify step's button layout. `allowNotificationsBoolean` follows
  // notification state on ANY Notify step (post-follow step 3 and the
  // maybe-later variant step 3.1): `true` renders two buttons ("Allow
  // notifications" + "Got it") while a prompt is still needed; `false` renders a
  // single "Got it" once notifications are enabled.
  useEffect(() => {
    if (!riveRef) return;
    const showAllowNotifications =
      shouldPromptNotifications && stepIndex >= NOTIFY_STEP_INDEX;
    setAllowNotificationsBoolean(showAllowNotifications);
  }, [
    riveRef,
    shouldPromptNotifications,
    stepIndex,
    setAllowNotificationsBoolean,
  ]);

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

  const exitToLeaderboard = useCallback(
    (extraParams?: { showNotificationsBanner?: boolean }) => {
      navigation.dispatch(
        StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, {
          source: ONBOARDING_SOURCE,
          ...extraParams,
        }),
      );
    },
    [navigation],
  );

  const goToLeaderboard = useCallback(
    (extraParams?: { showNotificationsBanner?: boolean }) => {
      if (hasCompletedRef.current) {
        return;
      }
      hasCompletedRef.current = true;
      void markOnboardingSeen();
      track(MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_COMPLETED, {
        [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
      });
      exitToLeaderboard(extraParams);
    },
    [track, exitToLeaderboard],
  );

  const handleClose = useCallback(() => {
    void markOnboardingSeen();
    track(MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_DISMISSED, {
      [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
      [SocialLeaderboardEventProperties.SCREEN]:
        SLIDE_BY_STEP_INDEX[stepIndexRef.current],
    });
    navigation.goBack();
  }, [navigation, track]);

  // Forward navigation. The "Next" button (Trade slide) AND the artboard's
  // forward tap-zone (right margin) both fire `next`, from whichever slide is
  // showing — so RN must advance relative to the current step, not hardcode it,
  // or the overlay copy/button toggle desync from the slide Rive actually shows.
  //
  // Trade -> Follow only. On the Follow slide a forward tap is intentionally a
  // no-op: the v6 artboard does not transition Follow on `next`, so advancing
  // the RN overlay here would desync the copy from the slide Rive keeps showing.
  // The user must choose "Follow the top three" or "Maybe later" to move on.
  const handleNext = useCallback(() => {
    if (stepIndexRef.current === 0) {
      setStep(1);
    }
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

  // Confirm the enable with a toast (rendered by the global ToastContext, so it
  // survives the route replace and lands on the leaderboard). Only shown when
  // permission was granted; the OS-denied case is handled on the leaderboard via
  // a persistent nudge banner (a toast disappears too quickly to catch), so the
  // user is never ejected mid-onboarding and always sees the actionable prompt.
  const showNotificationsEnabledToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [
        {
          label: strings(
            'notifications.push_onboarding.new_user.toast.notifications_on.title',
          ),
          isBold: true,
        },
      ],
      descriptionOptions: {
        description: strings(
          'notifications.push_onboarding.new_user.toast.notifications_on.description',
        ),
      },
      startAccessory: (
        <View style={styles.toastAccessory}>
          <Icon
            name={IconName.CheckBold}
            size={IconSize.Lg}
            color={IconColor.Success}
          />
        </View>
      ),
      customBottomOffset: TAB_BAR_HEIGHT,
      hasNoTimeout: false,
    });
  }, [toastRef, styles.toastAccessory]);

  // "Allow notifications" (terminal): enable notifications, then complete. The
  // button appears on either Notify slide (step 3 or 3.1) while prompting is
  // needed, so it is honored on any Notify step — never before it (an earlier
  // mis-fired trigger can't boot the user).
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
    // Await the enable before navigating: `goToLeaderboard` does a full route
    // replace that tears down this screen, and firing the enable without
    // awaiting lets that teardown cut off the in-flight notification setup so
    // the toggle never actually flips on. (The hook handles its own errors, so
    // this never rejects.)
    await enableNotificationsInBackground(granted);
    if (granted) {
      showNotificationsEnabledToast();
    }
    track(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_NOTIFICATIONS_ENABLED,
      {
        [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
      },
    );
    // OS denied → land on the leaderboard with the nudge banner so the user can
    // still turn notifications on from device settings.
    goToLeaderboard({ showNotificationsBanner: !granted });
  }, [
    shouldPromptNotifications,
    requestPushPermission,
    enableNotificationsInBackground,
    showNotificationsEnabledToast,
    track,
    goToLeaderboard,
  ]);

  // "Got it" (terminal): complete without enabling notifications. It is present
  // on every Notify slide — step 3.1 (maybe later) and step 3 (above the "Allow
  // notifications" button, or on its own once notifications are enabled) — so it
  // completes on any Notify step. Fired by both the `gotIt` and `gotIt 2`
  // triggers (the two Notify button layouts).
  const handleGotIt = useCallback(() => {
    if (stepIndexRef.current < NOTIFY_STEP_INDEX) {
      return;
    }
    if (swallowNextCompletionRef.current) {
      swallowNextCompletionRef.current = false;
      return;
    }
    goToLeaderboard();
  }, [goToLeaderboard]);

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
  useRiveTrigger(riveRef, RIVE_TRIGGERS.GOT_IT_2, handleGotIt);

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

  // Fade the RN title/description overlay out-then-in on each step change so the
  // copy transitions like the artboard's own button fades (motion proposal). The
  // live layer always renders `currentText` (updates synchronously) but starts
  // invisible; on a change we stack the previous copy over it, fade the old copy
  // fully out, then fade the new copy in. A *sequential* fade (not a cross-fade)
  // avoids two different strings overlapping mid-transition, which reads as a
  // flicker. `useLayoutEffect` resets the opacities before the frame paints, so
  // the new copy never flashes in at full opacity first.
  const enterOpacity = useRef(new Animated.Value(1)).current;
  const exitOpacity = useRef(new Animated.Value(0)).current;
  const previousTextRef = useRef(currentText);
  const [fadingOutText, setFadingOutText] = useState<{
    title: string;
    description: string;
  } | null>(null);

  useLayoutEffect(() => {
    const previous = previousTextRef.current;
    if (
      previous.title === currentText.title &&
      previous.description === currentText.description
    ) {
      return undefined;
    }
    previousTextRef.current = currentText;
    setFadingOutText(previous);
    enterOpacity.setValue(0);
    exitOpacity.setValue(1);
    const animation = Animated.sequence([
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: TEXT_FADE_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: TEXT_FADE_DURATION_MS,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) {
        setFadingOutText(null);
      }
    });
    return () => animation.stop();
  }, [currentText, enterOpacity, exitOpacity]);

  return (
    <View
      style={styles.container}
      testID={SocialLeaderboardOnboardingSelectorsIDs.CONTAINER}
    >
      {/* Branded backdrop behind the artboard, covering the artboard's native
          first-paint warmup so the step copy never sits on a black flash. */}
      <LinearGradient
        colors={ONBOARDING_GRADIENT_COLORS}
        style={styles.gradient}
        pointerEvents="none"
      />
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
          fit={Fit.Layout}
          layoutScaleFactor={PixelRatio.get()}
          onError={handleError}
          style={StyleSheet.absoluteFillObject}
          testID={SocialLeaderboardOnboardingSelectorsIDs.RIVE_ANIMATION}
        />
      )}
      {/* Title + description overlay. The live layer holds the current copy; the
          fading-out layer (only present mid-transition) holds the previous copy
          pinned on top so the two cross-fade in place. */}
      <View
        style={[styles.textOverlay, { top: insets.top + OVERLAY_TOP_OFFSET }]}
        pointerEvents="none"
      >
        <View style={styles.textStack}>
          {fadingOutText && (
            <Animated.View
              style={[styles.textLayerFadingOut, { opacity: exitOpacity }]}
            >
              <Text style={styles.title}>{fadingOutText.title}</Text>
              <Text style={styles.description}>
                {fadingOutText.description}
              </Text>
            </Animated.View>
          )}
          <Animated.View style={[styles.textStack, { opacity: enterOpacity }]}>
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
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

export default SocialLeaderboardOnboarding;
