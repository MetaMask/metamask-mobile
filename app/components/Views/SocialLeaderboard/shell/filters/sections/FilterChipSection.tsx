import React, { useCallback } from 'react';
import {
  Box,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';

export interface FilterChipOption<T extends string> {
  id: T;
  labelKey: string;
  /** Optional emoji prefix rendered before the label (e.g. cohort icons). */
  leadingEmoji?: string;
}

export interface FilterChipSectionProps<T extends string> {
  /** i18n key for the section heading. */
  titleKey: string;
  /** Options in display order. */
  options: readonly FilterChipOption<T>[];
  /** Currently selected option id. */
  value: T;
  /** Called with the new option id when the user taps a chip. */
  onChange: (value: T) => void;
  /** Base testID; each chip is `${testID}-${id}`. */
  testID: string;
}

/**
 * Section of single-select filter chips. Reuses MMDS `FilterButtonGroup` /
 * `FilterButton` with `FilterButtonVariant.Secondary` to match the Perps
 * order-book config sheet. Chips wrap to multiple rows when they exceed the
 * row width (the underlying `FilterButtonGroup` handles wrapping).
 */
const FilterChipSection = <T extends string>({
  titleKey,
  options,
  value,
  onChange,
  testID,
}: FilterChipSectionProps<T>) => {
  const handleChange = useCallback(
    (next: string) => onChange(next as T),
    [onChange],
  );

  return (
    <Box twClassName="mt-4">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {strings(titleKey)}
      </Text>
      <FilterButtonGroup
        value={value}
        onChange={handleChange}
        variant={FilterButtonVariant.Secondary}
        twClassName="mt-2 gap-2"
      >
        {options.map((option) => (
          <FilterButton
            key={option.id}
            value={option.id}
            size={FilterButtonSize.Lg}
            isSelected={option.id === value}
            testID={`${testID}-${option.id}`}
          >
            {option.leadingEmoji
              ? `${option.leadingEmoji} ${strings(option.labelKey)}`
              : strings(option.labelKey)}
          </FilterButton>
        ))}
      </FilterButtonGroup>
    </Box>
  );
};

export default FilterChipSection;
