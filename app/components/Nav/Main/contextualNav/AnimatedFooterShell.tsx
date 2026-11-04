import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import TabBarFloatingSurface from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingSurface';
import { useBlurMaterial } from '../../../../component-library/hooks/useBlurMaterial';
import { TAB_BAR_FLOATING_HEIGHT } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import { footerAnimator, type FooterMotion } from './footerMotion';

export interface AnimatedFooterShellProps {
  /** Changes when the footer set changes. Selecting Swap, Perps, or Predictions does not. */
  transitionId: string;
  /** Home stays mounted here so it never joins the shrink. */
  home: React.ReactNode;
  /** Every tab except Home. These fade and slide a few pixels. */
  rest: React.ReactNode;
  /** Tests opt in. Production always runs the motion. */
  runMotion?: boolean;
}

/** Same Home slot in every footer, so the pill always collapses to this width. */
const HOME_SLOT_WIDTH = 76;
/** `p-1` on the pill, both sides. The clip includes it so Home stays fully visible. */
const PILL_HORIZONTAL_PADDING = 8;

const PILL_STYLE: ViewStyle = { height: TAB_BAR_FLOATING_HEIGHT };
const CLIP_BASE: ViewStyle = { overflow: 'hidden', alignSelf: 'flex-start' };
const HOME_SLOT: ViewStyle = { width: HOME_SLOT_WIDTH };
const REST_ROW: ViewStyle = { flex: 1, flexDirection: 'row' };

/**
 * Reduce Motion selects the crossfade. Tests skip the listener so they do
 * not schedule a state update outside `act`. Unknown stays `null`, which
 * keeps the morph.
 */
const useReduceMotion = (): boolean | null => {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

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
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
};

/**
 * Pill that collapses to the Home tab, then expands to the right. Home keeps
 * its place, size, icon, and label. Width is one sequenced motion.
 */
const AnimatedFooterShell = ({
  transitionId,
  home,
  rest,
  runMotion = process.env.NODE_ENV !== 'test',
}: AnimatedFooterShellProps) => {
  const hardware = getHardwareTier();
  const network = useNetworkTier();
  const reduceMotion = useReduceMotion();
  const { isBlurAvailable, colorScheme } = useBlurMaterial();
  const motion = footerAnimator.getMotion(hardware, network, reduceMotion);
  const [shownId, setShownId] = useState(transitionId);
  const [fullWidth, setFullWidth] = useState(0);
  const restSnapshot = useRef(rest);
  const transitionRef = useRef(transitionId);
  const motionRef = useRef<FooterMotion>(motion);
  const fullWidthRef = useRef(0);
  const phase = useRef<'idle' | 'running'>('idle');
  const clipWidth = useSharedValue(0);
  const restOpacity = useSharedValue(1);
  const restTranslateX = useSharedValue(0);
  const swapClock = useSharedValue(0);

  transitionRef.current = transitionId;
  motionRef.current = motion;
  if (shownId === transitionId && phase.current === 'idle') {
    restSnapshot.current = rest;
  }

  const revealNext = useCallback(() => {
    setShownId(transitionRef.current);
    phase.current = 'idle';
    if (motionRef.current === 'crossfade') {
      restOpacity.value = 1;
    }
  }, [restOpacity]);

  useEffect(() => {
    if (transitionId === shownId) {
      return;
    }
    if (!runMotion || fullWidthRef.current <= 0) {
      setShownId(transitionId);
      return;
    }
    phase.current = 'running';
    footerAnimator.animate(
      clipWidth,
      restOpacity,
      restTranslateX,
      swapClock,
      fullWidthRef.current,
      HOME_SLOT_WIDTH + PILL_HORIZONTAL_PADDING,
      motionRef.current,
      revealNext,
    );
  }, [
    clipWidth,
    restOpacity,
    restTranslateX,
    revealNext,
    runMotion,
    shownId,
    swapClock,
    transitionId,
  ]);

  const onFrameLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width <= 0 || width === fullWidthRef.current) {
      return;
    }
    fullWidthRef.current = width;
    setFullWidth(width);
    if (phase.current === 'idle') {
      clipWidth.value = width;
    }
  };

  const clipStyle = useAnimatedStyle(() => ({
    width: clipWidth.value > 0 ? clipWidth.value : undefined,
  }));
  const restStyle = useAnimatedStyle(() => ({
    opacity: restOpacity.value,
    transform: [{ translateX: restTranslateX.value }],
  }));
  const innerStyle = useMemo(
    (): ViewStyle => ({ width: fullWidth > 0 ? fullWidth : '100%' }),
    [fullWidth],
  );

  const visibleRest = shownId === transitionId ? rest : restSnapshot.current;

  return (
    <View onLayout={onFrameLayout} testID={`footer-set-${shownId}`}>
      <Animated.View style={[CLIP_BASE, clipStyle]}>
        <View style={innerStyle}>
          <TabBarFloatingSurface
            isBlurAvailable={isBlurAvailable}
            colorScheme={colorScheme}
            twClassName="flex-row items-center rounded-full p-1"
            style={PILL_STYLE}
            testID="footer-pill-surface"
          >
            <View style={HOME_SLOT}>{home}</View>
            <Animated.View style={[REST_ROW, restStyle]}>
              {visibleRest}
            </Animated.View>
          </TabBarFloatingSurface>
        </View>
      </Animated.View>
    </View>
  );
};

export default AnimatedFooterShell;
