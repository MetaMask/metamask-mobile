import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import Label from '../../../../../../component-library/components/Form/Label';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import TextField, {
  TextFieldSize,
} from '../../../../../../component-library/components/Form/TextField';
import { TextFieldProps } from '../../../../../../component-library/components/Form/TextField/TextField.types';
import { Theme } from '../../../../../../util/theme/models';
import { useStyles } from '../../../../../../component-library/hooks';
import { E164Number } from 'libphonenumber-js';
import PhoneInput from 'react-phone-number-input/react-native-input';
import {
  getCountryCallingCode,
  parsePhoneNumber,
} from 'react-phone-number-input';
import { DepositRegion } from '../../constants';

interface PhoneFieldProps
  extends Omit<TextFieldProps, 'size' | 'onChangeText'> {
  label: string;
  onChangeText: (text: string) => void;
  error?: string;
  region: DepositRegion;
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
    },
    error: {
      color: theme.colors.error.default,
      fontSize: 12,
      marginTop: 4,
    },
  });
};

const DepositPhoneField: React.FC<PhoneFieldProps> = ({
  label,
  onChangeText,
  error,
  region,
  value,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});

  const handlePhoneNumberChange = (newValue: E164Number) => {
    onChangeText(newValue);
  };

  const placeholder = useMemo(() => {
    const countryCode = region?.code || 'US';
    const callingCode = getCountryCallingCode(countryCode);

    if (countryCode === 'US') {
      const exampleNumber = `+${callingCode}${'2'.repeat(
        region?.phoneDigitCount || 10,
      )}`;
      const parsed = parsePhoneNumber(exampleNumber);
      if (!parsed) return '';
      return parsed.formatNational();
    }
    const exampleNumber = `+${callingCode}${'2'.repeat(
      region?.phoneDigitCount || 9,
    )}`;
    const parsed = parsePhoneNumber(exampleNumber);
    if (!parsed) return '';
    const formatted = parsed.formatInternational();
    return formatted.replace(`+${callingCode} `, '');
  }, [region?.code, region?.phoneDigitCount]);

  return (
    <View style={styles.field}>
      <Label variant={TextVariant.HeadingSMRegular} style={styles.label}>
        {label}
      </Label>
      <View style={styles.phoneInputWrapper}>
        <PhoneInput
          country={region?.code}
          international={region?.code !== 'US'}
          value={value}
          onChange={handlePhoneNumberChange}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          inputComponent={(props: any) => (
            <TextField
              testID="deposit-phone-field-test-id"
              autoFocus
              startAccessory={
                <View style={styles.countryPrefix}>
                  <Text style={styles.countryFlag}>{region?.flag}</Text>
                </View>
              }
              size={TextFieldSize.Lg}
              placeholderTextColor={theme.colors.text.muted}
              keyboardAppearance={theme.themeAppearance}
              placeholder={placeholder}
              keyboardType="phone-pad"
              style={styles.phoneInput}
              {...props}
            />
          )}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

export default DepositPhoneField;
