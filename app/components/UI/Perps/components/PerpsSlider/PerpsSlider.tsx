import React, { useCallback } from 'react';
import { Slider } from '@metamask/design-system-react-native';
import { playImpact, ImpactMoment } from '../../../../../util/haptics';

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
   * `'compact'` tightens the vertical spacing and removes the horizontal
   * track inset for dense layouts (e.g. footer sliders). The design system
   * `Slider` does not expose a smaller track/thumb size, so `compact` only
   * adjusts the spacing it can control via `trackInset`/`twClassName`.
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

  return (
    <Slider
      value={value}
      onValueChange={onValueChange}
      onDragEnd={onDragEnd}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      showRangeLabels={showPercentageLabels}
      showRangeDots={showPercentageMarkers}
      onGrip={handleGrip}
      onMark={handleMark}
      isDisabled={disabled}
      trackInset={isCompact ? 0 : undefined}
      twClassName={isCompact ? '-my-1.5' : undefined}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    />
  );
};

export default PerpsSlider;
