import React, { useCallback } from 'react';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonBase,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  TextVariant,
  type ButtonBaseProps,
  type BoxProps,
  type ButtonProps,
  FontWeight,
} from '@metamask/design-system-react-native';

interface KeypadContainerProps extends BoxProps {
  children?: React.ReactNode;
}

const KeypadContainer: React.FC<KeypadContainerProps> = ({
  style,
  ...props
}) => <Box gap={3} style={style} {...props} />;

interface KeypadRowProps {
  children?: React.ReactNode;
}

const KeypadRow: React.FC<KeypadRowProps> = (props) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    gap={3}
    twClassName="justify-around"
    {...props}
  />
);

type KeypadButtonProps = Omit<ButtonProps, 'variant' | 'children'> & {
  children: React.ReactNode;
  boxWrapperProps?: BoxProps;
};

const KeypadButton: React.FC<KeypadButtonProps> = ({
  children,
  boxWrapperProps,
  ...props
}) => (
  // Required wrapper to ensure the KeypadButton takes up space available in KeypadRow
  <Box twClassName="flex-1" {...boxWrapperProps}>
    <Button
      isFullWidth
      textProps={{
        variant: TextVariant.DisplayMd,
        fontWeight: FontWeight.Medium,
      }}
      {...props}
      variant={ButtonVariant.Secondary} // Can't override variant
    >
      {children}
    </Button>
  </Box>
);

type KeypadDeleteButtonProps = Omit<ButtonBaseProps, 'children'> & {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  testID?: string;
  boxWrapperProps?: BoxProps;
};

const KeypadDeleteButton: React.FC<KeypadDeleteButtonProps> = ({
  onPress,
  onLongPress,
  delayLongPress,
  testID,
  boxWrapperProps,
  ...props
}) => {
  const deleteButtonClassName = useCallback(
    (pressed: boolean) => `bg-transparent ${pressed && 'bg-pressed'}`,
    [],
  );
  return (
    // Required wrapper to ensure the KeypadButton takes up space available in KeypadRow
    <Box twClassName="flex-1" {...boxWrapperProps}>
      <ButtonBase
        isFullWidth
        textProps={{
          variant: TextVariant.DisplayMd,
          fontWeight: FontWeight.Medium,
        }}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={delayLongPress}
        testID={testID}
        twClassName={deleteButtonClassName}
        {...props}
      >
        <Icon name={IconName.Arrow2Left} size={IconSize.Lg} />
      </ButtonBase>
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
