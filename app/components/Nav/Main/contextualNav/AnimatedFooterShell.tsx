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
import {
  TAB_BAR_FLOATING_GAP,
  TAB_BAR_FLOATING_HEIGHT,
} from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import { footerAnimator, type FooterMotion } from './footerMotion';

/** Home stays inside the pill, as the first tab. Used by the default footer. */
export type FooterHomePlacement = 'pill-start' | 'circle-end';

export interface AnimatedFooterShellProps {
  /** Changes when the footer set changes. Selecting a tab in the same set does not. */
  transitionId: string;
  /**
   * `pill-start` keeps Home as the first tab. `circle-end` renders `home`
   * outside the pill, on the right. Defaults to `pill-start`.
   */
  homePlacement?: FooterHomePlacement;
  /** Home tab, or the round Home button when `homePlacement` is `circle-end`. */
  home: React.ReactNode;
  /** Tabs that share the pill with Home, or the whole pill when Home is outside. */
  rest: React.ReactNode;
  /** Tests opt in. Production always runs the motion. */
  runMotion?: boolean;
}

/** Width of the Home tab on the default footer. The morph collapses toward this. */
const HOME_SLOT_WIDTH = 76;
/** `p-1` on the pill, both sides, so a collapsed default pill still shows Home. */
const PILL_HORIZONTAL_PADDING = 8;
const COLLAPSE_WIDTH = HOME_SLOT_WIDTH + PILL_HORIZONTAL_PADDING;
/** Circle diameter plus the gap before it. Section pills give up this much width. */
const CIRCLE_BLOCK = TAB_BAR_FLOATING_HEIGHT + TAB_BAR_FLOATING_GAP;

const PILL_STYLE: ViewStyle = { height: TAB_BAR_FLOATING_HEIGHT };
const CLIP_BASE: ViewStyle = { overflow: 'hidden' };
const HOME_SLOT: ViewStyle = { width: HOME_SLOT_WIDTH };
const REST_ROW: ViewStyle = { flex: 1, flexDirection: 'row' };
const FRAME: ViewStyle = { width: '100%' };
const ROW: ViewStyle = { flexDirection: 'row', alignItems: 'center' };
const PILL_SLOT: ViewStyle = {
  flex: 1,
  flexDirection: 'row',
  overflow: 'hidden',
};
const SECTION_GAP: ViewStyle = { gap: TAB_BAR_FLOATING_GAP };

const pillWidthFor = (
  placement: FooterHomePlacement,
  frame: number,
): number => {
  if (frame <= 0) {
    return 0;
  }
  if (placement === 'circle-end') {
    return Math.max(frame - CIRCLE_BLOCK, 0);
  }
  return frame;
};

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
 * Pill that collapses, swaps its tabs, then expands. The default footer
 * anchors that collapse on the left Home tab. A section footer anchors it
 * on the right, toward the Home circle, which stays outside the clip.
 */
const AnimatedFooterShell = ({
  transitionId,
  homePlacement = 'pill-start',
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
  const [shownPlacement, setShownPlacement] = useState(homePlacement);
  const [anchorEnd, setAnchorEnd] = useState(homePlacement === 'circle-end');
  const [fullWidth, setFullWidth] = useState(0);
  const restSnapshot = useRef(rest);
  const homeSnapshot = useRef(home);
  const transitionRef = useRef(transitionId);
  const placementRef = useRef(homePlacement);
  const motionRef = useRef<FooterMotion>(motion);
  const fullWidthRef = useRef(0);
  const phase = useRef<'idle' | 'running'>('idle');
  const clipWidth = useSharedValue(0);
  const restOpacity = useSharedValue(1);
  const restTranslateX = useSharedValue(0);
  const swapClock = useSharedValue(0);

  transitionRef.current = transitionId;
  placementRef.current = homePlacement;
  motionRef.current = motion;
  if (shownId === transitionId && phase.current === 'idle') {
    restSnapshot.current = rest;
    homeSnapshot.current = home;
  }

  const revealNext = useCallback(() => {
    setShownId(transitionRef.current);
    setShownPlacement(placementRef.current);
    phase.current = 'idle';
    if (motionRef.current === 'crossfade') {
      restOpacity.value = 1;
    }
  }, [restOpacity]);

  useEffect(() => {
    const destination = placementRef.current;
    if (transitionId === shownId) {
      return;
    }
    setAnchorEnd(destination === 'circle-end');
    if (!runMotion || fullWidthRef.current <= 0) {
      setShownId(transitionId);
      setShownPlacement(destination);
      return;
    }
    phase.current = 'running';
    const expandWidth = pillWidthFor(destination, fullWidthRef.current);
    const collapseWidth = Math.min(
      COLLAPSE_WIDTH,
      expandWidth > 0 ? expandWidth : COLLAPSE_WIDTH,
    );
    footerAnimator.animate(
      clipWidth,
      restOpacity,
      restTranslateX,
      swapClock,
      expandWidth,
      collapseWidth,
      motionRef.current,
      revealNext,
    );
  }, [
    clipWidth,
    homePlacement,
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
      clipWidth.value = pillWidthFor(placementRef.current, width);
    }
  };

  const clipStyle = useAnimatedStyle(() => ({
    width: clipWidth.value > 0 ? clipWidth.value : undefined,
  }));
  const restStyle = useAnimatedStyle(() => ({
    opacity: restOpacity.value,
    transform: [{ translateX: restTranslateX.value }],
  }));

  const visibleRest = shownId === transitionId ? rest : restSnapshot.current;
  const visibleHome = shownId === transitionId ? home : homeSnapshot.current;
  const visiblePlacement =
    shownId === transitionId ? homePlacement : shownPlacement;
  const innerWidth = pillWidthFor(visiblePlacement, fullWidth);
  const innerStyle = useMemo(
    (): ViewStyle => ({ width: innerWidth > 0 ? innerWidth : '100%' }),
    [innerWidth],
  );
  const slotStyle = useMemo(
    (): ViewStyle => ({
      ...PILL_SLOT,
      justifyContent: anchorEnd ? 'flex-end' : 'flex-start',
    }),
    [anchorEnd],
  );
  const contentAlign = useMemo(
    (): ViewStyle => ({
      flexDirection: 'row',
      justifyContent: anchorEnd ? 'flex-end' : 'flex-start',
    }),
    [anchorEnd],
  );

  return (
    <View
      onLayout={onFrameLayout}
      testID={`footer-set-${shownId}`}
      style={[
        FRAME,
        ROW,
        visiblePlacement === 'circle-end' ? SECTION_GAP : null,
      ]}
    >
      <View style={slotStyle}>
        <Animated.View style={[CLIP_BASE, contentAlign, clipStyle]}>
          <View style={innerStyle}>
            <TabBarFloatingSurface
              isBlurAvailable={isBlurAvailable}
              colorScheme={colorScheme}
              twClassName="flex-row items-center rounded-full p-1"
              style={PILL_STYLE}
              testID="footer-pill-surface"
            >
              {visiblePlacement === 'pill-start' ? (
                <View style={HOME_SLOT}>{visibleHome}</View>
              ) : null}
              <Animated.View style={[REST_ROW, restStyle]}>
                {visibleRest}
              </Animated.View>
            </TabBarFloatingSurface>
          </View>
        </Animated.View>
      </View>
      {visiblePlacement === 'circle-end' ? visibleHome : null}
    </View>
  );
};

export default AnimatedFooterShell;
