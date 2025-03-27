import React, { FunctionComponent } from 'react';
import { ButtonType, UserInputEventType } from '@metamask/snaps-sdk';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  TouchableOpacityProps,
} from 'react-native';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import AnimatedLottieView from 'lottie-react-native';
import { useTheme } from '../../../util/theme';

export interface SnapUIButtonProps extends TouchableOpacityProps {
  name?: string;
  loading?: boolean;
  type?: ButtonType;
  form?: string;
  variant: keyof typeof COLORS;
  textVariant?: TextVariant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  testID?: string;
}

const COLORS = {
  primary: TextColor.Info,
  destructive: TextColor.Error,
  disabled: TextColor.Muted,
};

export const SnapUIButton: FunctionComponent<SnapUIButtonProps> = ({
  name,
  children,
  form,
  type = ButtonType.Button,
  variant = 'primary',
  disabled = false,
  loading = false,
  textVariant = TextVariant.BodyMDMedium,
  style,
  onPress,
  testID,
  ...props
}) => {
  const { handleEvent } = useSnapInterfaceContext();
  const { colors } = useTheme();

  const handlePress = () => {
    onPress?.();

    handleEvent({
      event: UserInputEventType.ButtonClickEvent,
      name,
    });

    if (type === ButtonType.Submit) {
      handleEvent({
        event: UserInputEventType.FormSubmitEvent,
        name: form,
      });
    }
  };

  const overriddenVariant = disabled ? 'disabled' : variant;
  const color = COLORS[overriddenVariant as keyof typeof COLORS];

  const isIcon =
    React.isValidElement(children) &&
    (children.props?.type === 'Icon' ||
      (children.type as React.ComponentType<unknown> & { displayName?: string })
        ?.displayName === 'Icon');

  const styles = StyleSheet.create({
    button: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      paddingVertical: 8,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      ...(style as ViewStyle),
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      marginRight: 8,
    },
    lastIcon: {
      marginRight: 0,
    },
  });

  const renderContent = () => {
    if (loading) {
      return (
        <AnimatedLottieView
          source={{ uri: './loading.json' }}
          autoPlay
          loop
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            width: 24,
            height: 24,
          }}
        />
      );
    }

    if (isIcon) {
      return <View style={styles.content}>{children}</View>;
    }

    if (typeof children === 'string') {
      return (
        <Text color={color} variant={textVariant}>
          {children}
        </Text>
      );
    }

    return children;
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={typeof children === 'string' ? children : name}
      testID={testID}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};
