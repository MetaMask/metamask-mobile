import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  Icon,
  IconSize,
  IconName,
} from '@metamask/design-system-react-native';

interface SelectFieldProps {
  /** The display value shown in the field */
  value?: string;
  /** Shown in TextAlternative when there is no value (matches TextField placeholders). */
  placeholder?: string;
  /** Called when the field is pressed. Omit for read-only display. */
  onPress?: () => void;
  /** Whether the field is disabled */
  isDisabled?: boolean;
  /** Shows the error border (`border-error-default`), as MMDS TextField `isError`. */
  isError?: boolean;
  /** Whether to hide the arrow-down icon. Defaults to false. */
  hideIcon?: boolean;
  /** Optional content displayed before the selected value. */
  startAccessory?: React.ReactNode;
  /** Optional content displayed after the selected value (replaces arrow when set). */
  endAccessory?: React.ReactNode;
  /** Test ID for the touchable element */
  testID?: string;
  /** Spoken name for the control. Replaces the visible value, including emoji. */
  accessibilityLabel?: string;
}

/**
 * A select-style field that matches the MMDS TextField visual style
 * (`h-12 rounded-xl border-muted bg-muted px-4`, `gap-3` accessories,
 * `border-error-default` when `isError`, `opacity-50` when disabled).
 * Used for dropdown/picker triggers across onboarding screens.
 * Supports both interactive (with arrow icon) and read-only modes.
 *
 * MMDS has no form select field yet (SelectButton is a pill), so this stays
 * local until one exists.
 */
const SelectField: React.FC<SelectFieldProps> = ({
  value,
  placeholder,
  onPress,
  isDisabled = false,
  isError = false,
  hideIcon = false,
  startAccessory,
  endAccessory,
  testID,
  accessibilityLabel,
}) => {
  const tw = useTailwind();
  const isReadOnly = !onPress;
  const showIcon = !isReadOnly && !hideIcon && endAccessory == null;
  const hasValue = value !== undefined && value !== null && value !== '';

  const content = (
    <Box
      style={tw.style(
        'flex-row items-center justify-between h-12 rounded-xl border border-solid border-muted bg-muted px-4',
        isError && 'border-error-default',
        isDisabled && 'opacity-50',
      )}
    >
      <Box twClassName="flex-row items-center gap-3 flex-1 min-w-0">
        {startAccessory}
        <Text
          variant={TextVariant.BodyMd}
          color={
            isReadOnly || !hasValue
              ? TextColor.TextAlternative
              : TextColor.TextDefault
          }
          twClassName="shrink"
          numberOfLines={1}
        >
          {hasValue ? value : placeholder}
        </Text>
      </Box>
      {endAccessory}
      {showIcon && <Icon name={IconName.ArrowDown} size={IconSize.Sm} />}
    </Box>
  );

  if (isReadOnly) {
    return content;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={accessibilityLabel}
    >
      {content}
    </TouchableOpacity>
  );
};

export default SelectField;
