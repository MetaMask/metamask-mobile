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
import { selectCardArrivalAnimationEnabledFlag } from '../../../../../../selectors/featureFlagController/card';
import { selectMoneyCardTiltAnimationEnabledFlag } from '../../../../Money/selectors/featureFlags';
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

const CARD_ARRIVAL_FADE_EASING = Easing.out(Easing.cubic);

interface UseCardArrivalAnimationParams {
  fromCardOnboarding: boolean;
  cardType: CardType | undefined;
  isRevealingCardDetails: boolean;
}

/**
 * Plays the card's arrival reveal on the card dashboard. The reveal is authored
 * in the Rive asset and fired by its `startAnimation` trigger; all this drives
 * is withholding the card until it can start.
 */
export const useCardArrivalAnimation = ({
  fromCardOnboarding,
  cardType,
  isRevealingCardDetails,
}: UseCardArrivalAnimationParams) => {
  const dispatch = useDispatch();
  const arrivalFlagEnabled = useSelector(selectCardArrivalAnimationEnabledFlag);
  // The reveal lives inside the tilt asset, which only renders as Rive while
  // its own kill-switch is on — otherwise we fade in the static card and still
  // burn the one-shot.
  const tiltFlagEnabled = useSelector(selectMoneyCardTiltAnimationEnabledFlag);
  const canPlayReveal = arrivalFlagEnabled && tiltFlagEnabled;
  const alreadySeen = useSelector(selectCardArrivalAnimationSeen);
  const previewRequested = useSelector(selectCardArrivalPreviewRequested);
  const reduceMotion = useReduceMotionState();

  const [pendingTimedOut, setPendingTimedOut] = useState(false);
  const [hasStartedReveal, setHasStartedReveal] = useState(false);
  // Bumped per sequence to remount the Rive view — its trigger fires once only.
  const [revealKey, setRevealKey] = useState(0);
  // A ref, not state: the details toggle already re-renders, and an extra pass
  // would swap the live Rive view's `stateMachineName` mid-reveal.
  const revealConsumed = useRef(false);

  const resolved: CardArrivalDecision = resolveCardArrivalDecision({
    flagEnabled: canPlayReveal,
    alreadySeen,
    fromCardOnboarding: fromCardOnboarding || previewRequested,
    cardType,
    reduceMotion,
  });

  // Permanent for this sequence: once the bound is hit the settled card is on
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

    setHasStartedReveal(true);
    revealConsumed.current = false;
    setRevealKey((key) => key + 1);
    // Seed explicitly: the initial argument applies on first render only, and a
    // replay is commonly requested on an already-mounted dashboard.
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
    /** Yields to the static card once the user asks for their details. */
    usesRiveCard: hasStartedReveal && !isRevealingCardDetails,
    /** False once consumed, so a remount renders settled instead of replaying. */
    playReveal: hasStartedReveal && !revealConsumed.current,
    revealKey,
    revealDelayMs: CARD_ARRIVAL_START_DELAY_MS,
    cardStyle,
  };
};
