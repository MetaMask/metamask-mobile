import React, { useCallback, forwardRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import TouchableOpacity from '../../../../../Base/TouchableOpacity';
import { useNavigation } from '@react-navigation/native';

import Text from '../../../../../../component-library/components/Texts/Text';
import { Theme } from '../../../../../../util/theme/models';
import { useStyles } from '../../../../../../component-library/hooks';
import { formatNumberToTemplate } from './formatNumberToTemplate.ts';
import { DepositRegion } from '@consensys/native-ramps-sdk';
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
  regions: DepositRegion[];
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
  (
    { label, value = '', onChangeText, error, onSubmitEditing, regions },
    ref,
  ) => {
    const { styles } = useStyles(styleSheet, {});
    const { selectedRegion } = useDepositSDK();

    const [phoneRegion, setPhoneRegion] = useState(selectedRegion);

    const navigation = useNavigation();
    const template = phoneRegion?.phone?.template ?? '(XXX) XXX-XXXX';

    const rawDigits = phoneRegion?.phone?.prefix
      ? value
          .replace(/\D/g, '')
          .replace(
            new RegExp(`^${phoneRegion.phone.prefix.replace(/\D/g, '')}`),
            '',
          )
      : value.replace(/\D/g, '');
    const formattedValue = formatNumberToTemplate(rawDigits, template);

    const handleChangeText = useCallback(
      (text: string) => {
        const digits = text.replace(/\D/g, '');

        if (phoneRegion?.phone?.prefix) {
          const fullNumber = phoneRegion.phone.prefix + digits;
          onChangeText(fullNumber);
        } else {
          onChangeText(digits);
        }
      },
      [onChangeText, phoneRegion],
    );

    const handleFlagPress = useCallback(() => {
      navigation.navigate(
        ...createRegionSelectorModalNavigationDetails({
          regions,
          onRegionSelect: setPhoneRegion,
          selectedRegion: phoneRegion,
          allRegionsSelectable: true,
          updateGlobalRegion: false,
          trackSelection: false,
        }),
      );
    }, [navigation, regions, setPhoneRegion, phoneRegion]);

    const countryPrefixAccessory = (
      <TouchableOpacity
        onPress={handleFlagPress}
        accessibilityRole="button"
        accessible
        style={styles.countryPrefix}
      >
        <Text style={styles.countryFlag}>{phoneRegion?.flag ?? '🌍'}</Text>
        <Text style={styles.countryCallingCode}>
          {phoneRegion?.phone?.prefix ??
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
          phoneRegion?.phone?.placeholder ??
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
