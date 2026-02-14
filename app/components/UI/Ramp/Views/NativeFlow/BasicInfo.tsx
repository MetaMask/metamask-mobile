import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../Navbar';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from '../../Deposit/Views/BasicInfo/BasicInfo.styles';
import { useParams } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import DepositTextField from '../../Deposit/components/DepositTextField';
import { useForm } from '../../Deposit/hooks/useForm';
import DepositProgressBar from '../../Deposit/components/DepositProgressBar';
import DepositDateField from '../../Deposit/components/DepositDateField';
import { VALIDATION_REGEX } from '../../Deposit/constants/constants';
import { formatNumberToTemplate } from '../../Deposit/components/DepositPhoneField/formatNumberToTemplate';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import PoweredByTransak from '../../Deposit/components/PoweredByTransak';
import PrivacySection from '../../Deposit/components/PrivacySection';
import { timestampToTransakFormat } from '../../Deposit/utils';
import useAnalytics from '../../hooks/useAnalytics';
import Logger from '../../../../../util/Logger';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { useTransakController } from '../../hooks/useTransakController';
import { useRampsUserRegion } from '../../hooks/useRampsUserRegion';
import type { TransakBuyQuote } from '@metamask/ramps-controller';
import type { AddressFormData } from '../../Deposit/Views/EnterAddress/EnterAddress';

export interface BasicInfoFormData {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  dob: string;
  ssn?: string;
}

interface V2BasicInfoParams {
  quote: TransakBuyQuote;
  previousFormData?: BasicInfoFormData & AddressFormData;
}

const V2BasicInfo = (): JSX.Element => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const trackEvent = useAnalytics();
  const { quote, previousFormData } = useParams<V2BasicInfoParams>();
  const { logoutFromProvider, patchUser, submitSsnDetails } =
    useTransakController();
  const { userRegion } = useRampsUserRegion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPhoneRegisteredError, setIsPhoneRegisteredError] = useState(false);

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

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.basic_info.navbar_title') },
        theme,
      ),
    );
  }, [navigation, theme]);

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
      ramp_type: 'DEPOSIT',
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

      navigation.navigate(
        Routes.RAMP.ENTER_ADDRESS as never,
        {
          previousFormData,
          quote,
        } as never,
      );
    } catch (submissionError) {
      const apiError = (
        submissionError as {
          response?: {
            data?: { error?: { errorCode?: number; message?: string } };
          };
        }
      )?.response?.data?.error;

      const isPhoneError = apiError?.errorCode === 2020;
      setIsPhoneRegisteredError(isPhoneError);

      const errorMessageText =
        submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : strings('deposit.basic_info.unexpected_error');

      let errorMessage = errorMessageText;
      if (isPhoneError && errorMessageText) {
        const emailMatch = errorMessageText.match(/[\w*]+@[\w*]+(?:\.[\w*]+)*/);
        const email = emailMatch ? emailMatch[0] : '';
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
    regionIsoCode,
    trackEvent,
  ]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutFromProvider(false);
      navigation.navigate(Routes.RAMP.ENTER_EMAIL as never);
    } catch (logoutError) {
      Logger.error(
        logoutError as Error,
        'Error logging out from BasicInfo error banner',
      );
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

  const phonePrefix = userRegion?.country?.phone?.prefix ?? '';
  const phoneTemplate =
    userRegion?.country?.phone?.template ?? '(XXX) XXX-XXXX';

  const rawPhoneDigits = phonePrefix
    ? formData.mobileNumber
        .replace(/\D/g, '')
        .replace(new RegExp(`^${phonePrefix.replace(/\D/g, '')}`), '')
    : formData.mobileNumber.replace(/\D/g, '');
  const formattedPhoneValue = formatNumberToTemplate(
    rawPhoneDigits,
    phoneTemplate,
  );

  const handlePhoneChange = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, '');
      const fullNumber = phonePrefix ? phonePrefix + digits : digits;
      handleFieldChange(
        'mobileNumber',
        focusNextField(dateInputRef),
      )(fullNumber);
    },
    [phonePrefix, handleFieldChange, focusNextField, dateInputRef],
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

            <DepositTextField
              label={strings('deposit.basic_info.phone_number')}
              placeholder={
                userRegion?.country?.phone?.placeholder ??
                strings('deposit.basic_info.enter_phone_number')
              }
              value={formattedPhoneValue}
              onChangeText={handlePhoneChange}
              error={errors.mobileNumber}
              ref={phoneInputRef}
              onSubmitEditing={focusNextField(dateInputRef)}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              startAccessory={
                userRegion?.country?.flag ? (
                  <View style={styles.phoneFlagRow}>
                    <Text style={styles.phoneFlagEmoji}>
                      {userRegion.country.flag}
                    </Text>
                    {phonePrefix ? (
                      <Text style={styles.phonePrefix}>{phonePrefix}</Text>
                    ) : null}
                  </View>
                ) : undefined
              }
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
                testID: 'date-of-birth-input',
              }}
            />
            {regionIsoCode === 'US' && (
              <DepositTextField
                label={
                  <View style={styles.ssnLabel}>
                    <Text variant={TextVariant.BodyMD}>
                      {strings('deposit.basic_info.social_security_number')}
                    </Text>
                    <TouchableOpacity testID="ssn-info-button">
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

export default V2BasicInfo;
