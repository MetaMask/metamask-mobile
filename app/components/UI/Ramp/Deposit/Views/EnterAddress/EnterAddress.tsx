import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TextInput, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
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
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import PoweredByTransak from '../../components/PoweredByTransak';
import { BasicInfoFormData } from '../BasicInfo/BasicInfo';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import PrivacySection from '../../components/PrivacySection';
import { useDepositSDK } from '../../sdk';
import StateSelector from '../../components/StateSelector';
import { useDepositRouting } from '../../hooks/useDepositRouting';
import { VALIDATION_REGEX } from '../../constants/constants';
import Logger from '../../../../../../util/Logger';
import useAnalytics from '../../../hooks/useAnalytics';
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';

export interface EnterAddressParams {
  previousFormData?: BasicInfoFormData & AddressFormData;
  quote: BuyQuote;
}

export const createEnterAddressNavDetails =
  createNavigationDetails<EnterAddressParams>(Routes.DEPOSIT.ENTER_ADDRESS);

export interface AddressFormData {
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
  const { quote, previousFormData } = useParams<EnterAddressParams>();
  const { selectedRegion } = useDepositSDK();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trackEvent = useAnalytics();

  const addressLine1InputRef = useRef<TextInput>(null);
  const addressLine2InputRef = useRef<TextInput>(null);
  const cityInputRef = useRef<TextInput>(null);
  const stateInputRef = useRef<TextInput>(null);
  const postCodeInputRef = useRef<TextInput>(null);

  const { routeAfterAuthentication } = useDepositRouting({
    screenLocation: 'EnterAddress Screen',
  });

  const initialFormData: AddressFormData = {
    addressLine1: previousFormData?.addressLine1 || '',
    addressLine2: previousFormData?.addressLine2 || '',
    state: previousFormData?.state || '',
    city: previousFormData?.city || '',
    postCode: previousFormData?.postCode || '',
    countryCode: previousFormData?.countryCode || selectedRegion?.isoCode || '',
  };

  const validateForm = (data: AddressFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.addressLine1.trim()) {
      errors.addressLine1 = strings(
        'deposit.enter_address.address_line_1_required',
      );
    } else if (!VALIDATION_REGEX.addressLine1.test(data.addressLine1)) {
      errors.addressLine1 = strings(
        'deposit.enter_address.address_line_1_invalid',
      );
    }

    if (
      data.addressLine2.trim() &&
      !VALIDATION_REGEX.addressLine2.test(data.addressLine2)
    ) {
      errors.addressLine2 = strings(
        'deposit.enter_address.address_line_2_invalid',
      );
    }

    if (!data.city.trim()) {
      errors.city = strings('deposit.enter_address.city_required');
    } else if (!VALIDATION_REGEX.city.test(data.city)) {
      errors.city = strings('deposit.enter_address.city_invalid');
    }

    if (selectedRegion?.isoCode === 'US') {
      if (!data.state.trim()) {
        errors.state = strings('deposit.enter_address.state_required');
      } else if (!VALIDATION_REGEX.state.test(data.state)) {
        errors.state = strings('deposit.enter_address.state_invalid');
      }
    }

    if (!data.postCode.trim()) {
      errors.postCode = strings('deposit.enter_address.postal_code_required');
    } else if (!VALIDATION_REGEX.postCode.test(data.postCode)) {
      errors.postCode = strings('deposit.enter_address.postal_code_invalid');
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
        setError(null);
        const currentValue = formData[field];
        const isAutofill = value.length - currentValue.length > 1;

        handleFormDataChange(field)(value);

        if (isAutofill && nextAction) {
          nextAction();
        }
      },
    [formData, handleFormDataChange],
  );

  const [, postKycForm] = useDepositSdkMethod({
    method: 'patchUser',
    onMount: false,
    throws: true,
  });

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.enter_address.navbar_title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const handleOnPressContinue = useCallback(async () => {
    if (!validateFormData()) return;

    // Clear any previous errors when retrying
    setError(null);

    trackEvent('RAMPS_ADDRESS_ENTERED', {
      region: selectedRegion?.isoCode || '',
      ramp_type: 'DEPOSIT',
      kyc_type: 'SIMPLE',
    });

    try {
      setLoading(true);
      await postKycForm({
        addressDetails: formData,
      });

      await routeAfterAuthentication(quote);
    } catch (submissionError) {
      setLoading(false);
      setError(
        submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : strings('deposit.enter_address.unexpected_error'),
      );
      Logger.error(
        submissionError as Error,
        'Unexpected error during form submission',
      );
    } finally {
      setLoading(false);
    }
  }, [
    validateFormData,
    formData,
    postKycForm,
    quote,
    routeAfterAuthentication,
    selectedRegion?.isoCode,
    trackEvent,
  ]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenLayout.Content grow>
            <DepositProgressBar steps={4} currentStep={3} />
            <View style={styles.textContainer}>
              <Text variant={TextVariant.HeadingLG}>
                {strings('deposit.enter_address.title')}
              </Text>
              <Text style={styles.subtitle}>
                {strings('deposit.enter_address.subtitle')}
              </Text>
            </View>
            {error && (
              <View style={styles.errorContainer}>
                <BannerAlert
                  description={error}
                  severity={BannerAlertSeverity.Error}
                />
              </View>
            )}

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
                  testID="state-input"
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
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <DepositTextField
                label={strings('deposit.enter_address.country')}
                placeholder={strings('deposit.enter_address.country')}
                value={selectedRegion?.name || ''}
                error={errors.countryCode}
                returnKeyType="done"
                testID="country-input"
                containerStyle={styles.nameInputContainer}
                isDisabled
                startAccessory={
                  <Text style={styles.countryFlag}>{selectedRegion?.flag}</Text>
                }
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
              isDisabled={loading || !!error}
              loading={loading}
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
