import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  FontWeight,
  Slider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { playImpact, ImpactMoment } from '../../../../../util/haptics';
import { getPerpsSliderSelector } from '../../Perps.testIds';

/**
 * Mirrors `@metamask/design-system-react-native`'s Slider geometry constants
 * (`Slider.constants.mjs`) — not part of that package's public API, so
 * duplicated here to size the `compact` variant's scale-down wrapper below.
 * Keep in sync if that package's Slider geometry changes.
 */
const SLIDER_VERTICAL_PADDING = 8;
const THUMB_SIZE = 32;
const THUMB_TOP_OFFSET = -13;
const THUMB_BOTTOM_OFFSET = THUMB_TOP_OFFSET + THUMB_SIZE;
const TRACK_HEIGHT = 8;
/** Natural (unscaled) height of the track+thumb area, no range labels. */
const SLIDER_TRACK_AREA_HEIGHT =
  SLIDER_VERTICAL_PADDING * 2 + THUMB_BOTTOM_OFFSET;
/**
 * Visual scale applied to the `compact` variant so its thumb matches the
 * 24px thumb of Figma's small slider (the design system hardcodes 32px). The
 * track and dots shrink by the same factor (8px → 6px, 4px → 3px), which is
 * the closest a uniform transform can get to Figma's 4px/2px. See the
 * `variant` doc below for why this can't just be a prop on the design system
 * `Slider`.
 */
const COMPACT_SCALE = 0.75;

/**
 * Figma's range labels stay at Body/Xs (12/20) regardless of the shrunken
 * track, so the `compact` variant renders them itself outside the scaler
 * rather than letting the design system's Body/Md labels be shrunk with
 * everything else. Mirrors `Slider`'s own edge insets so a label still lines
 * up with the dot it belongs to. Figma labels only the outer and middle marks
 * with a `%` sign.
 */
const COMPACT_LABEL_LINE_HEIGHT = 20;
/** Figma: 16px between the bottom of the track and the top of the labels. */
const COMPACT_TRACK_TO_LABEL_GAP = 16;
/**
 * The scaler box already extends past the track by the thumb's overhang plus
 * the bottom padding, so only the remainder of the Figma gap is added as a
 * margin below it.
 */
const COMPACT_LABEL_GAP = Math.max(
  0,
  COMPACT_TRACK_TO_LABEL_GAP -
    (SLIDER_TRACK_AREA_HEIGHT - SLIDER_VERTICAL_PADDING - TRACK_HEIGHT) *
      COMPACT_SCALE,
);
const COMPACT_LABEL_MARKS = [
  { step: 0, label: '0%', left: '2%' },
  { step: 25, label: '25', left: '25%' },
  { step: 50, label: '50%', left: '50%' },
  { step: 75, label: '75', left: '75%' },
  { step: 100, label: '100%', left: '98%' },
] as const;

const styles = StyleSheet.create({
  compactScaler: {
    height: SLIDER_TRACK_AREA_HEIGHT * COMPACT_SCALE,
    width: `${100 / COMPACT_SCALE}%`,
    transform: [{ scale: COMPACT_SCALE }],
    transformOrigin: 'left top',
  },
  compactLabelRow: {
    height: COMPACT_LABEL_LINE_HEIGHT,
    marginTop: COMPACT_LABEL_GAP,
  },
  compactLabel: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: '-50%' }],
  },
});

interface PerpsSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  /**
   * Fired once when the user lifts their finger or taps the track/label.
   * Use this for expensive side effects (fee/rewards/validation recompute);
   * use `onValueChange` for cheap, display-only updates during the drag.
   */
  onDragEnd?: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  showPercentageLabels?: boolean;
  /** Renders a dot marker on the track at each 0/25/50/75/100 mark, independent of the labels below the track. */
  showPercentageMarkers?: boolean;
  disabled?: boolean;
  /**
   * `'compact'` visually shrinks the whole slider (thumb/track/dots) to
   * match Figma's small variant and removes the horizontal track inset, for
   * dense layouts (e.g. footer sliders). The design system `Slider` has no
   * size prop and only exposes one root `style`/`twClassName` covering its
   * whole subtree, so this wraps it in a single `View` that declares a
   * `width` of `100% / COMPACT_SCALE` (so the `Slider` — which stretches to
   * fill its parent — still spans the full row after shrinking) and `height`
   * equal to the target *post-scale* size (the `Slider`'s natural height
   * times the scale, so it overflows the declared box by exactly
   * `1 / COMPACT_SCALE`). `transform: scale(COMPACT_SCALE)` with
   * `transformOrigin: 'left top'` then shrinks that whole overflowing render
   * back down, anchored at the top-left corner — the declared box and the
   * shrunk content end up pixel-identical, so no separate clipping container
   * is needed. The drag/tap gesture math still runs against the pre-scale
   * (larger) layout box, so the hit-region stays exactly as large as the
   * `'default'` variant's even though it now looks smaller.
   */
  variant?: 'default' | 'compact';
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Thin wrapper around the design system `Slider` (@metamask/design-system-react-native).
 * Centralizes the haptics wiring and dots/labels config shared by all Perps sliders.
 */
