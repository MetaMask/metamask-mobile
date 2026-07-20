import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@metamask/design-system-react-native';
import type { Country } from '@metamask/ramps-controller';
import { useStyles } from '../../../../../../hooks/useStyles';
import { strings } from '../../../../../../../../locales/i18n';
import DepositTextField from '../../../../components/DepositTextField';
import { formatNumberToTemplate } from '../../../../utils/formatNumberToTemplate';
import { createPhoneCountrySelectorModalNavigationDetails } from '../../../Modals/PhoneCountrySelectorModal';
import {
  DEFAULT_PHONE_TEMPLATE,
  findCountryByPhonePrefix,
  getLocalPhoneDigits,
} from './phoneCountry';
import styleSheet from './PhoneField.styles';

export interface PhoneFieldProps {
  label: string;
  /** Full mobile number including the dialing prefix (e.g. `+44912345678`). */
  value: string;
  /** Called with the full mobile number (prefix + local digits) on any change. */
  onChangeText: (mobileNumber: string) => void;
  /** Countries available in the phone-country selector. */
  countries: Country[];
  /** Country used as the default when no prefix can be inferred (e.g. the user's region). */
  fallbackCountry?: Country | null;
  /** Initial mobile number used to infer the default phone country (e.g. a prefilled value). */
  initialNumber?: string;
  error?: string;
  onSubmitEditing?: () => void;
  testID?: string;
  countrySelectorTestID?: string;
}

/**
 * Phone number input with a tappable country selector. The selected phone
 * country is local to this field and independent of the user's KYC region, so
 * a user can enter a phone number for a country different from their region.
 */
const PhoneField = forwardRef<TextInput, PhoneFieldProps>(
  (
    {
      label,
      value,
      onChangeText,
      countries,
      fallbackCountry,
      initialNumber,
      error,
      onSubmitEditing,
      testID,
      countrySelectorTestID,
    },
    ref,
  ) => {
    const navigation = useNavigation();
    const { styles } = useStyles(styleSheet, {});

    const defaultPhoneCountry = useMemo(
      () =>
        findCountryByPhonePrefix(countries, initialNumber, fallbackCountry) ??
        fallbackCountry ??
        null,
      [countries, initialNumber, fallbackCountry],
    );

    // The user's explicit pick wins; otherwise fall back to the inferred
    // default, which can resolve late as countries / region load.
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(
      null,
    );
    const phoneCountry = selectedCountry ?? defaultPhoneCountry;

    const phonePrefix = phoneCountry?.phone?.prefix ?? '';
    const phoneTemplate =
      phoneCountry?.phone?.template ?? DEFAULT_PHONE_TEMPLATE;

    const rawPhoneDigits = getLocalPhoneDigits(value, phoneCountry);
    const formattedPhoneValue = formatNumberToTemplate(
      rawPhoneDigits,
      phoneTemplate,
    );

    const handleCountrySelect = useCallback(
      (country: Country) => {
        const digits = getLocalPhoneDigits(value, phoneCountry);
        const nextPhonePrefix = country.phone?.prefix ?? '';

        setSelectedCountry(country);
        onChangeText(nextPhonePrefix ? `${nextPhonePrefix}${digits}` : digits);
      },
      [onChangeText, phoneCountry, value],
    );

    const handleCountryPress = useCallback(() => {
      navigation.navigate(
        ...createPhoneCountrySelectorModalNavigationDetails({
          countries,
          selectedCountry: phoneCountry,
          onCountrySelect: handleCountrySelect,
        }),
      );
    }, [countries, handleCountrySelect, navigation, phoneCountry]);

    const handleChangeText = useCallback(
      (text: string) => {
        // A leading `+<digit>` or a `tel:` URI signals a full international
        // number (typed or pasted); strip the country code so it isn't
        // prepended twice. Plain digits are treated as the local part.
        const isFullNumber = /\+\d/.test(text) || /^\s*tel:/i.test(text);
        const digits = isFullNumber
          ? getLocalPhoneDigits(text, phoneCountry)
          : text.replace(/\D/g, '');
        const nextNumber = phonePrefix ? `${phonePrefix}${digits}` : digits;
        // Compare local digit counts (not the prefixed number) so a large
        // jump reads as autofill — a single keystroke must never advance.
        const previousDigits = getLocalPhoneDigits(value, phoneCountry);
        const isAutofill = digits.length - previousDigits.length > 1;

        onChangeText(nextNumber);

        if (isAutofill) {
          onSubmitEditing?.();
        }
      },
      [onChangeText, onSubmitEditing, phoneCountry, phonePrefix, value],
    );

    return (
      <DepositTextField
        label={label}
        placeholder={
          phoneCountry?.phone?.placeholder ??
          strings('deposit.basic_info.enter_phone_number')
        }
        value={formattedPhoneValue}
        onChangeText={handleChangeText}
        error={error}
        ref={ref}
        testID={testID}
        onSubmitEditing={onSubmitEditing}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        startAccessory={
          phoneCountry || countries.length > 0 ? (
            <TouchableOpacity
              onPress={handleCountryPress}
              accessibilityRole="button"
              accessible
              style={styles.phoneFlagRow}
              testID={countrySelectorTestID}
            >
              {phoneCountry?.flag ? (
                <Text style={styles.phoneFlagEmoji}>{phoneCountry.flag}</Text>
              ) : null}
              {phonePrefix ? (
                <Text style={styles.phonePrefix}>{phonePrefix}</Text>
              ) : null}
            </TouchableOpacity>
          ) : undefined
        }
      />
    );
  },
);

export default PhoneField;
