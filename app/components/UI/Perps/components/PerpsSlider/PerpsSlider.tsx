import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Slider } from '@metamask/design-system-react-native';
import { playImpact, ImpactMoment } from '../../../../../util/haptics';

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
/** Natural (unscaled) height of the track+thumb area, no range labels. */
const SLIDER_TRACK_AREA_HEIGHT =
  SLIDER_VERTICAL_PADDING * 2 + THUMB_BOTTOM_OFFSET;
/**
 * Visual scale applied to the `compact` variant so it matches Figma's small
 * slider (16px thumb, 4px track, 2px dots — exactly half of the design
 * system's hardcoded 32px/8px/4px). See the `variant` doc below for why this
 * can't just be a prop on the design system `Slider`.
 */
const COMPACT_SCALE = 0.5;

const styles = StyleSheet.create({
  compactScaler: {
    height: SLIDER_TRACK_AREA_HEIGHT * COMPACT_SCALE,
    width: '200%',
    transform: [{ scale: COMPACT_SCALE }],
    transformOrigin: 'left top',
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
   * whole subtree, so this wraps it in a single `View` that declares
   * `width: '200%'` (double, so the `Slider` — which stretches to fill its
   * parent — still spans the full row after shrinking) and `height` equal
   * to the target *post-scale* size (half the `Slider`'s natural height, so
   * it overflows the declared box by exactly 2x). `transform: scale(0.5)`
   * with `transformOrigin: 'left top'` then shrinks that whole overflowing
   * render back down, anchored at the top-left corner — the declared box
   * and the shrunk content end up pixel-identical, so no separate clipping
   * container is needed. The drag/tap gesture math still runs against the
   * pre-scale (double-size) layout box, so the hit-region stays exactly as
   * large as the `'default'` variant's even though it now looks half the
   * size.
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

  // The design system `Slider` repositions its thumb from a
  // `useAnimatedReaction` keyed on the `value` prop alone; `minimumValue` /
  // `maximumValue` are read inside that worklet but do not trigger it. A range
  // change with `value` unchanged — switching the Perps payment method
  // recomputes the max spendable notional, e.g. 1866 -> 34, while the amount
  // stays $10 — therefore left the thumb at the pixel position computed for the
  // old range (0.5% of 1866, i.e. visually 0%) instead of the new one (29.4%).
  //
  // So drive the design system `Slider` in a fixed 0-100 percent domain and do
  // the domain conversion here. A range change now moves `percentValue`, which
  // is the prop the reaction already watches, so the thumb repositions without
  // remounting. That matters because `maximumValue` is derived from live price
  // and balance feeds: at leverage 20, ten 5-cent balance moves produce ten
  // distinct maxima. Remounting on each would reset `sliderWidth`/`translateX`,
  // rebuild the pan gesture, and discard the package's commit-generation echo
  // suppression — interrupting any drag in progress.
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
      // Re-apply the caller's step in its own domain; the slider's own step is
      // now expressed in percent and cannot enforce it.
      const stepped = step > 0 ? Math.round(raw / step) * step : raw;
      return Math.min(maximumValue, Math.max(minimumValue, stepped));
    },
    [maximumValue, minimumValue, step],
  );

  const percentValue = toPercent(value);
  // One percent of the track is finer than a whole step for every range the
  // Perps sliders use, so let the thumb move continuously and let `toDomain`
  // snap the value the caller actually receives.
  const percentStep = 0.1;

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
      showRangeLabels={showPercentageLabels}
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

  return <View style={styles.compactScaler}>{slider}</View>;
};

export default PerpsSlider;
