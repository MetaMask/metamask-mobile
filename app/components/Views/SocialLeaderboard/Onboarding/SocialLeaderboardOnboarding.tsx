import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Rive, {
  Alignment,
  AutoBind,
  Fit,
  RNRiveError,
  useRive,
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
import { ALL_CHAINS, SPOT_CHAINS } from '../../shared/top-traders-constants';

import {
  SocialLeaderboardEventProperties,
  useSocialLeaderboardAnalytics,
} from '../analytics';
import { formatPercent, formatSignedAbbreviatedUsd } from '../utils/formatters';
import createStyles from './SocialLeaderboardOnboarding.styles';
import { SocialLeaderboardOnboardingSelectorsIDs } from './SocialLeaderboardOnboarding.testIds';
import {
  ONBOARDING_TOP_TRADERS_LIMIT,
  RIVE_ARTBOARD_NAME,
  RIVE_NUMBER_BINDINGS,
  RIVE_STATE_MACHINE_NAME,
  RIVE_STATE_TO_STEP_INDEX,
  RIVE_STEP_SLOTS,
  RIVE_TRADER_PERIOD,
  RIVE_TRANSITION_SPEED,
  RIVE_TRIGGERS,
  isSocialLeaderboardOnboardingSkipSeen,
  riveStepTextBinding,
  riveTraderBinding,
} from './constants';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const SocialLeaderboardNuxAnimation = require('../../../../animations/onboarding_nux_v1.riv');

const ONBOARDING_SOURCE = 'nux';

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
 * A single text-baked Rive artboard (`onboarding_nux_v1.riv`) renders every
 * visual — copy, trader cards, buttons — and owns step navigation through its
 * state machine. This component is the React Native half: it pushes localized
 * strings and live top-trader data in through data bindings, observes the
 * state-machine triggers (`next` / `allowNotifications` / `gotIt` /
 * `followTopTraders` / `maybeLater` / `close`) to run the follow, notification,
 * analytics and persistence logic, and routes the user out to the leaderboard
 * when the flow completes.
 *
 * Authored step order is Trade -> Notify -> Follow (see `RIVE_STEP_SLOTS`); the
 * Follow step is terminal, so following (or skipping) the top traders completes
 * the flow.
 */
const SocialLeaderboardOnboarding: React.FC = () => {
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(), []);
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

  const { traders, toggleFollow } = useTopTraders({
    limit: ONBOARDING_TOP_TRADERS_LIMIT,
    chains,
  });

  const topTraders = useMemo(
    () => traders.slice(0, ONBOARDING_TOP_TRADERS_LIMIT),
    [traders],
  );

  const [ref, riveRef] = useRive();

  // Current authored slot (index into RIVE_STEP_SLOTS). Used for the DISMISSED
  // screen property and to avoid re-tracking a slide already reported.
  const currentSlotRef = useRef(0);
  const hasCompletedRef = useRef(false);

  // --- Rive data-binding setters (Rive renders these; RN pushes the values) ---
  const [, setStep1Title] = useRiveString(
    riveRef,
    riveStepTextBinding(1, 'title'),
  );
  const [, setStep1Content] = useRiveString(
    riveRef,
    riveStepTextBinding(1, 'content'),
  );
  const [, setStep1Primary] = useRiveString(
    riveRef,
    riveStepTextBinding(1, 'primaryButton'),
  );
  const [, setStep1Secondary] = useRiveString(
    riveRef,
    riveStepTextBinding(1, 'secondaryButton'),
  );

  const [, setStep2Title] = useRiveString(
    riveRef,
    riveStepTextBinding(2, 'title'),
  );
  const [, setStep2Content] = useRiveString(
    riveRef,
    riveStepTextBinding(2, 'content'),
  );
  const [, setStep2Primary] = useRiveString(
    riveRef,
    riveStepTextBinding(2, 'primaryButton'),
  );
  const [, setStep2Secondary] = useRiveString(
    riveRef,
    riveStepTextBinding(2, 'secondaryButton'),
  );

  const [, setStep3Title] = useRiveString(
    riveRef,
    riveStepTextBinding(3, 'title'),
  );
  const [, setStep3Content] = useRiveString(
    riveRef,
    riveStepTextBinding(3, 'content'),
  );
  const [, setStep3Primary] = useRiveString(
    riveRef,
    riveStepTextBinding(3, 'primaryButton'),
  );
  const [, setStep3Secondary] = useRiveString(
    riveRef,
    riveStepTextBinding(3, 'secondaryButton'),
  );

  const [, setTrader1Name] = useRiveString(
    riveRef,
    riveTraderBinding(1, 'name'),
  );
  const [, setTrader1Period] = useRiveString(
    riveRef,
    riveTraderBinding(1, 'period'),
  );
  const [, setTrader1ProfitAmount] = useRiveString(
    riveRef,
    riveTraderBinding(1, 'profitAmount'),
  );
  const [, setTrader1ProfitPercent] = useRiveString(
    riveRef,
    riveTraderBinding(1, 'profitPercent'),
  );

  const [, setTrader2Name] = useRiveString(
    riveRef,
    riveTraderBinding(2, 'name'),
  );
  const [, setTrader2Period] = useRiveString(
    riveRef,
    riveTraderBinding(2, 'period'),
  );
  const [, setTrader2ProfitAmount] = useRiveString(
    riveRef,
    riveTraderBinding(2, 'profitAmount'),
  );
  const [, setTrader2ProfitPercent] = useRiveString(
    riveRef,
    riveTraderBinding(2, 'profitPercent'),
  );

  const [, setTrader3Name] = useRiveString(
    riveRef,
    riveTraderBinding(3, 'name'),
  );
  const [, setTrader3Period] = useRiveString(
    riveRef,
    riveTraderBinding(3, 'period'),
  );
  const [, setTrader3ProfitAmount] = useRiveString(
    riveRef,
    riveTraderBinding(3, 'profitAmount'),
  );
  const [, setTrader3ProfitPercent] = useRiveString(
    riveRef,
    riveTraderBinding(3, 'profitPercent'),
  );

  const [, setTransitionSpeed] = useRiveNumber(
    riveRef,
    RIVE_NUMBER_BINDINGS.TRANSITION_SPEED,
  );
  const [, setCoinSeq] = useRiveNumber(riveRef, RIVE_NUMBER_BINDINGS.COIN_SEQ);
  const [, setCardSeq] = useRiveNumber(riveRef, RIVE_NUMBER_BINDINGS.CARD_SEQ);

  // Push static config + localized copy once the Rive runtime is ready.
  useEffect(() => {
    if (!riveRef) return;

    setTransitionSpeed(RIVE_TRANSITION_SPEED);
    setCoinSeq(0);
    setCardSeq(0);

    // Slot 1: "Trade like a pro".
    setStep1Title(strings('social_leaderboard.onboarding.slide_trade.title'));
    setStep1Content(
      strings('social_leaderboard.onboarding.slide_trade.description'),
    );
    setStep1Primary(strings('social_leaderboard.onboarding.next'));
    setStep1Secondary('');

    // Slot 2: "Never miss a move".
    setStep2Title(strings('social_leaderboard.onboarding.slide_notify.title'));
    setStep2Content(
      strings('social_leaderboard.onboarding.slide_notify.description_default'),
    );
    setStep2Primary(
      strings('social_leaderboard.onboarding.allow_notifications'),
    );
    setStep2Secondary(strings('social_leaderboard.onboarding.got_it'));

    // Slot 3: "Follow the best".
    setStep3Title(strings('social_leaderboard.onboarding.slide_follow.title'));
    setStep3Content(
      strings('social_leaderboard.onboarding.slide_follow.description'),
    );
    setStep3Primary(strings('social_leaderboard.onboarding.follow_top_three'));
    setStep3Secondary(strings('social_leaderboard.onboarding.maybe_later'));
  }, [
    riveRef,
    setTransitionSpeed,
    setCoinSeq,
    setCardSeq,
    setStep1Title,
    setStep1Content,
    setStep1Primary,
    setStep1Secondary,
    setStep2Title,
    setStep2Content,
    setStep2Primary,
    setStep2Secondary,
    setStep3Title,
    setStep3Content,
    setStep3Primary,
    setStep3Secondary,
  ]);

  // Push live top-trader data into the Rive cards whenever it loads/changes.
  useEffect(() => {
    if (!riveRef) return;

    const [trader1, trader2, trader3] = topTraders;

    if (trader1) {
      setTrader1Name(trader1.username);
      setTrader1Period(RIVE_TRADER_PERIOD);
      setTrader1ProfitAmount(formatSignedAbbreviatedUsd(trader1.pnlValue));
      setTrader1ProfitPercent(
        formatPercent(trader1.percentageChange, { decimals: 1 }),
      );
    }
    if (trader2) {
      setTrader2Name(trader2.username);
      setTrader2Period(RIVE_TRADER_PERIOD);
      setTrader2ProfitAmount(formatSignedAbbreviatedUsd(trader2.pnlValue));
      setTrader2ProfitPercent(
        formatPercent(trader2.percentageChange, { decimals: 1 }),
      );
    }
    if (trader3) {
      setTrader3Name(trader3.username);
      setTrader3Period(RIVE_TRADER_PERIOD);
      setTrader3ProfitAmount(formatSignedAbbreviatedUsd(trader3.pnlValue));
      setTrader3ProfitPercent(
        formatPercent(trader3.percentageChange, { decimals: 1 }),
      );
    }
  }, [
    riveRef,
    topTraders,
    setTrader1Name,
    setTrader1Period,
    setTrader1ProfitAmount,
    setTrader1ProfitPercent,
    setTrader2Name,
    setTrader2Period,
    setTrader2ProfitAmount,
    setTrader2ProfitPercent,
    setTrader3Name,
    setTrader3Period,
    setTrader3ProfitAmount,
    setTrader3ProfitPercent,
  ]);

  const trackScreenViewed = useCallback(
    (slotIndex: number) => {
      currentSlotRef.current = slotIndex;
      track(MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_SCREEN_VIEWED, {
        [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
        [SocialLeaderboardEventProperties.SCREEN]: RIVE_STEP_SLOTS[slotIndex],
      });
    },
    [track],
  );

  // Track the first (Trade) slide on mount.
  useEffect(() => {
    trackScreenViewed(0);
  }, [trackScreenViewed]);

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
        RIVE_STEP_SLOTS[currentSlotRef.current],
    });
    navigation.goBack();
  }, [navigation, track]);

  // Trade -> Notify.
  const handleNext = useCallback(() => {
    trackScreenViewed(1);
  }, [trackScreenViewed]);

  // Notify -> Follow, enabling notifications first.
  const handleAllowNotifications = useCallback(async () => {
    if (shouldPromptNotifications) {
      const granted = await requestPushPermission();
      enableNotificationsInBackground(granted);
      track(
        MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_NOTIFICATIONS_ENABLED,
        {
          [SocialLeaderboardEventProperties.SOURCE]: ONBOARDING_SOURCE,
        },
      );
    }
    trackScreenViewed(2);
  }, [
    shouldPromptNotifications,
    requestPushPermission,
    enableNotificationsInBackground,
    track,
    trackScreenViewed,
  ]);

  // Notify -> Follow, skipping notifications.
  const handleGotIt = useCallback(() => {
    trackScreenViewed(2);
  }, [trackScreenViewed]);

  // Follow step (terminal): follow the not-yet-followed top traders, then exit.
  const handleFollowTopThree = useCallback(async () => {
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
    goToLeaderboard();
  }, [topTraders, toggleFollow, goToLeaderboard]);

  // Follow step (terminal): skip following and exit.
  const handleMaybeLater = useCallback(() => {
    goToLeaderboard();
  }, [goToLeaderboard]);

  useRiveTrigger(riveRef, RIVE_TRIGGERS.CLOSE, handleClose);
  useRiveTrigger(riveRef, RIVE_TRIGGERS.NEXT, handleNext);
  useRiveTrigger(
    riveRef,
    RIVE_TRIGGERS.ALLOW_NOTIFICATIONS,
    handleAllowNotifications,
  );
  useRiveTrigger(riveRef, RIVE_TRIGGERS.GOT_IT, handleGotIt);
  useRiveTrigger(
    riveRef,
    RIVE_TRIGGERS.FOLLOW_TOP_TRADERS,
    handleFollowTopThree,
  );
  useRiveTrigger(riveRef, RIVE_TRIGGERS.MAYBE_LATER, handleMaybeLater);

  // Rive owns navigation; we only track the current slot for DISMISSED accuracy.
  // Until the motion team confirms the authored state names (`RIVE_STATE_TO_STEP_INDEX`),
  // unmapped states are logged in dev so they can be filled in. Per-step
  // analytics and completion are driven by the trigger callbacks above.
  const handleStateChanged = useCallback(
    (_stateMachineName: string, stateName: string) => {
      const stepIndex = RIVE_STATE_TO_STEP_INDEX[stateName];
      if (stepIndex !== undefined) {
        currentSlotRef.current = stepIndex;
        return;
      }
      if (__DEV__) {
        Logger.log(
          `SocialLeaderboardOnboarding: unmapped Rive state "${stateName}"`,
        );
      }
    },
    [],
  );

  const handleError = useCallback(
    (riveError: RNRiveError) => {
      Logger.error(
        new Error(
          `SocialLeaderboardOnboarding: Rive error: ${riveError.message} - ${riveError.type}`,
        ),
      );
      if (hasCompletedRef.current) {
        return;
      }
      hasCompletedRef.current = true;
      void markOnboardingSeen();
      exitToLeaderboard();
    },
    [exitToLeaderboard],
  );

  return (
    <View
      style={styles.container}
      testID={SocialLeaderboardOnboardingSelectorsIDs.CONTAINER}
    >
      <Rive
        ref={ref}
        source={SocialLeaderboardNuxAnimation}
        artboardName={RIVE_ARTBOARD_NAME}
        stateMachineName={RIVE_STATE_MACHINE_NAME}
        dataBinding={AutoBind(true)}
        // The artboard is authored at a fixed phone aspect ratio with baked text
        // runs, so it is rendered as-designed (uniform scale, edge-to-edge).
        // `Fit.Layout` reflows at the wrong density and overflows the text runs,
        // so `Fit.Cover` is used (matching the motion team's reference). No
        // `layoutScaleFactor` — that only applies to `Fit.Layout`.
        fit={Fit.Cover}
        alignment={Alignment.Center}
        onStateChanged={handleStateChanged}
        onError={handleError}
        style={StyleSheet.absoluteFillObject}
        testID={SocialLeaderboardOnboardingSelectorsIDs.RIVE_ANIMATION}
      />
    </View>
  );
};

export default SocialLeaderboardOnboarding;
