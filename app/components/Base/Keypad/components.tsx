import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import {
  Button,
  ButtonBase,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  TextVariant,
  type ButtonBaseProps,
  type ButtonProps,
} from '@metamask/design-system-react-native';

const createStyles = () =>
  StyleSheet.create({
    keypad: {
      gap: 12,
    },
    keypadRow: {
      gap: 12,
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    keypadButtonWrapper: {
      flex: 1,
    },
  });

interface KeypadContainerProps {
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

const KeypadContainer: React.FC<KeypadContainerProps> = ({
  style,
  ...props
}) => {
  const styles = createStyles();

  return <View style={[styles.keypad, style]} {...props} />;
};

interface KeypadRowProps {
  children?: React.ReactNode;
}

const KeypadRow: React.FC<KeypadRowProps> = (props) => {
  const styles = createStyles();

  return <View style={styles.keypadRow} {...props} />;
};

type KeypadButtonProps = Omit<ButtonProps, 'variant' | 'children'> & {
  children: React.ReactNode;
};

const KeypadButton: React.FC<KeypadButtonProps> = ({ children, ...props }) => {
  const styles = createStyles();
  return (
    // Required wrapper to ensure the KeypadButton takes up space available in KeypadRow
    <View style={styles.keypadButtonWrapper}>
      <Button
        isFullWidth
        textProps={{
          variant: TextVariant.DisplayMd,
          // fontWeight: FontWeight.Medium, // TODO: @MetaMask/design-system-engineers this still doesn't work for some reason?
          twClassName: 'font-medium', // Workaround for font weight
          accessibilityRole: 'none', // TODO: @MetaMask/design-system-engineers set this in ButtonBase component
        }}
        {...props}
        variant={ButtonVariant.Secondary} // Can't override variant
      >
        {children}
      </Button>
    </View>
  );
};

type KeypadDeleteButtonProps = Omit<ButtonBaseProps, 'children'> & {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  testID?: string;
};

const KeypadDeleteButton: React.FC<KeypadDeleteButtonProps> = ({
  onPress,
  onLongPress,
  delayLongPress,
  testID,
  ...props
}) => {
  const styles = createStyles();
  return (
    // Required wrapper to ensure the KeypadButton takes up space available in KeypadRow
    <View style={styles.keypadButtonWrapper}>
      <ButtonBase
        isFullWidth
        textProps={{
          variant: TextVariant.DisplayMd,
          accessibilityRole: 'none', // TODO: @MetaMask/design-system-engineers set this in ButtonBase component
        }}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={delayLongPress}
        twClassName="bg-transparent"
        testID={testID}
        {...props}
      >
        <Icon name={IconName.Backspace} size={IconSize.Xl} />
      </ButtonBase>
    </View>
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
