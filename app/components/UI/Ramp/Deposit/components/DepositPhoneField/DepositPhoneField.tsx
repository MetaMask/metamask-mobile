import React, { useCallback, useMemo, forwardRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';

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
import { formatNumberToTemplate } from './formatNumberToTemplate.ts';
import { DepositRegion } from '../../constants';
import { useDepositSDK } from '../../sdk';
import { createRegionSelectorModalNavigationDetails } from '../../Views/Modals/RegionSelectorModal';

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
      flexDirection: 'row',
      alignItems: 'center',
    },
    countryFlag: {
      fontSize: 16,
    },
    countryCallingCode: {
      fontSize: 14,
      color: theme.colors.text.muted,
      marginLeft: 4,
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
    const navigation = useNavigation();
    const template = selectedRegion?.template || '(XXX) XXX-XXXX';

    const rawDigits = value
      .replace(/\D/g, '')
      .replace(
        new RegExp(`^${selectedRegion?.phonePrefix?.replace(/\D/g, '')}`),
        '',
      );
    const formattedValue = formatNumberToTemplate(rawDigits, template);

    const handleChangeText = useCallback(
      (text: string) => {
        if (!selectedRegion) {
          return;
        }
        const digits = text.replace(/\D/g, '');
        const fullNumber = selectedRegion.phonePrefix + digits;
        onChangeText(fullNumber);
      },
      [onChangeText, selectedRegion?.phonePrefix],
    );

    const handleRegionSelect = useCallback(
      (newRegion: DepositRegion) => {
        if (!newRegion.supported) {
          return;
        }
        onChangeText('');
        setSelectedRegion(newRegion);
      },
      [setSelectedRegion, onChangeText],
    );

    const handleFlagPress = useCallback(() => {
      navigation.navigate(
        ...createRegionSelectorModalNavigationDetails({
          selectedRegionCode: selectedRegion?.code,
          handleSelectRegion: handleRegionSelect,
        }),
      );
    }, [navigation, selectedRegion, handleRegionSelect]);

    return (
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
              <Text style={styles.countryCallingCode}>
                {selectedRegion?.phonePrefix}
              </Text>
            </TouchableOpacity>
            <TextInput
              testID="deposit-phone-field-test-id"
              keyboardType="phone-pad"
              placeholderTextColor={theme.colors?.text.muted}
              style={styles.textFieldInput}
              value={formattedValue}
              onChangeText={handleChangeText}
              placeholder={selectedRegion?.placeholder || 'Enter phone number'}
              ref={ref}
              autoFocus={false}
              onSubmitEditing={onSubmitEditing}
              returnKeyType="next"
            />
          </View>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  },
);

export default DepositPhoneField;
