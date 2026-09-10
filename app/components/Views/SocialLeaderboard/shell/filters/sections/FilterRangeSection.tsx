import React, { useCallback } from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import RangeSlider from '../RangeSlider/RangeSlider';
import type { SocialRangeFilter } from '../types';

export interface FilterRangeSectionProps {
  /** i18n key for the section heading (e.g. "Market cap"). */
  titleKey: string;
  /** Lower bound of the slider. */
  minimumValue: number;
  /** Upper bound of the slider. */
  maximumValue: number;
  /** Current selection. */
  value: SocialRangeFilter;
  /** Called on every change during a drag. */
  onValueChange: (value: SocialRangeFilter) => void;
  /** Called once when a drag ends. */
  onDragEnd?: (value: SocialRangeFilter) => void;
  /** Formats the current range for the right-aligned label. */
  formatLabel: (value: SocialRangeFilter) => string;
  /** Base testID for the slider. */
  testID: string;
}

/**
 * Section with a heading, a right-aligned formatted range label, and the
 * dual-thumb `RangeSlider`. Reuses MMDS `Text` / `Box` for layout.
 */
const FilterRangeSection: React.FC<FilterRangeSectionProps> = ({
  titleKey,
  minimumValue,
  maximumValue,
  value,
  onValueChange,
  onDragEnd,
  formatLabel,
  testID,
}) => {
  const handleChange = useCallback(
    (next: { min: number; max: number }) => onValueChange(next),
    [onValueChange],
  );

  const handleDragEnd = useCallback(
    (next: { min: number; max: number }) => onDragEnd?.(next),
    [onDragEnd],
  );

  return (
    <Box twClassName="mt-4">
      <Box twClassName="flex-row items-center justify-between">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings(titleKey)}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
          {formatLabel(value)}
        </Text>
      </Box>
      <Box twClassName="mt-2">
        <RangeSlider
          minimumValue={minimumValue}
          maximumValue={maximumValue}
          value={value}
          onValueChange={handleChange}
          onDragEnd={handleDragEnd}
          testID={testID}
        />
      </Box>
    </Box>
  );
};

export default FilterRangeSection;
