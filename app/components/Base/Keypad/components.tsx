import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBase,
  ButtonBaseSize,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  TextVariant,
  type BoxProps,
  type ButtonBaseProps,
  type ButtonProps,
} from '@metamask/design-system-react-native';

interface KeypadContainerProps extends BoxProps {
  children?: React.ReactNode;
}

const KeypadContainer: React.FC<KeypadContainerProps> = (props) => (
  <Box gap={3} {...props} />
);

interface KeypadRowProps extends BoxProps {
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

interface KeypadButtonProps
  extends Omit<ButtonProps, 'children' | 'onPress' | 'variant'> {
  children?: React.ReactNode;
  onPress?: () => void;
  boxWrapperProps?: BoxProps;
  variant?: ButtonVariant;
}

const KeypadButton: React.FC<KeypadButtonProps> = ({
  children,
  onPress,
  boxWrapperProps,
  variant = ButtonVariant.Secondary,
  ...props
}) => (
  // Required wrapper to ensure the KeypadButton takes up space available in KeypadRow
  <Box twClassName="flex-1" {...boxWrapperProps}>
    <Button
      onPress={onPress}
      variant={variant}
      size={ButtonSize.Lg}
      isFullWidth
      textProps={{
        variant: TextVariant.DisplayMd,
        // fontWeight: FontWeight.Medium, // TODO: @MetaMask/design-system-engineers this still doesn't work for some reason?
        twClassName: 'font-medium', // Workaround for font weight
        accessibilityRole: 'none', // TODO: @MetaMask/design-system-engineers set this in ButtonBase component
      }}
      {...props}
    >
      {children}
    </Button>
  </Box>
);

interface KeypadDeleteButtonProps
  extends Omit<
    ButtonBaseProps,
    'children' | 'onPress' | 'onLongPress' | 'delayLongPress'
  > {
  children?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  boxWrapperProps?: BoxProps;
}

const KeypadDeleteButton: React.FC<KeypadDeleteButtonProps> = ({
  onPress,
  onLongPress,
  delayLongPress,
  boxWrapperProps,
  ...props
}) => (
  // Required wrapper to ensure the KeypadButton takes up space available in KeypadRow
  <Box twClassName="flex-1" {...boxWrapperProps}>
    <ButtonBase
      isFullWidth
      size={ButtonBaseSize.Lg}
      textProps={{
        variant: TextVariant.DisplayMd,
        accessibilityRole: 'none', // TODO: @MetaMask/design-system-engineers set this in ButtonBase component
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      twClassName={(pressed) => (pressed ? 'bg-pressed' : 'bg-transparent')}
      {...props}
    >
      <Icon name={IconName.Backspace} size={IconSize.Xl} />
    </ButtonBase>
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
