import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
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
import { AsYouType, CountryCode } from 'libphonenumber-js';
import PhoneFormatter from '../../utils/PhoneFormatter';
import { DepositRegion, DEPOSIT_REGIONS } from '../../constants';
import RegionModal from '../RegionModal/RegionModal';
import { useDepositSDK } from '../../sdk';
import { strings } from '../../../../../../../locales/i18n';
import Input from '../../../../../../component-library/components/Form/TextField/foundation/Input/Input';
import { composeProviders } from 'redux-saga-test-plan/providers';

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
  const hasInitializedRef = useRef(false);

  // Initialize PhoneFormatter
  const phoneFormatter = useRef<PhoneFormatter>();

  useEffect(() => {
    phoneFormatter.current = new PhoneFormatter();
    setDisplayValue('');
    handlePhoneNumberChange('');
  }, [selectedRegion?.code]);

  const handlePhoneNumberChange = useCallback(
    (newValue: string) => {
      if (!phoneFormatter.current || !selectedRegion?.code) return;

      // Always scrub to digits only before formatting
      const digitsOnly = newValue.replace(/\D/g, '');

      // For US, only apply AsYouType formatting when there are 4 or more digits
      if (selectedRegion.code === 'US') {
        if (digitsOnly.length >= 4) {
          const formatResult = phoneFormatter.current.formatAsYouType(
            digitsOnly,
            selectedRegion.code,
          );
          console.log('formatResult', formatResult);
          setDisplayValue(formatResult.text);
        } else {
          // For US with 3 or fewer digits, just use the raw input
          setDisplayValue(newValue);
        }
      } else {
        // For non-US countries, always apply formatting
        const formatResult = phoneFormatter.current.formatAsYouType(
          digitsOnly,
          selectedRegion.code,
        );
        console.log('formatResult', formatResult);

        setDisplayValue(formatResult.text);
      }

      const e164Value = phoneFormatter.current.formatE164(
        digitsOnly,
        selectedRegion.code,
      );
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

      // When region changes, clear the current input and let user start fresh
      setDisplayValue('');
      onChangeText('');
      setSelectedRegion(newRegion);
      setIsRegionModalVisible(false);
    },
    [setSelectedRegion, onChangeText],
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
