import React, { forwardRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import Label from '../../../../../../component-library/components/Form/Label';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import TextField, {
  TextFieldSize,
} from '../../../../../../component-library/components/Form/TextField';
import { TextFieldProps } from '../../../../../../component-library/components/Form/TextField/TextField.types';
import { Theme } from '../../../../../../util/theme/models';

interface DepositTextFieldProps extends Omit<TextFieldProps, 'size'> {
  label: string | React.ReactNode;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    label: {
      marginBottom: 6,
    },
    field: {
      flexDirection: 'column',
      marginBottom: 16,
    },
    error: {
      color: theme.colors.error.default,
      fontSize: 12,
      marginTop: 4,
    },
  });
};

const DepositTextField = forwardRef<TextInput, DepositTextFieldProps>(
  ({ label, error, containerStyle, style, ...textFieldProps }, ref) => {
    const { styles, theme } = useStyles(styleSheet, {});

    return (
      <View style={[styles.field, containerStyle]}>
        {typeof label === 'string' ? (
          <Label variant={TextVariant.BodyMD} style={styles.label}>
            {label}
          </Label>
        ) : (
          <View style={styles.label}>{label}</View>
        )}
        <TextField
          size={TextFieldSize.Lg}
          placeholderTextColor={theme.colors.text.muted}
          keyboardAppearance={theme.themeAppearance}
          style={style}
          ref={ref}
          {...textFieldProps}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  },
);

export default DepositTextField;
