import React, { useCallback, useEffect, useRef } from 'react';
import { View, TextInput, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../../../../component-library/components/Texts/Text';
import StyledButton from '../../../../StyledButton';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import Row from '../../../Aggregator/components/Row';
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
  ssn: string;
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
    dob: '',
    ssn: '',
  };

  const validateForm = (
    formData: BasicInfoFormData,
  ): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.mobileNumber.trim()) {
      errors.mobileNumber = 'Phone number is required';
    }

    if (!formData.dob.trim()) {
      errors.dob = 'Date of birth is required';
    }

    if (selectedRegion?.isoCode === 'US' && !formData.ssn.trim()) {
      errors.ssn = 'Social security number is required';
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
          formData,
          quote,
          kycUrl,
        }),
      );
    }
  }, [navigation, validateFormData, formData, quote, kycUrl]);

  const handleSubmitEditing = useCallback(
    (nextRef: React.RefObject<TextInput>) => () => {
      nextRef.current?.focus();
    },
    [],
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
                onChangeText={handleFormDataChange('firstName')}
                error={errors.firstName}
                returnKeyType="next"
                testID="first-name-input"
                containerStyle={styles.nameInputContainer}
                ref={firstNameInputRef}
                autoComplete="given-name"
                textContentType="givenName"
                autoCapitalize="words"
                onSubmitEditing={handleSubmitEditing(lastNameInputRef)}
              />

              <DepositTextField
                label={strings('deposit.basic_info.last_name')}
                placeholder="Smith"
                value={formData.lastName}
                onChangeText={handleFormDataChange('lastName')}
                error={errors.lastName}
                returnKeyType="next"
                testID="last-name-input"
                containerStyle={styles.nameInputContainer}
                ref={lastNameInputRef}
                autoComplete="family-name"
                textContentType="familyName"
                autoCapitalize="words"
                onSubmitEditing={handleSubmitEditing(phoneInputRef)}
              />
            </View>

            <DepositPhoneField
              label={strings('deposit.basic_info.phone_number')}
              value={formData.mobileNumber}
              onChangeText={handleFormDataChange('mobileNumber')}
              error={errors.mobileNumber}
              ref={phoneInputRef}
              onSubmitEditing={handleSubmitEditing(dateInputRef)}
            />

            <DepositDateField
              label={strings('deposit.basic_info.date_of_birth')}
              value={formData.dob}
              onChangeText={handleFormDataChange('dob')}
              error={errors.dob}
              onSubmitEditing={() => {
                if (selectedRegion?.isoCode === 'US') {
                  handleSubmitEditing(ssnInputRef)();
                } else {
                  Keyboard.dismiss();
                }
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
                value={formData.ssn}
                onChangeText={handleFormDataChange('ssn')}
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
                  handleOnPressContinue();
                }}
              />
            )}
          </ScreenLayout.Content>
        </KeyboardAwareScrollView>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Row>
            <StyledButton
              type="confirm"
              onPress={handleOnPressContinue}
              testID="continue-button"
            >
              {strings('deposit.basic_info.continue')}
            </StyledButton>
          </Row>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default BasicInfo;
