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
import { selectMoneyCardArrivalAnimationEnabledFlag } from '../../../../Money/selectors/featureFlags';
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

/**
 * A timing curve rather than a spring: the fade must settle cleanly, with no
 * overshoot to fight the authored reveal.
 */
const CARD_ARRIVAL_FADE_EASING = Easing.out(Easing.cubic);

interface UseCardArrivalAnimationParams {
  /** True when the dashboard was reached by completing card onboarding. */
  fromCardOnboarding: boolean;
  /** The issued card's type, undefined while card data is still loading. */
  cardType: CardType | undefined;
}

/**
 * Plays the card's arrival reveal on the card dashboard.
 *
 * The dashboard renders normally throughout — only the card animates, in the
 * position it already occupies. The reveal itself is authored in the Rive
 * asset and fired by its `startAnimation` trigger; the only thing driven from
 * here is withholding the card until the reveal can actually start, so the
 * settled card never paints first.
 */
export const useCardArrivalAnimation = ({
  fromCardOnboarding,
  cardType,
}: UseCardArrivalAnimationParams) => {
  const dispatch = useDispatch();
  const flagEnabled = useSelector(selectMoneyCardArrivalAnimationEnabledFlag);
  const alreadySeen = useSelector(selectCardArrivalAnimationSeen);
  // Armed by the developer-options reset, which only clears state and does not
  // navigate, so the request has to survive until the dashboard is next opened.
  const previewRequested = useSelector(selectCardArrivalPreviewRequested);
  const reduceMotion = useReduceMotionState();

  const [pendingTimedOut, setPendingTimedOut] = useState(false);
  // Sticky for the lifetime of the mount: the reveal is authored in the Rive
  // asset, so once it starts the card must keep rendering as Rive. Swapping
  // back to the static card mid-sequence would be a visible art change.
  const [usesRiveCard, setUsesRiveCard] = useState(false);
  // Bumped per sequence so the caller can remount the Rive view. Its reveal
  // trigger only fires once per native view, so a replay on an already-mounted
  // dashboard needs a fresh one.
  const [revealKey, setRevealKey] = useState(0);

  const resolved: CardArrivalDecision = resolveCardArrivalDecision({
    flagEnabled,
    alreadySeen,
    fromCardOnboarding: fromCardOnboarding || previewRequested,
    cardType,
    reduceMotion,
  });

  // `pending` withholds the card, so it must be bounded: card data can be slow
  // or never arrive, and the reduce-motion lookup is asynchronous.
  const decision: CardArrivalDecision =
    resolved === 'pending' && pendingTimedOut ? 'skip' : resolved;

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

  // Only act when the decision actually changes. The effect can otherwise be
  // re-invoked on identity churn, and bumping `revealKey` on every invocation
  // would re-render, re-invoke, and loop.
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
    setUsesRiveCard(true);
    setRevealKey((key) => key + 1);
    // Seed explicitly: the shared value's initial argument applies on the first
    // render only, and the dashboard is commonly already mounted when the
    // replay is requested. Fading from the settled value is a silent no-op.
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
          if (finished) {
            // Marked at the end rather than the start: marking it up front
            // flips the decision to `skip`, which would cancel this very fade.
            scheduleOnRN(markArrivalSeen);
          }
        },
      ),
    );
  }, [decision, markArrivalSeen, cardOpacity]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  return {
    /** True once the card must render as Rive so the authored reveal can play. */
    usesRiveCard,
    /** Changes per sequence; use as the Rive view's `key` so it remounts. */
    revealKey,
    /** Delay before the asset's reveal is triggered, matching the fade. */
    revealDelayMs: CARD_ARRIVAL_START_DELAY_MS,
    cardStyle,
  };
};
