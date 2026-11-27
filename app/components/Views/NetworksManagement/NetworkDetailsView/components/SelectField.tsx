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
  value?: string;
  secondaryText?: string;
  onPress?: () => void;
  isDisabled?: boolean;
  testID?: string;
  endContent?: React.ReactNode;
}

const SelectField: React.FC<SelectFieldProps> = ({
  value,
  secondaryText,
  onPress,
  isDisabled = false,
  testID,
  endContent,
}) => {
  const content = (
    <Box
      className={`min-h-12 flex-row items-center justify-between rounded-xl border border-solid border-border-muted bg-background-muted px-4 py-2 ${isDisabled ? 'opacity-50' : ''}`}
    >
      <Box className="mr-2 flex-1">
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {value}
        </Text>
        {secondaryText ? (
          <Text
            variant={TextVariant.BodySm}
            className="text-text-alternative"
            numberOfLines={1}
          >
            {secondaryText}
          </Text>
        ) : null}
      </Box>
      {endContent ?? <Icon name={IconName.ArrowDown} size={IconSize.Sm} />}
    </Box>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity onPress={onPress} disabled={isDisabled} testID={testID}>
      {content}
    </TouchableOpacity>
  );
};

export default SelectField;
