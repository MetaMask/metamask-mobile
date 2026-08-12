import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  selectMoneyCardArrivalAnimationEnabledFlag,
  selectMoneyCardTiltAnimationEnabledFlag,
} from '../../../../Money/selectors/featureFlags';
import { useReduceMotionState } from '../../../../Money/hooks/useReduceMotion';
import {
  selectCardArrivalAnimationSeen,
  selectCardArrivalPreviewRequested,
  setCardArrivalAnimationSeen,
  setCardArrivalPreviewRequested,
} from '../../../../../../core/redux/slices/card';
import { CardType } from '../../../types';
import {
  resolveCardArrivalDecision,
  CARD_ARRIVAL_FADE_DURATION_MS,
  CARD_ARRIVAL_PENDING_TIMEOUT_MS,
  CARD_ARRIVAL_START_DELAY_MS,
  type CardArrivalDecision,
} from '../../../util/cardArrival';

/** Timing rather than spring: no overshoot to fight the authored reveal. */
const CARD_ARRIVAL_FADE_EASING = Easing.out(Easing.cubic);

interface UseCardArrivalAnimationParams {
  /** True when the dashboard was reached by completing card onboarding. */
  fromCardOnboarding: boolean;
  /** The issued card's type, undefined while card data is still loading. */
  cardType: CardType | undefined;
  /** True while the user is viewing their PAN/CVV/expiry. */
  isRevealingCardDetails: boolean;
}

/**
 * Plays the card's arrival reveal on the card dashboard. The reveal is authored
 * in the Rive asset and fired by its `startAnimation` trigger; all this drives
 * is withholding the card until it can start, so the settled card never paints
 * first.
 */
export const useCardArrivalAnimation = ({
  fromCardOnboarding,
  cardType,
  isRevealingCardDetails,
}: UseCardArrivalAnimationParams) => {
  const dispatch = useDispatch();
  const arrivalFlagEnabled = useSelector(
    selectMoneyCardArrivalAnimationEnabledFlag,
  );
  // The reveal lives inside the tilt asset, which only renders as Rive while
  // its own kill-switch is on — otherwise we would fade in the static card and
  // still burn the one-shot.
  const tiltFlagEnabled = useSelector(selectMoneyCardTiltAnimationEnabledFlag);
  const canPlayReveal = arrivalFlagEnabled && tiltFlagEnabled;
  const alreadySeen = useSelector(selectCardArrivalAnimationSeen);
  // Armed by the developer-options reset, which does not navigate, so it has to
  // survive until the dashboard is next opened.
  const previewRequested = useSelector(selectCardArrivalPreviewRequested);
  const reduceMotion = useReduceMotionState();

  const [pendingTimedOut, setPendingTimedOut] = useState(false);
  // Sticky: swapping back mid-sequence would be a visible art change.
  const [hasStartedReveal, setHasStartedReveal] = useState(false);
  // Bumped per sequence to remount the Rive view — its trigger fires once only.
  const [revealKey, setRevealKey] = useState(0);
  // Viewing card details unmounts the Rive view; without this, closing them
  // would remount it and fire `startAnimation` again, replaying the one-shot on
  // the same visit. Tracked on unmount rather than on completion so the prop
  // never flips while the Rive view is live — that would swap its
  // `stateMachineName` mid-reveal. A ref, not state: toggling the details also
  // re-renders, so the read below is already fresh without a second pass.
  const revealConsumed = useRef(false);

  const resolved: CardArrivalDecision = resolveCardArrivalDecision({
    flagEnabled: canPlayReveal,
    alreadySeen,
    fromCardOnboarding: fromCardOnboarding || previewRequested,
    cardType,
    reduceMotion,
  });

  // `pending` withholds the card, so it must be bounded: card data can be slow
  // or never arrive, and the reduce-motion lookup is asynchronous. The skip is
  // permanent for this sequence — once the bound is hit the settled card is on
  // screen, and a late `animate` would hide a card the user has already seen.
  const decision: CardArrivalDecision = pendingTimedOut ? 'skip' : resolved;

  useEffect(() => {
    if (isRevealingCardDetails) revealConsumed.current = true;
  }, [isRevealingCardDetails]);

  useEffect(() => {
    if (resolved !== 'pending') return undefined;
    const timeout = setTimeout(
      () => setPendingTimedOut(true),
      CARD_ARRIVAL_PENDING_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [resolved]);

  const cardOpacity = useSharedValue(decision === 'skip' ? 1 : 0);

  const markArrivalSeen = useCallback(() => {
    dispatch(setCardArrivalAnimationSeen(true));
    dispatch(setCardArrivalPreviewRequested(false));
  }, [dispatch]);

  // Only act on a real change: bumping `revealKey` on identity churn would
  // re-render, re-invoke, and loop.
  const lastDecision = useRef<CardArrivalDecision | null>(null);

  useEffect(() => {
    if (decision === 'pending' || lastDecision.current === decision) return;
    lastDecision.current = decision;

    if (decision === 'skip') {
      cardOpacity.value = 1;
      return;
    }

    // Mount Rive immediately so the file parses during the delay, but hold the
    // card hidden: the trigger is what waits, not the load.
    setHasStartedReveal(true);
    revealConsumed.current = false;
    setRevealKey((key) => key + 1);
    // Seed explicitly: the initial argument applies on first render only, and
    // a replay is commonly requested on an already-mounted dashboard.
    cardOpacity.value = 0;
    cardOpacity.value = withDelay(
      CARD_ARRIVAL_START_DELAY_MS,
      withTiming(
        1,
        {
          duration: CARD_ARRIVAL_FADE_DURATION_MS,
          easing: CARD_ARRIVAL_FADE_EASING,
        },
        (finished) => {
          'worklet';
          // Marked at the end, not the start: marking up front flips the
          // decision to `skip`, cancelling this very fade.
          if (finished) scheduleOnRN(markArrivalSeen);
        },
      ),
    );
  }, [decision, markArrivalSeen, cardOpacity]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  return {
    /**
     * True while the card must render as Rive. Yields once the user asks for
     * their details, which the Rive card has no surface for.
     */
    usesRiveCard: hasStartedReveal && !isRevealingCardDetails,
    /**
     * Whether the mounting Rive view should fire its reveal trigger. False once
     * the sequence's reveal has been consumed, so remounting the card after the
     * user closes their details renders it settled instead of replaying.
     */
    playReveal: hasStartedReveal && !revealConsumed.current,
    /** Changes per sequence; use as the Rive view's `key` so it remounts. */
    revealKey,
    revealDelayMs: CARD_ARRIVAL_START_DELAY_MS,
    cardStyle,
  };
};
