import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {
  Box,
  BoxFlexDirection,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
// TODO: @MetaMask/design-system-engineers
// Use the concrete Box component props here instead of BoxProps.
// In MetaMask Mobile, extending BoxProps in forwarding wrappers can fail TS checks
// because consumer code may resolve older @types/react-native callback types while
// MMDS Box resolves React Native bundled types. Deriving props from the component
// keeps wrapper props aligned with the actual JSX contract until the library-level
// typing story is unified.
// https://github.com/MetaMask/metamask-design-system/issues/1115
type BoxComponentProps = React.ComponentProps<typeof Box>;

// TEMP: Quick Buy keypad look — transparent keys + 24px digits. Revert when settled.
const styles = StyleSheet.create({
  keypadButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonText: {
    fontSize: 24,
  },
  keypadDeleteButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

interface KeypadContainerProps extends BoxComponentProps {
  children?: React.ReactNode;
}

const KeypadContainer: React.FC<KeypadContainerProps> = (props) => (
  <Box gap={5} {...props} />
);

interface KeypadRowProps extends BoxComponentProps {
  children?: React.ReactNode;
}

const KeypadRow: React.FC<KeypadRowProps> = (props) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    gap={5}
    {...props}
  />
);

interface KeypadButtonProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  onPress?: () => void;
  isDisabled?: boolean;
  boxWrapperProps?: BoxComponentProps;
  testID?: string;
}

const KeypadButton: React.FC<KeypadButtonProps> = ({
  style,
  children,
  isDisabled,
  boxWrapperProps,
  ...props
}) => (
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
        style={styles.keypadButtonText}
        accessibilityRole="none"
      >
        {children}
      </Text>
    </TouchableOpacity>
  </Box>
);

interface KeypadDeleteButtonProps {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  testID?: string;
  boxWrapperProps?: BoxComponentProps;
}

const KeypadDeleteButton: React.FC<KeypadDeleteButtonProps> = ({
  style,
  boxWrapperProps,
  ...props
}) => (
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
