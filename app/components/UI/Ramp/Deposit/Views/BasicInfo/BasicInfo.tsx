import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
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
import {
  AddressFormData,
  createEnterAddressNavDetails,
} from '../EnterAddress/EnterAddress';
import { createSsnInfoModalNavigationDetails } from '../Modals/SsnInfoModal';
import { createEnterEmailNavDetails } from '../EnterEmail/EnterEmail';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { useDepositSDK } from '../../sdk';
import { VALIDATION_REGEX } from '../../constants/constants';
import { endTrace, TraceName } from '../../../../../../util/trace';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import PoweredByTransak from '../../components/PoweredByTransak';
import PrivacySection from '../../components/PrivacySection';
import { timestampToTransakFormat } from '../../utils';
import useAnalytics from '../../../hooks/useAnalytics';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import Logger from '../../../../../../util/Logger';
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { useRegions } from '../../hooks/useRegions';
import type { AxiosError } from 'axios';

export interface BasicInfoParams {
  quote: BuyQuote;
  previousFormData?: BasicInfoFormData & AddressFormData;
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
  const trackEvent = useAnalytics();
  const { quote, previousFormData } = useParams<BasicInfoParams>();
  const { selectedRegion, logoutFromProvider } = useDepositSDK();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPhoneRegisteredError, setIsPhoneRegisteredError] = useState(false);

  const firstNameInputRef = useRef<TextInput>(null);
  const lastNameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const dateInputRef = useRef<TextInput>(null);
  const ssnInputRef = useRef<TextInput>(null);

  const utcDateToPrefill = new Date(previousFormData?.dob || '');
  const timestamp = utcDateToPrefill.getTime();
  const localTimestampToUseInternally = isNaN(timestamp)
    ? ''
    : (timestamp + utcDateToPrefill.getTimezoneOffset() * 60 * 1000).toString();

  const initialFormData: BasicInfoFormData = {
    firstName: previousFormData?.firstName || '',
    lastName: previousFormData?.lastName || '',
    mobileNumber: previousFormData?.mobileNumber || '',
    dob: localTimestampToUseInternally,
    ssn: '',
  };

  const { regions } = useRegions();

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

    if (!formData.dob.trim()) {
      errors.dob = strings('deposit.basic_info.dob_required');
    } else {
      const transakFormattedDate = timestampToTransakFormat(formData.dob);
      if (!VALIDATION_REGEX.dateOfBirth.test(transakFormattedDate)) {
        errors.dob = strings('deposit.basic_info.dob_invalid');
      }
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

  const [, postKycForm] = useDepositSdkMethod({
    method: 'patchUser',
    onMount: false,
    throws: true,
  });

  const [, submitSsnDetails] = useDepositSdkMethod({
    method: 'submitSsnDetails',
    onMount: false,
    throws: true,
  });

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.basic_info.navbar_title') },
        theme,
      ),
    );

    endTrace({
      name: TraceName.DepositContinueFlow,
      data: {
        destination: Routes.DEPOSIT.BASIC_INFO,
      },
    });

    endTrace({
      name: TraceName.DepositInputOtp,
      data: {
        destination: Routes.DEPOSIT.BASIC_INFO,
      },
    });
  }, [navigation, theme]);

  // clear ssn field on mount
  useEffect(() => {
    handleFormDataChange('ssn')('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnPressContinue = useCallback(async () => {
    if (!validateFormData()) return;

    // Clear any previous errors when retrying
    setError(null);
    setIsPhoneRegisteredError(false);

    trackEvent('RAMPS_BASIC_INFO_ENTERED', {
      region: selectedRegion?.isoCode || '',
      ramp_type: 'DEPOSIT',
      kyc_type: 'SIMPLE',
    });

    try {
      setLoading(true);
      const { ssn, ...formDataWithoutSsn } = formData;
      await postKycForm({
        personalDetails: {
          ...formDataWithoutSsn,
          dob: formData.dob.trim()
            ? timestampToTransakFormat(formData.dob)
            : '',
        },
      });

      if (ssn) {
        await submitSsnDetails({ ssn, quoteId: quote.quoteId });
      }

      navigation.navigate(
        ...createEnterAddressNavDetails({
          previousFormData,
          quote,
        }),
      );
    } catch (submissionError) {
      const axiosError = submissionError as AxiosError;
      const apiError = (
        axiosError?.response?.data as {
          error?: { errorCode?: number; message?: string };
        }
      )?.error;

      const isPhoneError = apiError?.errorCode === 2020;
      setIsPhoneRegisteredError(isPhoneError);

      const errorMessageText =
        submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : strings('deposit.basic_info.unexpected_error');

      let errorMessage = errorMessageText;
      if (isPhoneError && errorMessageText) {
        // Extract email from message for error code 2020 (phone already registered)
        const emailMatch = errorMessageText.match(/[\w*]+@[\w*]+(?:\.[\w*]+)*/);
        const email = emailMatch ? emailMatch[0] : '';
        if (email) {
          errorMessage = strings(
            'deposit.basic_info.phone_already_registered',
            {
              email,
            },
          );
        }
      }

      setError(errorMessage);
      Logger.error(
        submissionError as Error,
        'Unexpected error during basic info form submission',
      );
    } finally {
      setLoading(false);
    }
  }, [
    validateFormData,
    formData,
    postKycForm,
    submitSsnDetails,
    navigation,
    quote,
    previousFormData,
    selectedRegion?.isoCode,
    trackEvent,
  ]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutFromProvider(false); // false = no server invalidation needed

      // Navigate back to email entry screen
      navigation.navigate(...createEnterEmailNavDetails());
    } catch (logoutError) {
      Logger.error(
        logoutError as Error,
        'Error logging out from BasicInfo error banner',
      );
      // Keep error visible if logout fails
    }
  }, [logoutFromProvider, navigation]);

  const focusNextField = useCallback(
    (nextRef: React.RefObject<TextInput>) => () => {
      nextRef.current?.focus();
    },
    [],
  );

  const handleFieldChange = useCallback(
    (field: keyof BasicInfoFormData, nextAction?: () => void) =>
      (value: string) => {
        setError(null);
        setIsPhoneRegisteredError(false);
        const currentValue = formData[field] || '';
        const isAutofill = value.length - currentValue.length > 1;

        handleFormDataChange(field)(value);

        if (isAutofill && nextAction) {
          nextAction();
        }
      },
    [formData, handleFormDataChange],
  );

  const handleSsnInfoPress = useCallback(() => {
    navigation.navigate(...createSsnInfoModalNavigationDetails());
  }, [navigation]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenLayout.Content>
            <DepositProgressBar steps={4} currentStep={2} />
            <Text variant={TextVariant.HeadingMD} style={styles.title}>
              {strings('deposit.basic_info.title')}
            </Text>
            <Text style={styles.subtitle}>
              {strings('deposit.basic_info.subtitle')}
            </Text>
            {error && (
              <View style={styles.errorContainer}>
                <BannerAlert
                  description={error}
                  severity={BannerAlertSeverity.Error}
                  actionButtonProps={
                    isPhoneRegisteredError
                      ? {
                          variant: ButtonVariants.Link,
                          label: strings('deposit.basic_info.login_with_email'),
                          onPress: handleLogout,
                          labelTextVariant: TextVariant.BodyMD,
                          testID: 'basic-info-logout-button',
                        }
                      : undefined
                  }
                />
              </View>
            )}
            <View style={styles.nameInputRow}>
              <DepositTextField
                label={strings('deposit.basic_info.first_name')}
                placeholder={strings('deposit.basic_info.first_name')}
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
                placeholder={strings('deposit.basic_info.last_name')}
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
              regions={regions || []}
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
                label={
                  <View style={styles.ssnLabel}>
                    <Text variant={TextVariant.BodyMD}>
                      {strings('deposit.basic_info.social_security_number')}
                    </Text>
                    <TouchableOpacity
                      onPress={handleSsnInfoPress}
                      testID="ssn-info-button"
                    >
                      <Icon
                        name={IconName.Info}
                        size={IconSize.Sm}
                        color={IconColor.Alternative}
                      />
                    </TouchableOpacity>
                  </View>
                }
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
            isDisabled={loading || !!error}
            loading={loading}
            testID="continue-button"
          />
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default BasicInfo;
