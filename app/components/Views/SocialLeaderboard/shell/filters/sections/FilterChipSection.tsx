import React, { useCallback } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { playSelection } from '../../../../../../util/haptics';

/**
 * Selected chips used to swap `Button` variants. Secondary draws a 1px border
 * and Tertiary draws none, so every tap changed the chip's border box. The
 * filters sheet is anchored to the bottom of the screen, and that extra pixel
 * shifted every row upward. Both states keep this border so size, padding,
 * and label position stay put. Color is the only selected-state change.
 */
const STABLE_CHIP_BORDER = { borderWidth: 1 };

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
 * Section of single-select filter chips. Every chip is the same `Button`
 * secondary size in both states. A horizontal `FilterButtonGroup` swapped to
 * a borderless tertiary button when unselected, which remeasured the row and
 * the bottom-anchored sheet on each tap.
 */
const FilterChipSection = <T extends string>({
  titleKey,
  options,
  value,
  onChange,
  testID,
}: FilterChipSectionProps<T>) => {
  const handleChange = useCallback(
    (next: string) => {
      playSelection().catch(() => undefined);
      onChange(next as T);
    },
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
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="mt-2 flex-wrap gap-2"
        testID={`${testID}-controls`}
      >
        {options.map((option) => {
          const isSelected = option.id === value;
          return (
            <Button
              key={option.id}
              size={ButtonSize.Sm}
              variant={ButtonVariant.Secondary}
              style={STABLE_CHIP_BORDER}
              twClassName={isSelected ? 'bg-muted' : 'bg-transparent'}
              textProps={
                isSelected ? undefined : { color: TextColor.TextAlternative }
              }
              onPress={() => handleChange(option.id)}
              accessibilityState={{ selected: isSelected }}
              testID={`${testID}-${option.id}`}
            >
              {option.leadingEmoji
                ? `${option.leadingEmoji} ${strings(option.labelKey)}`
                : strings(option.labelKey)}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
};

export default FilterChipSection;