const PerpsSlider: React.FC<PerpsSliderProps> = ({
  value,
  onValueChange,
  onDragEnd,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  showPercentageLabels = true,
  showPercentageMarkers = true,
  disabled = false,
  variant = 'default',
  testID,
  accessibilityLabel,
}) => {
  const handleGrip = useCallback(() => {
    playImpact(ImpactMoment.SliderGrip);
  }, []);

  const handleMark = useCallback(() => {
    playImpact(ImpactMoment.SliderTick);
  }, []);

  const isCompact = variant === 'compact';
  const hasCompactLabels = isCompact && showPercentageLabels;

  const handleLabelPress = useCallback(
    (markStep: number) => {
      const next =
        minimumValue + (markStep / 100) * (maximumValue - minimumValue);
      onValueChange(next);
      onDragEnd?.(next);
    },
    [maximumValue, minimumValue, onDragEnd, onValueChange],
  );

  // The design system `Slider` only repositions its thumb when `value` changes;
  // it ignores range changes. Driving it in percent means a range change moves
  // `value`, so the thumb follows without remounting (remounting would kill an
  // in-flight drag, and the range streams from live price/balance feeds).
  const range = maximumValue - minimumValue;
  const toPercent = (domainValue: number) =>
    range > 0 ? ((domainValue - minimumValue) / range) * 100 : 0;
  const toDomain = useCallback(
    (percent: number) => {
      const span = maximumValue - minimumValue;
      if (span <= 0) {
        return minimumValue;
      }
      const raw = minimumValue + (percent / 100) * span;
      // Percent is a float; round so the caller only sees exact step multiples.
      const stepped = step > 0 ? Math.round(raw / step) * step : raw;
      return Math.min(maximumValue, Math.max(minimumValue, stepped));
    },
    [maximumValue, minimumValue, step],
  );

  // One caller step, in percent. Keeps the slider's grid identical to the
  // caller's, so VoiceOver's step-sized increments still move one step.
  const percentStep = range > 0 && step > 0 ? (step / range) * 100 : 0.1;
  // Snap onto the emit grid: the slider suppresses stale echoes by matching
  // `value` against its own emits with ===, so the fed-back percent has to be
  // bit-identical to the emitted one. Rebuild it as `index * percentStep` —
  // the same expression the slider emits — rather than converting back through
  // percent, which lands a few ULPs off and silently misses the match.
  // Clamped because `maximumValue` is a live float that is rarely a whole
  // multiple of `step`: the last index then lands just past the end of the
  // track (e.g. max 33.5 step 1 gives 101.49), which would push the thumb past
  // the slider's own maximum.
  const percentValue =
    range > 0 && step > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((toDomain(toPercent(value)) - minimumValue) / step) *
              percentStep,
          ),
        )
      : 0;

  const handlePercentChange = useCallback(
    (percent: number) => onValueChange(toDomain(percent)),
    [onValueChange, toDomain],
  );

  const handlePercentDragEnd = useCallback(
    (percent: number) => onDragEnd?.(toDomain(percent)),
    [onDragEnd, toDomain],
  );

  const slider = (
    <Slider
      value={percentValue}
      onValueChange={handlePercentChange}
      onDragEnd={onDragEnd ? handlePercentDragEnd : undefined}
      minimumValue={0}
      maximumValue={100}
      step={percentStep}
      showRangeLabels={showPercentageLabels && !isCompact}
      showRangeDots={showPercentageMarkers}
      onGrip={handleGrip}
      onMark={handleMark}
      isDisabled={disabled}
      trackInset={isCompact ? 0 : undefined}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    />
  );

  if (!isCompact) {
    return slider;
  }

  return (
    <View>
      <View style={styles.compactScaler}>{slider}</View>
      {hasCompactLabels ? (
        <View style={styles.compactLabelRow}>
          {COMPACT_LABEL_MARKS.map((mark) => (
            <Pressable
              key={mark.step}
              testID={getPerpsSliderSelector.compactLabel(mark.step)}
              style={[styles.compactLabel, { left: mark.left }]}
              onPress={() => handleLabelPress(mark.step)}
              disabled={disabled}
              accessibilityRole="button"
            >
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {mark.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

export default PerpsSlider;
