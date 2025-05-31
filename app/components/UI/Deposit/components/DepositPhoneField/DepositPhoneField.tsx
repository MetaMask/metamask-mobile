import React, { forwardRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  StyleProp,
  ViewStyle,
} from 'react-native';

import Label from '../../../../../component-library/components/Form/Label';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import { TextFieldProps } from '../../../../../component-library/components/Form/TextField/TextField.types';
import { Theme } from '../../../../../util/theme/models';
import { useStyles } from '../../../../../component-library/hooks';
import { formatUSPhoneNumber } from '../../utils';

interface PhoneFieldProps
  extends Omit<TextFieldProps, 'size' | 'onChangeText'> {
  label: string;
  onChangeText: (text: string) => void;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  countryCode?: string;
  countryFlag?: string;
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
    phoneInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    countryPrefix: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 48,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      borderRightWidth: 0,
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
      backgroundColor: theme.colors.background.default,
    },
    countryFlag: {
      fontSize: 16,
      marginRight: 4,
    },
    countryCode: {
      fontSize: 14,
    },
    phoneInput: {
      flex: 1,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
    },
    error: {
      color: theme.colors.error.default,
      fontSize: 12,
      marginTop: 4,
    },
  });
};

// TODO: Add more international phone number formatting logic - This is US only
const formatPhoneNumber = formatUSPhoneNumber;

const DepositPhoneField = forwardRef<TextInput, PhoneFieldProps>(
  (
    {
      label,
      onChangeText,
      error,
      countryCode = '1',
      countryFlag = '🇺🇸',
      ...textFieldProps
    },
    ref,
  ) => {
    const { styles, theme } = useStyles(styleSheet, {});

    const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');

    const handlePhoneNumberChange = (text: string) => {
      const rawValue = text.slice(0, 10).replace(/\D/g, '');
      const formattedValue = formatPhoneNumber(text);
      setFormattedPhoneNumber(formattedValue);
      onChangeText(rawValue);
    };

    return (
      <View style={styles.field}>
        <Label variant={TextVariant.HeadingSMRegular} style={styles.label}>
          {label}
        </Label>
        <View style={styles.phoneInputWrapper}>
          <View style={styles.countryPrefix}>
            <Text style={styles.countryFlag}>{countryFlag}</Text>
            <Text style={styles.countryCode}>+{countryCode}</Text>
          </View>
          <TextField
            size={TextFieldSize.Lg}
            placeholderTextColor={theme.colors.text.muted}
            keyboardType="phone-pad"
            keyboardAppearance={theme.themeAppearance}
            ref={ref}
            onChangeText={handlePhoneNumberChange}
            style={styles.phoneInput}
            {...textFieldProps}
            value={formattedPhoneNumber}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  },
);

export default DepositPhoneField;
