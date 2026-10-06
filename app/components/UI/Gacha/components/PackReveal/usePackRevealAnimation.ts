import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ImpactMoment, useHaptics } from '../../../../../util/haptics';
import {
  CUT_COMPLETION,
  CUT_STEPS,
  MAX_IMPACT_LATENCY,
  MIN_IMPACT_INTERVAL,
  REVEAL_DURATION,
  REVEAL_PROFILES,
} from './PackReveal.constants';
import { PackRevealSelectorsIDs } from './PackReveal.testIds';
import type { PackRevealProps } from './PackReveal.types';

/** The seal and choreography run on the UI thread; React changes phase only twice. */
export const usePackRevealAnimation = ({
  isActive,
  isReady = true,
  rarity,
  onRevealed,
  sealWidth,
}: Pick<PackRevealProps, 'isActive' | 'isReady' | 'rarity' | 'onRevealed'> & {
  sealWidth: number;
}) => {
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'revealed'>(
    'sealed',
  );
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  const [reduceMotion, setReduceMotion] = useState(true);
  const mounted = useRef(true);
  const completed = useRef(false);
  const started = useRef(false);
  const lastCutImpact = useRef(0);
  const lastRevealImpact = useRef(0);
  const deliveredBeat = useRef(0);
  const { playImpact } = useHaptics();
  const profile = REVEAL_PROFILES[rarity ?? 'common'];
  const enabled = Boolean(isActive && foreground);
  const canPlayImpact = useRef(false);
  const progress = useSharedValue(0);
  const cut = useSharedValue(0);
  const idle = useSharedValue(0);
  const cutAccepted = useSharedValue(false);
  const cutCommitted = useSharedValue(false);
  const cutTick = useSharedValue(0);

  useEffect(() => {
    canPlayImpact.current = enabled && !reduceMotion;
    return () => {
      canPlayImpact.current = false;
    };
  }, [enabled, reduceMotion]);

  useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted.current) setReduceMotion(value);
      })
      .catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    const app = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => {
      mounted.current = false;
      motion.remove();
      app.remove();
    };
  }, []);

  const finish = useCallback(() => {
    if (!mounted.current || completed.current) return;
    completed.current = true;
    setPhase('revealed');
    onRevealed();
  }, [onRevealed]);

  const reveal = useCallback(() => {
    if (!enabled || !isReady || started.current) return;
    started.current = true;
    cutCommitted.value = true;
    cut.value = 1;
    setPhase('opening');
    if (!reduceMotion) void playImpact(ImpactMoment.GachaOpen);
  }, [enabled, isReady, cutCommitted, cut, reduceMotion, playImpact]);

  const cutImpact = useCallback(
    (scheduledAt: number) => {
      const now = Date.now();
      if (
        !mounted.current ||
        !canPlayImpact.current ||
        started.current ||
        now - scheduledAt > MAX_IMPACT_LATENCY ||
        now - lastCutImpact.current < MIN_IMPACT_INTERVAL
      )
        return;
      lastCutImpact.current = now;
      void playImpact(ImpactMoment.GachaCut);
    },
    [playImpact],
  );

  const revealImpact = useCallback(
    (beat: number, scheduledAt: number) => {
      const now = Date.now();
      if (
        !mounted.current ||
        !canPlayImpact.current ||
        completed.current ||
        beat <= deliveredBeat.current
      )
        return;
      deliveredBeat.current = beat;
      // Late native calls feel disconnected. Skip missed beats instead of replaying a backlog.
      if (
        now - scheduledAt > MAX_IMPACT_LATENCY ||
        now - lastRevealImpact.current < MIN_IMPACT_INTERVAL
      )
        return;
      lastRevealImpact.current = now;
      void playImpact(profile.impact);
    },
    [playImpact, profile.impact],
  );

  useAnimatedReaction(
    () => {
      const elapsed = progress.value * REVEAL_DURATION;
      let beat = 0;
      for (const offset of profile.crackle) {
        if (elapsed < offset) break;
        beat++;
      }
      return beat;
    },
    (beat, previous) => {
      if (beat > 0 && beat !== previous) {
        scheduleOnRN(revealImpact, beat, Date.now());
      }
    },
  );

  useEffect(() => {
    if (enabled && !reduceMotion && phase === 'sealed') {
      idle.value = withRepeat(
        withTiming(1, { duration: 3800, easing: Easing.linear }),
        -1,
      );
    } else {
      idle.value = 0;
    }
    return () => cancelAnimation(idle);
  }, [enabled, reduceMotion, phase, idle]);

  useEffect(() => {
    if (enabled && phase === 'opening') {
      if (reduceMotion) {
        progress.value = 1;
        finish();
      } else {
        progress.value = withTiming(
          1,
          {
            duration: REVEAL_DURATION * (1 - progress.value),
            easing: Easing.linear,
          },
          (finished) => {
            if (finished) scheduleOnRN(finish);
          },
        );
      }
    }
    return () => cancelAnimation(progress);
  }, [enabled, phase, reduceMotion, progress, finish]);

  const cutGesture = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(PackRevealSelectorsIDs.CUT_GESTURE)
        .enabled(enabled && isReady && phase === 'sealed' && sealWidth > 0)
        .minDistance(2)
        .maxPointers(1)
        .onStart(({ x }) => {
          // Start on the left, or pick up the existing cut; a tap near the end cannot open it.
          cutAccepted.value = x / sealWidth <= cut.value + 0.18;
          if (cutAccepted.value) scheduleOnRN(cutImpact, Date.now());
        })
        .onUpdate(({ x }) => {
          if (!cutAccepted.value || cutCommitted.value) return;
          cut.value = Math.max(cut.value, Math.min(1, x / sealWidth));
          const tick = Math.floor(cut.value * CUT_STEPS);
          if (tick > cutTick.value) {
            cutTick.value = tick;
            scheduleOnRN(cutImpact, Date.now());
          }
          if (cut.value >= CUT_COMPLETION) {
            cutCommitted.value = true;
            scheduleOnRN(reveal);
          }
        })
        .onFinalize(() => {
          cutAccepted.value = false;
        }),
    [
      enabled,
      isReady,
      phase,
      sealWidth,
      cut,
      cutAccepted,
      cutCommitted,
      cutTick,
      cutImpact,
      reveal,
    ],
  );

  return {
    phase,
    profile,
    progress,
    cut,
    idle,
    cutGesture,
    reveal,
    enabled,
    reduceMotion,
  };
};
