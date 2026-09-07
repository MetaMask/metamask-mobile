import React, { useCallback, useState } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';

/*
 * Brand gradient for the Orange CTA, sampled from the key-visual design:
 * violet at the bottom-left running to orange at the top-right.
 *
 * Raw hex because these are new brand values not yet in
 * @metamask/design-tokens. Promote to tokens once the brand set settles.
 */
const GRADIENT_VIOLET =
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- spike only
  '#C66EF5';
const GRADIENT_ORANGE =
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- spike only
  '#FA4B00';

/**
 * Colour sequence for the moving layer. The band is twice the button's width
 * and reads violet -> orange -> violet, so sweeping it back and forth keeps
 * both brand colours continuously in play.
 */
const SWEEP_COLORS = [GRADIENT_VIOLET, GRADIENT_ORANGE, GRADIENT_VIOLET];

/** One traverse of the sweep. Longer reads as a slow morph, shorter as motion. */
const SWEEP_DURATION_MS = 4200;

/*
 * Fill alpha. Solid orange reads harsh against the dark page gradient; letting
 * the backdrop through knocks it back.
 *
 * It also does the accessibility work: composited over the near-black backdrop
 * at this alpha, white on the fill measures 5.61:1 at the violet end and
 * 6.32:1 at the orange — so lowering it is what makes the white label pass
 * WCAG AA, where the solid fill failed. Raising this back towards 1 breaks
 * that, so treat the two as linked.
 */
const FILL_OPACITY = 0.7;

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedSvgLinearGradient =
  Animated.createAnimatedComponent(SvgLinearGradient);

/*
 * Faint inner stroke around the whole perimeter.
 *
 * It is a continuous stroke painted with a gradient, not a dash travelling
 * around the outline. A moving segment reads as a progress indicator — the
 * visual language of loading — which is wrong on a buy button. Instead the
 * whole edge is always drawn, and the *bright part* of its gradient drifts
 * while the overall opacity breathes. The effect is the outline swelling and
 * fading rather than something circling it.
 */
const SHOW_STROKE = true;
const STROKE_WIDTH = 1;
/** Peak and trough of the breath. */
const STROKE_OPACITY_MAX = 0.6;
const STROKE_OPACITY_MIN = 0.18;
/** Base hairline, so the dim end of the gradient never fully disappears. */
const STROKE_BASE_OPACITY = 0.1;
/** Slow rotation of the gradient axis — the "morphing around". */
const STROKE_DRIFT_MS = 9000;
/** The breath itself. Deliberately out of step with the drift. */
const STROKE_BREATH_MS = 2800;
const STROKE_GRADIENT_ID = 'orangeCtaStroke';

/*
 * Occasional sheen sweeping across the face — the "polished surface catching
 * the light" cue. Deliberately rare: at this interval it reads as a highlight,
 * whereas a continuous sweep would just be more motion competing with the
 * fill gradient and the breathing stroke.
 */
const SHIMMER_INTERVAL_MS = 10000;
const SHIMMER_SWEEP_MS = 900;
const SHIMMER_OPACITY = 0.28;
/** Band width as a fraction of the button width. */
const SHIMMER_BAND_FRACTION = 0.28;
/** Tilt of the band, so it reads as a sheen rather than a wipe. */
const SHIMMER_ANGLE = '18deg';
const SHIMMER_COLORS = [
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- spike only
  'rgba(255,255,255,0)',
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- spike only
  'rgba(255,255,255,1)',
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- spike only
  'rgba(255,255,255,0)',
];

const TRANSPARENT = 'transparent';

const styles = StyleSheet.create({
  shimmerBand: {
    position: 'absolute',
    left: 0,
    opacity: SHIMMER_OPACITY,
  },
});

interface OrangeGradientButtonProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

/**
 * The Join Orange CTA: a design-system `Button` with its fill replaced by an
 * animated brand gradient.
 *
 * The gradient is a single oversized layer moved with `translateX` — a pure
 * transform, so it runs on the UI thread and never re-renders React. Animating
 * LinearGradient's `start`/`end` props instead would re-render every frame.
 *
 * The sweep reverses rather than looping in one direction: a one-way loop of a
 * finite band snaps visibly when it restarts, whereas reversing is seamless and
 * reads as a morph.
 *
 * The label is white and, at `FILL_OPACITY`, that clears WCAG AA.
 *
 * Against the solid gradient white failed badly — 3.02:1 at the violet end
 * against the 4.5:1 needed for normal text (a 16px label does not qualify as
 * large text, which needs 18pt/24px or 14pt/18.66px bold). Compositing the
 * fill at 70% over the near-black backdrop darkens it enough to reach 5.61:1
 * worst case. So the fill alpha and the white label are a pair: restoring a
 * solid fill would put the label back out of compliance.
 */
