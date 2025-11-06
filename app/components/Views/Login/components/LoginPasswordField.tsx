import React from 'react';
import { TextInput, StyleProp, TextStyle, ColorSchemeName } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import TextField, {
  TextFieldSize,
} from '../../../../component-library/components/Form/TextField';

interface LoginPasswordFieldProps {
  password: string;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
  error: string | null;
  disabled: boolean;
  fieldRef: React.RefObject<TextInput>;
  biometryButton: React.ReactNode;
  themeAppearance: ColorSchemeName;
  colors: { text: { alternative: string } };
  testID: string;
  style?: StyleProp<TextStyle>;
}

export const LoginPasswordField: React.FC<LoginPasswordFieldProps> = ({
  password,
  onPasswordChange,
  onSubmit,
  error,
  disabled,
  fieldRef,
  biometryButton,
  themeAppearance,
  colors,
  testID,
  style,
}) => (
  <TextField
    size={TextFieldSize.Lg}
    placeholder={strings('login.password_placeholder')}
    placeholderTextColor={colors.text.alternative}
    testID={testID}
    returnKeyType={'done'}
    autoCapitalize="none"
    secureTextEntry
    ref={fieldRef}
    onChangeText={onPasswordChange}
    value={password}
    onSubmitEditing={onSubmit}
    endAccessory={biometryButton}
    keyboardAppearance={themeAppearance || undefined}
    isDisabled={disabled}
    isError={!!error}
    style={style}
  />
);
