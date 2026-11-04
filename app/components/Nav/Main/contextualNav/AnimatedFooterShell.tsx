import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import {
  FOOTER_COLLAPSE_MS,
  FOOTER_CROSSFADE_MS,
  FOOTER_EXPAND_MS,
  getFooterMotion,
  type FooterMotion,
} from './footerMotion';

export interface AnimatedFooterShellProps {
  /** Changes only when the tab set changes, not when the selected item does. */
  setId: string;
  children: React.ReactNode;
}

const EASE_OUT = Easing.out(Easing.cubic);
const COLLAPSED_SCALE = 0.12;

const SHELL_STYLE: ViewStyle = {
  width: '100%',
  transformOrigin: 'left center',
};

/**
 * One pill for every footer set. Outgoing items fade while the pill shrinks
 * toward its left edge, then the incoming set fades in as it expands right.
 * Reduce Motion and LOW hardware on a known network crossfade instead.
 */
const AnimatedFooterShell = ({ setId, children }: AnimatedFooterShellProps) => {
  const hardware = getHardwareTier();
  const network = useNetworkTier();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const motion = getFooterMotion(hardware, network, reduceMotion);
  const [shownId, setShownId] = useState(setId);
  const snapshot = useRef(children);
  const setIdRef = useRef(setId);
  const motionRef = useRef<FooterMotion>(motion);
  const phase = useRef<'idle' | 'collapsing' | 'expanding'>('idle');
  const scaleX = useSharedValue(1);
  const opacity = useSharedValue(1);
  const morphing = useSharedValue(motion === 'morph');

  setIdRef.current = setId;
  motionRef.current = motion;
  morphing.value = motion === 'morph';
  if (shownId === setId && phase.current === 'idle') {
    snapshot.current = children;
  }

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return undefined;
    }
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {
        if (mounted) {
          setReduceMotion(false);
        }
      });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setReduceMotion(enabled);
      },
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const finishExpand = () => {
    phase.current = 'idle';
    snapshot.current = children;
  };

  const beginExpand = () => {
    phase.current = 'expanding';
    const current = motionRef.current;
    const duration =
      current === 'morph' ? FOOTER_EXPAND_MS : FOOTER_CROSSFADE_MS;
    if (current === 'morph') {
      scaleX.value = COLLAPSED_SCALE;
      scaleX.value = withTiming(1, { duration, easing: EASE_OUT });
    } else {
      scaleX.value = 1;
    }
    opacity.value = 0;
    opacity.value = withTiming(
      1,
      { duration, easing: EASE_OUT },
      (finished) => {
        if (finished) {
          scheduleOnRN(finishExpand);
        }
      },
    );
  };

  const commitRef = useRef<() => void>(() => undefined);
  commitRef.current = () => {
    setShownId(setIdRef.current);
    beginExpand();
  };
  const notifyCollapsed = useCallback(() => {
    commitRef.current();
  }, []);

  useEffect(() => {
    if (setId === shownId || phase.current !== 'idle') {
      return;
    }
    if (process.env.NODE_ENV === 'test') {
      setShownId(setId);
      return;
    }
    phase.current = 'collapsing';
    const current = motionRef.current;
    const duration =
      current === 'morph' ? FOOTER_COLLAPSE_MS : FOOTER_CROSSFADE_MS;
    if (current === 'morph') {
      scaleX.value = withTiming(COLLAPSED_SCALE, {
        duration,
        easing: EASE_OUT,
      });
    }
    opacity.value = withTiming(
      0,
      { duration, easing: EASE_OUT },
      (finished) => {
        if (finished) {
          scheduleOnRN(notifyCollapsed);
        }
      },
    );
  }, [notifyCollapsed, opacity, scaleX, setId, shownId]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scaleX: morphing.value ? scaleX.value : 1 }],
  }));

  return (
    <Animated.View
      style={[SHELL_STYLE, pillStyle]}
      testID={`footer-set-${shownId}`}
    >
      {shownId === setId ? children : snapshot.current}
    </Animated.View>
  );
};

export default AnimatedFooterShell;
