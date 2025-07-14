import React, { useCallback, useEffect, useRef } from 'react';
import { View, TextInput, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../../../../component-library/components/Texts/Text';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './BasicInfo.styles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import DepositTextField from '../../components/DepositTextField';
import { useForm } from '../../hooks/useForm';
import DepositPhoneField from '../../components/DepositPhoneField';
import DepositProgressBar from '../../components/DepositProgressBar';
import DepositDateField from '../../components/DepositDateField';
import { createEnterAddressNavDetails } from '../EnterAddress/EnterAddress';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { useDepositSDK } from '../../sdk';
import { VALIDATION_REGEX } from '../../constants/constants';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import PoweredByTransak from '../../components/PoweredByTransak';
import PrivacySection from '../../components/PrivacySection';
import { timestampToTransakFormat } from '../../utils';

export interface BasicInfoParams {
  quote: BuyQuote;
  kycUrl?: string;
}

export const createBasicInfoNavDetails =
  createNavigationDetails<BasicInfoParams>(Routes.DEPOSIT.BASIC_INFO);

export interface BasicInfoFormData {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  dob: string;
  ssn?: string;
}

const BasicInfo = (): JSX.Element => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { quote, kycUrl } = useParams<BasicInfoParams>();
  const { selectedRegion } = useDepositSDK();

  const firstNameInputRef = useRef<TextInput>(null);
  const lastNameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const dateInputRef = useRef<TextInput>(null);
  const ssnInputRef = useRef<TextInput>(null);

  const initialFormData: BasicInfoFormData = {
    firstName: '',
    lastName: '',
    mobileNumber: '',
    dob: new Date(2000, 0, 1).getTime().toString(),
    ssn: '',
  };

  const validateForm = (
    formData: BasicInfoFormData,
  ): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = strings('deposit.basic_info.first_name_required');
    } else if (!VALIDATION_REGEX.firstName.test(formData.firstName)) {
      errors.firstName = strings('deposit.basic_info.first_name_invalid');
    }

    if (!formData.lastName.trim()) {
      errors.lastName = strings('deposit.basic_info.last_name_required');
    } else if (!VALIDATION_REGEX.lastName.test(formData.lastName)) {
      errors.lastName = strings('deposit.basic_info.last_name_invalid');
    }

    if (!formData.mobileNumber.trim()) {
      errors.mobileNumber = strings(
        'deposit.basic_info.mobile_number_required',
      );
    } else if (!VALIDATION_REGEX.mobileNumber.test(formData.mobileNumber)) {
      errors.mobileNumber = strings('deposit.basic_info.mobile_number_invalid');
    }

    const transakFormattedDate = timestampToTransakFormat(formData.dob);

    if (!transakFormattedDate.trim()) {
      errors.dob = strings('deposit.basic_info.dob_required');
    } else if (!VALIDATION_REGEX.dateOfBirth.test(transakFormattedDate)) {
      errors.dob = strings('deposit.basic_info.dob_invalid');
    }

    if (selectedRegion?.isoCode === 'US' && !formData.ssn?.trim()) {
      errors.ssn = strings('deposit.basic_info.ssn_required');
    }

    return errors;
  };

  const { formData, errors, handleChange, validateFormData } =
    useForm<BasicInfoFormData>({
      initialFormData,
      validateForm,
    });

  const handleFormDataChange = useCallback(
    (field: keyof BasicInfoFormData) => (value: string) => {
      handleChange(field, value);
    },
    [handleChange],
  );

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.basic_info.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const handleOnPressContinue = useCallback(() => {
    if (validateFormData()) {
      navigation.navigate(
        ...createEnterAddressNavDetails({
          formData: {
            ...formData,
            dob: timestampToTransakFormat(formData.dob),
          },
          quote,
          kycUrl,
        }),
      );
    }
  }, [navigation, validateFormData, formData, quote, kycUrl]);

  const focusNextField = useCallback(
    (nextRef: React.RefObject<TextInput>) => () => {
      nextRef.current?.focus();
    },
    [],
  );

  const handleFieldChange = useCallback(
    (field: keyof BasicInfoFormData, nextAction?: () => void) =>
      (value: string) => {
        const currentValue = formData[field] || '';
        const isAutofill = value.length - currentValue.length > 1;

        handleFormDataChange(field)(value);

        if (isAutofill && nextAction) {
          nextAction();
        }
      },
    [formData, handleFormDataChange],
  );

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenLayout.Content>
            <DepositProgressBar steps={4} currentStep={2} />
            <Text style={styles.subtitle}>
              {strings('deposit.basic_info.subtitle')}
            </Text>

            <View style={styles.nameInputRow}>
              <DepositTextField
                label={strings('deposit.basic_info.first_name')}
                placeholder="John"
                value={formData.firstName}
                onChangeText={handleFieldChange(
                  'firstName',
                  focusNextField(lastNameInputRef),
                )}
                error={errors.firstName}
                returnKeyType="next"
                testID="first-name-input"
                containerStyle={styles.nameInputContainer}
                ref={firstNameInputRef}
                autoComplete="given-name"
                textContentType="givenName"
                autoCapitalize="words"
                onSubmitEditing={focusNextField(lastNameInputRef)}
              />

              <DepositTextField
                label={strings('deposit.basic_info.last_name')}
                placeholder="Smith"
                value={formData.lastName}
                onChangeText={handleFieldChange(
                  'lastName',
                  focusNextField(phoneInputRef),
                )}
                error={errors.lastName}
                returnKeyType="next"
                testID="last-name-input"
                containerStyle={styles.nameInputContainer}
                ref={lastNameInputRef}
                autoComplete="family-name"
                textContentType="familyName"
                autoCapitalize="words"
                onSubmitEditing={focusNextField(phoneInputRef)}
              />
            </View>

            <DepositPhoneField
              label={strings('deposit.basic_info.phone_number')}
              value={formData.mobileNumber}
              onChangeText={handleFieldChange(
                'mobileNumber',
                focusNextField(dateInputRef),
              )}
              error={errors.mobileNumber}
              ref={phoneInputRef}
              onSubmitEditing={focusNextField(dateInputRef)}
            />

            <DepositDateField
              label={strings('deposit.basic_info.date_of_birth')}
              value={formData.dob}
              onChangeText={handleFieldChange('dob', () => {
                if (selectedRegion?.isoCode === 'US') {
                  focusNextField(ssnInputRef)();
                } else {
                  Keyboard.dismiss();
                }
              })}
              error={errors.dob}
              onSubmitEditing={() => {
                if (selectedRegion?.isoCode === 'US') {
                  focusNextField(ssnInputRef)();
                } else {
                  Keyboard.dismiss();
                }
              }}
              handleOnPress={() => {
                Keyboard.dismiss();
                firstNameInputRef.current?.blur();
                lastNameInputRef.current?.blur();
                phoneInputRef.current?.blur();
                ssnInputRef.current?.blur();
              }}
              ref={dateInputRef}
              textFieldProps={{
                testID: 'date-of-birth-input',
              }}
            />
            {selectedRegion?.isoCode === 'US' && (
              <DepositTextField
                label={strings('deposit.basic_info.social_security_number')}
                placeholder="XXX-XX-XXXX"
                value={formData.ssn || ''}
                onChangeText={handleFieldChange('ssn')}
                error={errors.ssn}
                returnKeyType="done"
                testID="ssn-input"
                ref={ssnInputRef}
                autoComplete="off"
                textContentType="none"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={11}
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                }}
              />
            )}
          </ScreenLayout.Content>
        </KeyboardAwareScrollView>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          <PrivacySection />
          <Button
            size={ButtonSize.Lg}
            onPress={handleOnPressContinue}
            label={strings('deposit.basic_info.continue')}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            testID="continue-button"
          />
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default BasicInfo;
