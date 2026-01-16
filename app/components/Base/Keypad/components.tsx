import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
  type BoxProps,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import TouchableOpacity from '../TouchableOpacity';
import { useTheme } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    keypadButton: {
      backgroundColor: colors.background.muted,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    keypadDeleteButton: {
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

interface KeypadContainerProps extends BoxProps {
  children?: React.ReactNode;
}

const KeypadContainer: React.FC<KeypadContainerProps> = (props) => (
  <Box gap={3} {...props} />
);

interface KeypadRowProps {
  children?: React.ReactNode;
}

const KeypadRow: React.FC<KeypadRowProps> = (props) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    gap={3}
    {...props}
  />
);

interface KeypadButtonProps {
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
  onPress?: () => void;
  isDisabled?: boolean;
  boxWrapperProps?: BoxProps;
}

const KeypadButton: React.FC<KeypadButtonProps> = ({
  style,
  children,
  isDisabled,
  boxWrapperProps,
  ...props
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    // Required wrapper to ensure the KeypadButton takes up space available in KeypadRow
    <Box twClassName="flex-1" {...boxWrapperProps}>
      <TouchableOpacity
        style={[styles.keypadButton, style]}
        disabled={isDisabled}
        accessibilityRole="button"
        accessible
        {...props}
      >
        <Text
          twClassName="font-medium text-center"
          variant={TextVariant.DisplayMd}
          accessibilityRole="none"
        >
          {children}
        </Text>
      </TouchableOpacity>
    </Box>
  );
};

interface KeypadDeleteButtonProps {
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  testID?: string;
  boxWrapperProps?: BoxProps;
}

const KeypadDeleteButton: React.FC<KeypadDeleteButtonProps> = ({
  style,
  boxWrapperProps,
  ...props
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    // Required wrapper to ensure the KeypadButton takes up space available in KeypadRow
    <Box twClassName="flex-1" {...boxWrapperProps}>
      <TouchableOpacity
        style={[styles.keypadDeleteButton, style]}
        accessibilityRole="button"
        accessible
        {...props}
      >
        <Icon name={IconName.Backspace} size={IconSize.Xl} />
      </TouchableOpacity>
    </Box>
  );
};

type KeypadType = React.FC<KeypadContainerProps> & {
  Row: React.FC<KeypadRowProps>;
  Button: React.FC<KeypadButtonProps>;
  DeleteButton: React.FC<KeypadDeleteButtonProps>;
};

const Keypad = KeypadContainer as KeypadType;
Keypad.Row = KeypadRow;
Keypad.Button = KeypadButton;
Keypad.DeleteButton = KeypadDeleteButton;

export default Keypad;
export type {
  KeypadContainerProps,
  KeypadButtonProps,
  KeypadDeleteButtonProps,
};
