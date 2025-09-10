import React, { useCallback, forwardRef } from 'react';
import { TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Text from '../../../../../../component-library/components/Texts/Text';
import { Theme } from '../../../../../../util/theme/models';
import { useStyles } from '../../../../../../component-library/hooks';
import { formatNumberToTemplate } from './formatNumberToTemplate.ts';
import { DepositRegion } from '@consensys/native-ramps-sdk/dist/Deposit';
import { useDepositSDK } from '../../sdk';
import { createRegionSelectorModalNavigationDetails } from '../../Views/Modals/RegionSelectorModal';
import DepositTextField from '../DepositTextField/DepositTextField';
import { strings } from '../../../../../../../locales/i18n';

interface PhoneFieldProps {
  label: string;
  value?: string;
  onChangeText: (text: string) => void;
  error?: string;
  onSubmitEditing?: () => void;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    countryPrefix: {
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
  });
};

const DepositPhoneField = forwardRef<TextInput, PhoneFieldProps>(
  ({ label, value = '', onChangeText, error, onSubmitEditing }, ref) => {
    const { styles } = useStyles(styleSheet, {});
    const { selectedRegion, setSelectedRegion } = useDepositSDK();
    const navigation = useNavigation();
    const template = selectedRegion?.phone?.template ?? '(XXX) XXX-XXXX';

    const rawDigits = selectedRegion?.phone?.prefix
      ? value
          .replace(/\D/g, '')
          .replace(
            new RegExp(`^${selectedRegion.phone.prefix.replace(/\D/g, '')}`),
            '',
          )
      : value.replace(/\D/g, '');
    const formattedValue = formatNumberToTemplate(rawDigits, template);

    const handleChangeText = useCallback(
      (text: string) => {
        const digits = text.replace(/\D/g, '');

        if (selectedRegion?.phone?.prefix) {
          const fullNumber = selectedRegion.phone.prefix + digits;
          onChangeText(fullNumber);
        } else {
          onChangeText(digits);
        }
      },
      [onChangeText, selectedRegion],
    );

    const handleRegionSelect = useCallback(
      (newRegion: DepositRegion) => {
        onChangeText('');
        setSelectedRegion(newRegion);
      },
      [setSelectedRegion, onChangeText],
    );

    const handleFlagPress = useCallback(() => {
      navigation.navigate(
        ...createRegionSelectorModalNavigationDetails({
          selectedRegionCode: selectedRegion?.isoCode,
          handleSelectRegion: handleRegionSelect,
        }),
      );
    }, [navigation, selectedRegion, handleRegionSelect]);

    const countryPrefixAccessory = (
      <TouchableOpacity
        onPress={handleFlagPress}
        accessibilityRole="button"
        accessible
        style={styles.countryPrefix}
      >
        <Text style={styles.countryFlag}>{selectedRegion?.flag ?? '🌍'}</Text>
        <Text style={styles.countryCallingCode}>
          {selectedRegion?.phone?.prefix ??
            strings('deposit.basic_info.select_region')}
        </Text>
      </TouchableOpacity>
    );

    return (
      <DepositTextField
        label={label}
        error={error}
        value={formattedValue}
        onChangeText={handleChangeText}
        placeholder={
          selectedRegion?.phone?.placeholder ??
          strings('deposit.basic_info.enter_phone_number')
        }
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        startAccessory={countryPrefixAccessory}
        onSubmitEditing={onSubmitEditing}
        ref={ref}
        testID="deposit-phone-field-test-id"
      />
    );
  },
);

export default DepositPhoneField;
