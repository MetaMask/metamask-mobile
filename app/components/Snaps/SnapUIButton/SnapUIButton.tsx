import React, { FunctionComponent } from 'react';
import { ButtonType, UserInputEventType } from '@metamask/snaps-sdk';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TouchableOpacityProps,
} from 'react-native';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import {
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

    // Since we don't have onSubmit on mobile, the button submits the form.
    if (type === ButtonType.Submit) {
      handleEvent({
        event: UserInputEventType.FormSubmitEvent,
        name: form,
      });
    }
  };

  const styles = StyleSheet.create({
    button: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      ...(style as ViewStyle),
    },
    loadingAnimation: {
      width: 24,
      height: 24,
    },
  });

  if (loading) {
    return (
      <TouchableOpacity
        style={styles.button}
        disabled={true}
        accessible
        accessibilityRole="button"
        accessibilityLabel={typeof children === 'string' ? children : name}
        testID={testID}
        {...props}
      >
        <AnimatedLottieView
          source={{ uri: './loading.json' }}
          autoPlay
          loop
          style={styles.loadingAnimation}
        />
      </TouchableOpacity>
    );
  }

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
      {children}
    </TouchableOpacity>
  );
};
