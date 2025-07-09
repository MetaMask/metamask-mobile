import React, { useCallback, useEffect, useRef } from 'react';
import { View, TextInput, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Text from '../../../../../../component-library/components/Texts/Text';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './EnterAddress.styles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import DepositTextField from '../../components/DepositTextField';
import { useForm } from '../../hooks/useForm';
import DepositProgressBar from '../../components/DepositProgressBar';
import { BasicInfoFormData } from '../BasicInfo/BasicInfo';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { createKycProcessingNavDetails } from '../KycProcessing/KycProcessing';
import { createKycWebviewNavDetails } from '../KycWebview/KycWebview';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import PoweredByTransak from '../../components/PoweredByTransak';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import PrivacySection from '../../components/PrivacySection';
import { useDepositSDK } from '../../sdk';
import StateSelector from '../../components/StateSelector';

export interface EnterAddressParams {
  formData: BasicInfoFormData;
  quote: BuyQuote;
  kycUrl?: string;
}

export const createEnterAddressNavDetails =
  createNavigationDetails<EnterAddressParams>(Routes.DEPOSIT.ENTER_ADDRESS);

interface AddressFormData {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postCode: string;
  countryCode: string;
}

const EnterAddress = (): JSX.Element => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const {
    formData: basicInfoFormData,
    quote,
    kycUrl,
  } = useParams<EnterAddressParams>();
  const { selectedRegion } = useDepositSDK();

  const addressLine1InputRef = useRef<TextInput>(null);
  const addressLine2InputRef = useRef<TextInput>(null);
  const cityInputRef = useRef<TextInput>(null);
  const stateInputRef = useRef<TextInput>(null);
  const postCodeInputRef = useRef<TextInput>(null);

  const initialFormData: AddressFormData = {
    addressLine1: '',
    addressLine2: '',
    state: '',
    city: '',
    postCode: '',
    countryCode: selectedRegion?.isoCode || '',
  };

  const validateForm = (data: AddressFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.addressLine1.trim()) {
      errors.addressLine1 = strings('deposit.enter_address.address_line_1_required');
    } else {
      const addressLine1Regex = /^(?!\s+$)(?=.*[a-zA-Z]).{3,50}$/;
      if (!addressLine1Regex.test(data.addressLine1)) {
        errors.addressLine1 = strings('deposit.enter_address.address_line_1_invalid');
      }
    }

    if (data.addressLine2.trim()) {
      const addressLine2Regex = /^(?=.*[a-zA-Z]).{0,50}$|^\s*$/;
      if (!addressLine2Regex.test(data.addressLine2)) {
        errors.addressLine2 = strings('deposit.enter_address.address_line_2_invalid');
      }
    }

    if (!data.city.trim()) {
      errors.city = strings('deposit.enter_address.city_required');
    } else {
      const cityRegex = /^(?!\s+$)(?=.*[a-zA-Z]).{2,25}$/;
      if (!cityRegex.test(data.city)) {
        errors.city = strings('deposit.enter_address.city_invalid');
      }
    }

    if (selectedRegion?.isoCode === 'US') {
      if (!data.state.trim()) {
        errors.state = strings('deposit.enter_address.state_required');
      } else {
        const stateRegex = /^(?!\s+$)(?=.*[a-zA-Z]).{2,100}$/;
        if (!stateRegex.test(data.state)) {
          errors.state = strings('deposit.enter_address.state_invalid');
        }
      }
    }

    if (!data.postCode.trim()) {
      errors.postCode = strings('deposit.enter_address.postal_code_required');
    } else {
      const postCodeRegex = /^(?!s*$).+/;
      if (!postCodeRegex.test(data.postCode)) {
        errors.postCode = strings('deposit.enter_address.postal_code_required');
      }
    }

    return errors;
  };

  const { formData, errors, handleChange, validateFormData } =
    useForm<AddressFormData>({
      initialFormData,
      validateForm,
    });

  const handleFormDataChange = useCallback(
    (field: keyof AddressFormData) => (value: string) => {
      handleChange(field, value);
    },
    [handleChange],
  );

  const focusNextField = useCallback(
    (nextRef: React.RefObject<TextInput>) => () => {
      nextRef.current?.focus();
    },
    [],
  );

  const handleFieldChange = useCallback(
    (field: keyof AddressFormData, nextAction?: () => void) =>
      (value: string) => {
        const currentValue = formData[field];
        const isAutofill = value.length - currentValue.length > 1;

        handleFormDataChange(field)(value);

        if (isAutofill && nextAction) {
          nextAction();
        }
      },
    [formData, handleFormDataChange],
  );

  const [{ error: kycError, isFetching: kycIsFetching }, postKycForm] =
    useDepositSdkMethod({
      method: 'patchUser',
      onMount: false,
    });

  const [
    { error: purposeError, isFetching: purposeIsFetching },
    submitPurpose,
  ] = useDepositSdkMethod(
    {
      method: 'submitPurposeOfUsageForm',
      onMount: false,
    },
    ['Buying/selling crypto for investments'],
  );

  const [{ error: ssnError, isFetching: ssnIsFetching }, submitSsnDetails] =
    useDepositSdkMethod({ method: 'submitSsnDetails', onMount: false });

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.enter_address.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const handleOnPressContinue = useCallback(async () => {
    if (!validateFormData()) return;

    try {
      const combinedFormData = {
        ...basicInfoFormData,
        ...formData,
      };
      await postKycForm(combinedFormData);

      if (kycError) {
        console.error('KYC form submission failed:', kycError);
        return;
      }

      if (basicInfoFormData.ssn) {
        await submitSsnDetails(basicInfoFormData.ssn);

        if (ssnError) {
          console.error('SSN submission failed:', ssnError);
          return;
        }
      }

      await submitPurpose();

      if (purposeError) {
        console.error('Purpose submission failed:', purposeError);
        return;
      }

      if (kycUrl) {
        navigation.navigate(...createKycWebviewNavDetails({ quote, kycUrl }));
      } else {
        navigation.navigate(...createKycProcessingNavDetails({ quote }));
      }
    } catch (error) {
      console.error('Unexpected error during form submission:', error);
    }
  }, [
    validateFormData,
    basicInfoFormData,
    formData,
    postKycForm,
    kycError,
    submitPurpose,
    purposeError,
    navigation,
    quote,
    kycUrl,
    submitSsnDetails,
    ssnError,
  ]);

  const countryFlagAccessory = (
    <Text style={styles.countryFlag}>{selectedRegion?.flag}</Text>
  );

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenLayout.Content grow>
            <DepositProgressBar steps={4} currentStep={3} />
            <Text style={styles.subtitle}>
              {strings('deposit.enter_address.subtitle')}
            </Text>

            <DepositTextField
              label={strings('deposit.enter_address.address_line_1')}
              placeholder={strings('deposit.enter_address.address_line_1')}
              value={formData.addressLine1}
              onChangeText={handleFieldChange(
                'addressLine1',
                focusNextField(addressLine2InputRef),
              )}
              error={errors.addressLine1}
              returnKeyType="next"
              testID="address-line-1-input"
              ref={addressLine1InputRef}
              autoComplete="address-line1"
              textContentType="fullStreetAddress"
              autoCapitalize="words"
              onSubmitEditing={focusNextField(addressLine2InputRef)}
            />

            <DepositTextField
              label={strings('deposit.enter_address.address_line_2')}
              placeholder={strings('deposit.enter_address.address_line_2')}
              value={formData.addressLine2}
              onChangeText={handleFieldChange(
                'addressLine2',
                focusNextField(cityInputRef),
              )}
              error={errors.addressLine2}
              returnKeyType="next"
              testID="address-line-2-input"
              ref={addressLine2InputRef}
              autoComplete="address-line2"
              textContentType="fullStreetAddress"
              autoCapitalize="words"
              onSubmitEditing={focusNextField(cityInputRef)}
            />

            <View style={styles.nameInputRow}>
              <DepositTextField
                label={strings('deposit.enter_address.city')}
                placeholder={strings('deposit.enter_address.city')}
                value={formData.city}
                onChangeText={handleFieldChange(
                  'city',
                  focusNextField(stateInputRef),
                )}
                error={errors.city}
                returnKeyType="next"
                testID="city-input"
                containerStyle={styles.nameInputContainer}
                ref={cityInputRef}
                textContentType="addressCity"
                autoCapitalize="words"
                onSubmitEditing={focusNextField(stateInputRef)}
              />

              {selectedRegion?.isoCode === 'US' ? (
                <StateSelector
                  label={strings('deposit.enter_address.state')}
                  selectedValue={formData.state}
                  onValueChange={handleFormDataChange('state')}
                  error={errors.state}
                  containerStyle={styles.nameInputContainer}
                  defaultValue={strings('deposit.enter_address.select_state')}
                />
              ) : (
                <DepositTextField
                  label={strings('deposit.enter_address.state')}
                  placeholder={strings('deposit.enter_address.state')}
                  value={formData.state}
                  onChangeText={handleFieldChange(
                    'state',
                    focusNextField(postCodeInputRef),
                  )}
                  error={errors.state}
                  returnKeyType="next"
                  testID="state-input"
                  containerStyle={styles.nameInputContainer}
                  ref={stateInputRef}
                  textContentType="addressState"
                  autoCapitalize="words"
                  onSubmitEditing={focusNextField(postCodeInputRef)}
                />
              )}
            </View>

            <View style={styles.nameInputRow}>
              <DepositTextField
                label={strings('deposit.enter_address.postal_code')}
                placeholder={strings('deposit.enter_address.postal_code')}
                value={formData.postCode}
                onChangeText={handleFieldChange('postCode', () => {
                  Keyboard.dismiss();
                })}
                error={errors.postCode}
                returnKeyType="done"
                testID="postal-code-input"
                containerStyle={styles.nameInputContainer}
                ref={postCodeInputRef}
                autoComplete="postal-code"
                textContentType="postalCode"
                keyboardType="number-pad"
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                }}
              />

              <DepositTextField
                label={strings('deposit.enter_address.country')}
                placeholder={strings('deposit.enter_address.country')}
                value={selectedRegion?.name || ''}
                onChangeText={() => {}}
                error={errors.countryCode}
                returnKeyType="done"
                testID="country-input"
                containerStyle={styles.nameInputContainer}
                isDisabled={true}
                startAccessory={countryFlagAccessory}
              />
            </View>
          </ScreenLayout.Content>
        </KeyboardAwareScrollView>
        <ScreenLayout.Footer>
          <ScreenLayout.Content style={styles.footerContent}>
            <PrivacySection />
            <Button
              size={ButtonSize.Lg}
              onPress={handleOnPressContinue}
              label={strings('deposit.enter_address.continue')}
              variant={ButtonVariants.Primary}
              width={ButtonWidthTypes.Full}
              isDisabled={kycIsFetching || purposeIsFetching || ssnIsFetching}
              loading={kycIsFetching || purposeIsFetching || ssnIsFetching}
              testID="address-continue-button"
            />
            <PoweredByTransak name="powered-by-transak-logo" />
          </ScreenLayout.Content>
        </ScreenLayout.Footer>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
};

export default EnterAddress;
