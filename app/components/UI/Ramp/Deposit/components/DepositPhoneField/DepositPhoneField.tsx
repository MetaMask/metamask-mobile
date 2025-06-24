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
import { E164Number, CountryCode } from 'libphonenumber-js';
import PhoneInput from 'react-phone-number-input/react-native-input';
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

const InputComponent = forwardRef<TextInput, any>((props, ref) => {
  console.log('renering input component');

  const { styles, theme, selectedRegion, handleFlagPress, ...rest } = props;
  return (
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
        ref={ref}
        testID="deposit-phone-field-test-id"
        keyboardType="phone-pad"
        placeholderTextColor={theme.colors?.text.muted}
        keyboardAppearance={theme.themeAppearance}
        style={styles.textFieldInput}
        isStateStylesDisabled
        {...rest}
      />
    </View>
  );
});

const DepositPhoneField: React.FC<PhoneFieldProps> = ({
  label,
  onChangeText,
  error,
  value,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { selectedRegion, setSelectedRegion } = useDepositSDK();
  const [isRegionModalVisible, setIsRegionModalVisible] = useState(false);

  const handlePhoneNumberChange = useCallback(
    (newValue: E164Number) => {
      onChangeText(newValue);
    },
    [onChangeText],
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
          <PhoneInput
            country={selectedRegion?.code}
            international={selectedRegion?.code !== 'US'}
            value={value}
            onChange={handlePhoneNumberChange}
            placeholder={placeholder}
            keyboardType="phone-pad"
            selectedRegion={selectedRegion}
            handleFlagPress={handleFlagPress}
            styles={styles}
            theme={theme}
            inputComponent={InputComponent}
          />
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
