import React, { useState, useCallback, useMemo, forwardRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';

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
import { formatNumberToTemplate } from './formatNumberToTemplate.ts';
import { DepositRegion, DEPOSIT_REGIONS } from '../../constants';
import RegionModal from '../RegionModal/RegionModal';
import { useDepositSDK } from '../../sdk';

interface PhoneFieldProps
  extends Omit<TextFieldProps, 'size' | 'onChangeText'> {
  label: string;
  value?: string;
  onChangeText: (text: string) => void;
  error?: string;
  onSubmitEditing?: () => void;
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
      color: theme.colors.text.default,
      fontSize: 16,
      paddingVertical: 0,
    },
  });
};

const DepositPhoneField = forwardRef<TextInput, PhoneFieldProps>(
  ({ label, value = '', onChangeText, error, onSubmitEditing }, ref) => {
    const { styles, theme } = useStyles(styleSheet, {});
    const { selectedRegion, setSelectedRegion } = useDepositSDK();
    const [isRegionModalVisible, setIsRegionModalVisible] = useState(false);

    const countryCode = (selectedRegion?.code as CountryCode) || 'US';
    const template = selectedRegion?.template || '(XXX) XXX-XXXX';
    const formattedValue = formatNumberToTemplate(value, template);

    const handleChangeText = useCallback((text: string) => {
      const digits = text.replace(/\D/g, '');
      onChangeText(digits);
    }, [onChangeText]);

    const handleFlagPress = useCallback(() => {
      setIsRegionModalVisible(true);
    }, []);

    const handleRegionSelect = useCallback(
      (newRegion: DepositRegion) => {
        if (!newRegion.supported) {
          return;
        }
        onChangeText('');
        setSelectedRegion(newRegion);
        setIsRegionModalVisible(false);
      },
      [setSelectedRegion, onChangeText],
    );

    const hideRegionModal = useCallback(() => {
      setIsRegionModalVisible(false);
    }, []);

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
              <TextInput
                testID="deposit-phone-field-test-id"
                keyboardType="phone-pad"
                placeholderTextColor={theme.colors?.text.muted}
                style={styles.textFieldInput}
                value={formattedValue}
                onChangeText={handleChangeText}
                placeholder={
                  selectedRegion?.placeholder ||
                  'Enter phone number'
                }
                ref={ref}
                autoFocus={false}
                onSubmitEditing={onSubmitEditing}
                returnKeyType="next"
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
  },
);

export default DepositPhoneField;
