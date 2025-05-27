import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import Label from '../../../../../component-library/components/Form/Label';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';

interface DepositTextFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numeric'
    | 'phone-pad'
    | 'number-pad';
  secureTextEntry?: boolean;
  testID?: string;
  style?: object;
  containerStyle?: object;
}

const styleSheet = () =>
  StyleSheet.create({
    subtitle: {
      marginBottom: 20,
    },
    label: {
      marginBottom: 6,
    },
    field: {
      flexDirection: 'column',
      marginBottom: 16,
    },
    error: {
      color: 'red',
      fontSize: 12,
      marginTop: 4,
    },
    errorPlaceholder: {
      height: 16, // Ensures consistent spacing even when no error
    },
  });

const DepositTextField = forwardRef<any, DepositTextFieldProps>(
  (
    {
      label,
      placeholder,
      value,
      onChangeText,
      error,
      returnKeyType = 'done',
      autoCapitalize = 'none',
      keyboardType = 'default',
      secureTextEntry = false,
      testID,
      style = {},
      containerStyle = {},
    },
    ref,
  ) => {
    const { styles, theme } = useStyles(styleSheet, {});

    return (
      <View style={[styles.field, containerStyle]}>
        <Label variant={TextVariant.HeadingSMRegular} style={styles.label}>
          {label}
        </Label>
        <TextField
          size={TextFieldSize.Lg}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.muted}
          returnKeyType={returnKeyType}
          autoCapitalize={autoCapitalize}
          ref={ref}
          onChangeText={onChangeText}
          value={value}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          keyboardAppearance={theme.themeAppearance}
          testID={testID}
          style={style}
        />
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <View style={styles.errorPlaceholder} />
        )}
      </View>
    );
  },
);

export default DepositTextField;
