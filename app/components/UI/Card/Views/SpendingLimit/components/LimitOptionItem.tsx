import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import RadioButton from '../../../../../../component-library/components/RadioButton';
import TextField, {
  TextFieldSize,
} from '../../../../../../component-library/components/Form/TextField';

export interface LimitOptionItemProps {
  /** Title of the option */
  title: string;
  /** Description text */
  description: string;
  /** Whether this option is currently selected */
  isSelected: boolean;
  /** Callback when option is pressed */
  onPress: () => void;
  /** Whether to show the input field (for spending limit option) */
  showInput?: boolean;
  /** Current input value */
  inputValue?: string;
  /** Callback when input value changes */
  onInputChange?: (value: string) => void;
  /** Test ID for E2E testing */
  testID?: string;
}

/**
 * LimitOptionItem component for displaying a radio-style option
 * Uses RadioButton and TextField from the design system
 */
const LimitOptionItem: React.FC<LimitOptionItemProps> = ({
  title,
  description,
  isSelected,
  onPress,
  showInput = false,
  inputValue = '',
  onInputChange,
  testID,
}) => (
  <Box twClassName="py-3">
    <RadioButton
      isChecked={isSelected}
      onPress={onPress}
      testID={testID}
      label={
        <Text variant={TextVariant.BodyMd} twClassName="font-medium">
          {title}
        </Text>
      }
    />
    <Text variant={TextVariant.BodySm} twClassName="text-alternative mt-1 ml-8">
      {description}
    </Text>

    {/* Input field for spending limit */}
    {showInput && isSelected && (
      <Box twClassName="mt-3 ml-8">
        <TextField
          size={TextFieldSize.Lg}
          value={inputValue}
          onChangeText={onInputChange}
          placeholder="0"
          keyboardType="decimal-pad"
          returnKeyType="done"
          testID={`${testID}-input`}
        />
      </Box>
    )}
  </Box>
);

export default LimitOptionItem;
