import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Keyboard, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import {
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Button,
  ButtonVariant,
  ButtonSize,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './BasicInfo.styles';
import { useParams } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import DepositTextField from '../../components/DepositTextField';
import { useForm } from '../../hooks/useForm';
import DepositProgressBar from '../../components/DepositProgressBar';
import DepositDateField from '../../components/DepositDateField';
import { VALIDATION_REGEX } from '../../constants/transak';
import PoweredByTransak from '../../components/PoweredByTransak';
import PrivacySection from '../../components/PrivacySection';
import { timestampToTransakFormat } from '../../utils/depositUtils';
import useAnalytics from '../../hooks/useAnalytics';
import Logger from '../../../../../util/Logger';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button';
import { TextVariant as ComponentLibraryTextVariant } from '../../../../../component-library/components/Texts/Text/Text.types';
import { useTransakController } from '../../hooks/useTransakController';
import useRampsController from '../../hooks/useRampsController';
import { useRampsUserRegion } from '../../hooks/useRampsUserRegion';
import { useRampsCountries } from '../../hooks/useRampsCountries';
import {
  getTransakApiMessage,
  isTransakPhoneRegisteredError,
  type TransakBuyQuote,
} from '@metamask/ramps-controller';
import type { AddressFormData } from '../../types/transakNativeForms';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import { useHeadlessRampProps } from '../../headless/useHeadlessRampProps';
import { BASIC_INFO_TEST_IDS } from './BasicInfo.testIds';
import { createV2EnterEmailNavDetails } from './EnterEmail';
import PhoneField from './components/PhoneField';

export interface BasicInfoFormData {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  dob: string;
  ssn?: string;
}

export interface V2BasicInfoParams {
  quote: TransakBuyQuote;
  previousFormData?: BasicInfoFormData & AddressFormData;
  /**
   * Forwarded from `useTransakRouting` resets when in a headless buy flow
   * so logout / address steps keep the session id for `EnterEmail` →
   * `OtpCode` and post-auth stack resets.
   */
  headlessSessionId?: string;
}

const V2BasicInfo = (): React.JSX.Element => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const trackEvent = useAnalytics();
  const { quote, previousFormData, headlessSessionId } =
    useParams<V2BasicInfoParams>();
  const { logoutFromProvider, patchUser, submitSsnDetails } =
    useTransakController();
  const { selectedToken } = useRampsController();
  const { userRegion } = useRampsUserRegion();
  const { countries } = useRampsCountries();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPhoneRegisteredError, setIsPhoneRegisteredError] = useState(false);

  // Headless deposit (TRAM-3623): tag RAMPS_BASIC_INFO_ENTERED with
  // `ramp_type: 'HEADLESS'` + the seeded `ramp_surface` when this screen is
  // part of a headless buy flow; keep 'DEPOSIT' otherwise.
  const { headlessDepositRampProps } = useHeadlessRampProps(headlessSessionId);

  const firstNameInputRef = useRef<TextInput>(null);
  const lastNameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const dateInputRef = useRef<TextInput>(null);
  const ssnInputRef = useRef<TextInput>(null);

  const regionIsoCode = userRegion?.country?.isoCode || '';

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

    if (regionIsoCode === 'US' && !formData.ssn?.trim()) {
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

  const handleHeaderBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    handleFormDataChange('ssn')('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnPressContinue = useCallback(async () => {
    if (!validateFormData()) return;

    setError(null);
    setIsPhoneRegisteredError(false);

    trackEvent('RAMPS_BASIC_INFO_ENTERED', {
      region: regionIsoCode,
      ...headlessDepositRampProps,
      kyc_type: 'SIMPLE',
    });

    try {
      setLoading(true);
      const { ssn, ...formDataWithoutSsn } = formData;
      await patchUser({
        personalDetails: {
          ...formDataWithoutSsn,
          dob: formData.dob.trim()
            ? timestampToTransakFormat(formData.dob)
            : '',
        },
      });

      if (ssn) {
        await submitSsnDetails(ssn, quote.quoteId);
      }

      navigation.navigate(Routes.RAMP.ENTER_ADDRESS, {
        previousFormData,
        quote,
        ...(headlessSessionId ? { headlessSessionId } : {}),
      });
    } catch (submissionError) {
      const isPhoneError = isTransakPhoneRegisteredError(submissionError);
      setIsPhoneRegisteredError(isPhoneError);

      const errorMessageText =
        getTransakApiMessage(submissionError) ??
        parseUserFacingError(
          submissionError,
          strings('deposit.basic_info.unexpected_error'),
        );

      let errorMessage = errorMessageText;
      if (isPhoneError && errorMessageText) {
        const emailMatch = errorMessageText.match(/[\w*]+@[\w*]+(?:\.[\w*]+)*/);
        const email = emailMatch?.[0] ?? '';
        if (email) {
          errorMessage = strings(
            'deposit.basic_info.phone_already_registered',
            { email },
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
    patchUser,
    submitSsnDetails,
    navigation,
    quote,
    previousFormData,
    headlessSessionId,
    regionIsoCode,
    trackEvent,
    headlessDepositRampProps,
  ]);

  const enterEmailParamsForLogout = useMemo(
    () => ({
      ...(headlessSessionId ? { headlessSessionId } : {}),
      amount: quote?.fiatAmount == null ? undefined : String(quote.fiatAmount),
      // TransakBuyQuote uses plain strings for fiatCurrency / cryptoCurrency
      // (not `{ symbol }` / `{ assetId }` objects).
      currency: quote?.fiatCurrency,
      // CAIP asset id for post-logout OTP quote fetch — prefer controller
      // (seeded in headless buy) over quote.cryptoCurrency (a display ticker).
      assetId: selectedToken?.assetId,
    }),
    [headlessSessionId, quote, selectedToken?.assetId],
  );

  const handleLogout = useCallback(async () => {
    try {
      await logoutFromProvider(false);
      navigation.navigate(
        ...createV2EnterEmailNavDetails(enterEmailParamsForLogout),
      );
    } catch (logoutError) {
      Logger.error(
        logoutError as Error,
        'Error logging out from BasicInfo error banner',
      );
    }
  }, [logoutFromProvider, navigation, enterEmailParamsForLogout]);

  const handleSsnInfoPress = useCallback(() => {
    navigation.navigate(Routes.RAMP.MODALS.ID, {
      screen: Routes.RAMP.MODALS.SSN_INFO,
    });
  }, [navigation]);

  const focusNextField = useCallback(
    (nextRef: React.RefObject<TextInput | null>) => () => {
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

  const handlePhoneNumberChange = useCallback(
    (mobileNumber: string) => {
      setError(null);
      setIsPhoneRegisteredError(false);
      handleFormDataChange('mobileNumber')(mobileNumber);
    },
    [handleFormDataChange],
  );

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <HeaderStandard
          title={strings('deposit.basic_info.navbar_title')}
          onBack={handleHeaderBack}
          backButtonProps={{ testID: 'deposit-back-navbar-button' }}
          includesTopInset
        />
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenLayout.Content>
            <DepositProgressBar steps={4} currentStep={2} />
            <Text variant={TextVariant.HeadingMd} style={styles.title}>
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
                          labelTextVariant: ComponentLibraryTextVariant.BodyMD,
                          testID: BASIC_INFO_TEST_IDS.LOGOUT_BUTTON,
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
                testID={BASIC_INFO_TEST_IDS.FIRST_NAME_INPUT}
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
                testID={BASIC_INFO_TEST_IDS.LAST_NAME_INPUT}
                containerStyle={styles.nameInputContainer}
                ref={lastNameInputRef}
                autoComplete="family-name"
                textContentType="familyName"
                autoCapitalize="words"
                onSubmitEditing={focusNextField(phoneInputRef)}
              />
            </View>

            <PhoneField
              label={strings('deposit.basic_info.phone_number')}
              value={formData.mobileNumber}
              onChangeText={handlePhoneNumberChange}
              countries={countries}
              fallbackCountry={userRegion?.country}
              initialNumber={previousFormData?.mobileNumber}
              error={errors.mobileNumber}
              ref={phoneInputRef}
              testID={BASIC_INFO_TEST_IDS.PHONE_INPUT}
              countrySelectorTestID={BASIC_INFO_TEST_IDS.PHONE_COUNTRY_SELECTOR}
              onSubmitEditing={focusNextField(dateInputRef)}
            />

            <DepositDateField
              label={strings('deposit.basic_info.date_of_birth')}
              value={formData.dob}
              onChangeText={handleFieldChange('dob', () => {
                if (regionIsoCode === 'US') {
                  focusNextField(ssnInputRef)();
                } else {
                  Keyboard.dismiss();
                }
              })}
              error={errors.dob}
              onSubmitEditing={() => {
                if (regionIsoCode === 'US') {
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
                testID: BASIC_INFO_TEST_IDS.DATE_OF_BIRTH_INPUT,
              }}
            />
            {regionIsoCode === 'US' && (
              <DepositTextField
                label={
                  <View style={styles.ssnLabel}>
                    <Text variant={TextVariant.BodyMd}>
                      {strings('deposit.basic_info.social_security_number')}
                    </Text>
                    <TouchableOpacity
                      onPress={handleSsnInfoPress}
                      testID={BASIC_INFO_TEST_IDS.SSN_INFO_BUTTON}
                    >
                      <Icon
                        name={IconName.Info}
                        size={IconSize.Sm}
                        color={IconColor.IconAlternative}
                      />
                    </TouchableOpacity>
                  </View>
                }
                placeholder="XXX-XX-XXXX"
                value={formData.ssn || ''}
                onChangeText={handleFieldChange('ssn')}
                error={errors.ssn}
                returnKeyType="done"
                testID={BASIC_INFO_TEST_IDS.SSN_INPUT}
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
            variant={ButtonVariant.Primary}
            isFullWidth
            isDisabled={loading || !!error}
            isLoading={loading}
            testID={BASIC_INFO_TEST_IDS.CONTINUE_BUTTON}
          >
            {strings('deposit.basic_info.continue')}
          </Button>
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default V2BasicInfo;