const OrangeGradientButton = ({
  label,
  onPress,
  testID,
}: OrangeGradientButtonProps) => {
  const reduceMotion = useReducedMotion();
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const sweep = useSharedValue(0);
  const drift = useSharedValue(0);
  const breath = useSharedValue(0);
  const shimmer = useSharedValue(0);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const next = event.nativeEvent.layout;
      setSize((current) =>
        current.width === next.width && current.height === next.height
          ? current
          : { width: next.width, height: next.height },
      );

      if (!next.width || reduceMotion) {
        return;
      }
      sweep.value = 0;
      sweep.value = withRepeat(
        withTiming(-next.width, {
          duration: SWEEP_DURATION_MS,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        // Reverse on each pass so the loop has no seam.
        true,
      );

      /*
       * Gradient axis rotates a full turn; seamless because 2*PI returns to
       * the starting orientation, so it needs no reversal.
       */
      drift.value = 0;
      drift.value = withRepeat(
        withTiming(1, { duration: STROKE_DRIFT_MS, easing: Easing.linear }),
        -1,
        false,
      );

      // Opacity eases in and out — this is what reads as breathing.
      breath.value = 0;
      breath.value = withRepeat(
        withTiming(1, {
          duration: STROKE_BREATH_MS,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      );

      /*
       * Sweep, then rest. The zero-duration reset at the end of the sequence
       * is what makes the repeat loop rather than ping-pong — a reversing
       * shimmer would visibly slide back across the button.
       */
      shimmer.value = 0;
      shimmer.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: SHIMMER_SWEEP_MS,
            easing: Easing.inOut(Easing.quad),
          }),
          withDelay(
            Math.max(0, SHIMMER_INTERVAL_MS - SHIMMER_SWEEP_MS),
            withTiming(0, { duration: 0 }),
          ),
        ),
        -1,
        false,
      );
    },
    [reduceMotion, sweep, drift, breath, shimmer],
  );

  // The stroke sits on its centreline, half a stroke-width inside the shape.
  const inset = STROKE_WIDTH / 2;
  const strokeHeight = Math.max(0, height - STROKE_WIDTH);
  const strokeWidthPx = Math.max(0, width - STROKE_WIDTH);

  /*
   * Rotate the gradient axis by expressing it as a unit vector through the
   * centre of the bounding box. Cheaper and smoother than animating a
   * `gradientTransform` string.
   */
  const gradientProps = useAnimatedProps(() => {
    const theta = drift.value * 2 * Math.PI;
    return {
      x1: 0.5 - 0.5 * Math.cos(theta),
      y1: 0.5 - 0.5 * Math.sin(theta),
      x2: 0.5 + 0.5 * Math.cos(theta),
      y2: 0.5 + 0.5 * Math.sin(theta),
    };
  });

  const breathProps = useAnimatedProps(() => ({
    strokeOpacity:
      STROKE_OPACITY_MIN +
      (STROKE_OPACITY_MAX - STROKE_OPACITY_MIN) * breath.value,
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweep.value }],
  }));

  const shimmerBandWidth = width * SHIMMER_BAND_FRACTION;

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          shimmer.value,
          [0, 1],
          [-shimmerBandWidth, width + shimmerBandWidth],
        ),
      },
      { rotate: SHIMMER_ANGLE },
    ],
  }));

  /*
   * Fully rounded. The radius lives on this clipping container rather than on
   * the Button: the Button's own background is transparent, so the visible
   * shape is whatever this container clips the gradient to.
   */
  return (
    <Box twClassName="rounded-full overflow-hidden" onLayout={handleLayout}>
      {width > 0 && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { width: width * 2, opacity: FILL_OPACITY },
            reduceMotion ? undefined : sweepStyle,
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={SWEEP_COLORS}
            // Bottom-left to top-right, matching the key visual.
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {!reduceMotion && width > 0 && height > 0 && (
        <Animated.View
          style={[
            styles.shimmerBand,
            // Taller than the button so the tilt never exposes an edge.
            { top: -height, bottom: -height, width: shimmerBandWidth },
            shimmerStyle,
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={SHIMMER_COLORS}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {SHOW_STROKE && width > 0 && height > 0 && (
        <Svg
          width={width}
          height={height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            {/*
              Bright in the middle, near-transparent at both ends, so the
              stroke is drawn all the way round but only part of it catches
              the light. Rotating this axis moves where that highlight falls.
            */}
            <AnimatedSvgLinearGradient
              id={STROKE_GRADIENT_ID}
              animatedProps={reduceMotion ? undefined : gradientProps}
              x1={0}
              y1={1}
              x2={1}
              y2={0}
            >
              <Stop offset="0" stopColor={brandColor.white} stopOpacity={0} />
              <Stop offset="0.5" stopColor={brandColor.white} stopOpacity={1} />
              <Stop offset="1" stopColor={brandColor.white} stopOpacity={0} />
            </AnimatedSvgLinearGradient>
          </Defs>

          {/* Base hairline — keeps the whole outline present at all times. */}
          <Rect
            x={inset}
            y={inset}
            width={strokeWidthPx}
            height={strokeHeight}
            rx={strokeHeight / 2}
            fill={TRANSPARENT}
            stroke={brandColor.white}
            strokeOpacity={STROKE_BASE_OPACITY}
            strokeWidth={STROKE_WIDTH}
          />

          {/* Full-perimeter gradient stroke, breathing in and out. */}
          <AnimatedRect
            x={inset}
            y={inset}
            width={strokeWidthPx}
            height={strokeHeight}
            rx={strokeHeight / 2}
            fill={TRANSPARENT}
            stroke={`url(#${STROKE_GRADIENT_ID})`}
            strokeWidth={STROKE_WIDTH}
            strokeOpacity={STROKE_OPACITY_MAX}
            animatedProps={reduceMotion ? undefined : breathProps}
          />
        </Svg>
      )}

      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={onPress}
        testID={testID}
        isFullWidth
        style={{ backgroundColor: TRANSPARENT }}
        textProps={{ style: { color: brandColor.white } }}
      >
        {label}
      </Button>
    </Box>
  );
};

export default OrangeGradientButton;
