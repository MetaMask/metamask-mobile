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
  disabled?: boolean;
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
  disabled = false,
}) => {
  const handleGrip = useCallback(() => {
    playImpact(ImpactMoment.SliderGrip);
  }, []);

  const handleMark = useCallback(() => {
    playImpact(ImpactMoment.SliderTick);
  }, []);

  return (
    <Slider
      value={value}
      onValueChange={onValueChange}
      onDragEnd={onDragEnd}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      showRangeLabels={showPercentageLabels}
      showRangeDots={showPercentageLabels}
      onGrip={handleGrip}
      onMark={handleMark}
      isDisabled={disabled}
    />
  );
};

export default PerpsSlider;
