import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconSize,
  IconName,
} from '@metamask/design-system-react-native';

interface SelectFieldProps {
  /** The display value shown in the field */
  value?: string;
  /** Called when the field is pressed. Omit for read-only display. */
  onPress?: () => void;
  /** Whether the field is disabled */
  isDisabled?: boolean;
  /** Whether to hide the arrow-down icon. Defaults to false. */
  hideIcon?: boolean;
  /** Test ID for the touchable element */
  testID?: string;
}

/**
 * A select-style field that matches the TextField visual style.
 * Used for dropdown/picker triggers across onboarding screens.
 * Supports both interactive (with arrow icon) and read-only modes.
 */
const SelectField: React.FC<SelectFieldProps> = ({
  value,
  onPress,
  isDisabled = false,
  hideIcon = false,
  testID,
}) => {
  const isReadOnly = !onPress;
  const showIcon = !isReadOnly && !hideIcon;

  const content = (
    <Box
      twClassName={`flex-row items-center justify-between h-12 rounded-xl border border-solid border-border-muted bg-background-muted px-4 ${isDisabled ? 'opacity-50' : ''}`}
    >
      <Text
        variant={TextVariant.BodyMd}
        twClassName={isReadOnly ? 'text-text-alternative' : undefined}
      >
        {value}
      </Text>
      {showIcon && <Icon name={IconName.ArrowDown} size={IconSize.Sm} />}
    </Box>
  );

  if (isReadOnly) {
    return content;
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={isDisabled} testID={testID}>
      {content}
    </TouchableOpacity>
  );
};

export default SelectField;
