import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import Label from '../../../../../../component-library/components/Form/Label';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import {
  TextFieldProps,
  TextFieldSize,
} from '../../../../../../component-library/components/Form/TextField/TextField.types';
import { Theme } from '../../../../../../util/theme/models';
import { useStyles } from '../../../../../../component-library/hooks';
import { CountryCode } from 'libphonenumber-js';
import PhoneFormatter from '../../utils/PhoneFormatter/PhoneFormatter';
import minMetadata from 'libphonenumber-js/min/metadata';
import { DepositRegion, DEPOSIT_REGIONS } from '../../constants';
import RegionModal from '../RegionModal/RegionModal';
import { useDepositSDK } from '../../sdk';
import { strings } from '../../../../../../../locales/i18n';
import Input from '../../../../../../component-library/components/Form/TextField/foundation/Input/Input';

interface PhoneFieldProps
  extends Omit<TextFieldProps, 'size' | 'onChangeText'> {
  label: string;
  onChangeText: (text: string) => void;
  error?: string;
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
      flex: 1,
    },
    error: {
      color: theme.colors.error.default,
      fontSize: 12,
      marginTop: 4,
    },
    textFieldWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 8,
      height: Number(TextFieldSize.Lg),
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background.default,
      flex: 1,
    },
    countryPrefix: {
      marginRight: 8,
    },
    countryFlag: {
      fontSize: 16,
    },
    textFieldInput: {
      flex: 1,
    },
  });
};

const DepositPhoneField: React.FC<PhoneFieldProps> = ({
  label,
  onChangeText,
  error,
  value,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { selectedRegion, setSelectedRegion } = useDepositSDK();
  const [isRegionModalVisible, setIsRegionModalVisible] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [previousCountry, setPreviousCountry] = useState<CountryCode | undefined>();
  
  // Initialize PhoneFormatter
  const phoneFormatter = useRef<PhoneFormatter>();
  
  useEffect(() => {
    phoneFormatter.current = new PhoneFormatter(minMetadata, {
      defaultCountry: selectedRegion?.code || 'US',
      useNationalFormat: selectedRegion?.code !== 'US',
    });
  }, []);

  // Handle country change
  useEffect(() => {
    if (phoneFormatter.current && selectedRegion?.code && previousCountry !== selectedRegion.code) {
      const convertedValue = phoneFormatter.current.convertForNewCountry(
        displayValue,
        previousCountry || 'US',
        selectedRegion.code,
        selectedRegion.code !== 'US'
      );
      setDisplayValue(convertedValue);
      setPreviousCountry(selectedRegion.code);
    }
  }, [selectedRegion?.code, previousCountry, displayValue]);

  // Handle initial value
  useEffect(() => {
    if (value && phoneFormatter.current && selectedRegion?.code) {
      const initialDigits = phoneFormatter.current.getInitialPhoneDigits({
        value,
        country: selectedRegion.code,
        international: selectedRegion.code !== 'US',
        useNationalFormat: selectedRegion.code !== 'US',
      });
      setDisplayValue(initialDigits);
    }
  }, [value, selectedRegion?.code]);

  const handlePhoneNumberChange = useCallback(
    (newValue: string) => {
      if (!phoneFormatter.current || !selectedRegion?.code) return;

      // Format the input as user types
      const formatResult = phoneFormatter.current.formatAsYouType(
        newValue,
        selectedRegion.code,
        selectedRegion.code !== 'US' ? 'NATIONAL' : 'NATIONAL'
      );

      setDisplayValue(formatResult.text);
      
      // Convert to E.164 format for the parent component
      const e164Value = phoneFormatter.current.formatE164(formatResult.text, selectedRegion.code);
      onChangeText(e164Value);
    },
    [onChangeText, selectedRegion?.code],
  );

  const handleFlagPress = useCallback(() => {
    setIsRegionModalVisible(true);
  }, []);

  const handleRegionSelect = useCallback(
    (newRegion: DepositRegion) => {
      if (!newRegion.supported) {
        return;
      }
      setSelectedRegion(newRegion);
      setIsRegionModalVisible(false);
    },
    [setSelectedRegion],
  );

  const hideRegionModal = useCallback(() => {
    setIsRegionModalVisible(false);
  }, []);

  const placeholder = useMemo(() => {
    return (
      selectedRegion?.placeholder ||
      strings('deposit.basic_info.enter_phone_number')
    );
  }, [selectedRegion]);

  return (
    <>
      <View style={styles.field}>
        <Label variant={TextVariant.HeadingSMRegular} style={styles.label}>
          {label}
        </Label>
        <View style={styles.phoneInputWrapper}>
          <View style={styles.textFieldWrapper}>
            <TouchableOpacity
              onPress={handleFlagPress}
              accessibilityRole="button"
              accessible
              style={styles.countryPrefix}
            >
              <Text style={styles.countryFlag}>{selectedRegion?.flag}</Text>
            </TouchableOpacity>
            <Input
              testID="deposit-phone-field-test-id"
              keyboardType="phone-pad"
              placeholderTextColor={theme.colors?.text.muted}
              keyboardAppearance={theme.themeAppearance}
              style={styles.textFieldInput}
              isStateStylesDisabled
              value={displayValue}
              onChangeText={handlePhoneNumberChange}
              placeholder={placeholder}
            />
          </View>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <RegionModal
        isVisible={isRegionModalVisible}
        title="Select Region"
        description="Choose your region"
        data={DEPOSIT_REGIONS}
        dismiss={hideRegionModal}
        onRegionPress={handleRegionSelect}
        selectedRegion={selectedRegion}
      />
    </>
  );
};

export default DepositPhoneField;
