import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TextInput, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../Navbar';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from '../../Deposit/Views/EnterAddress/EnterAddress.styles';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import DepositTextField from '../../Deposit/components/DepositTextField';
import { useForm } from '../../Deposit/hooks/useForm';
import DepositProgressBar from '../../Deposit/components/DepositProgressBar';
import PoweredByTransak from '../../Deposit/components/PoweredByTransak';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import PrivacySection from '../../Deposit/components/PrivacySection';
import { VALIDATION_REGEX } from '../../Deposit/constants/constants';
import Logger from '../../../../../util/Logger';
import useAnalytics from '../../hooks/useAnalytics';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { useTransakController } from '../../hooks/useTransakController';
import { useRampsUserRegion } from '../../hooks/useRampsUserRegion';
import { useTransakRouting } from '../../hooks/useTransakRouting';
import type { TransakBuyQuote } from '@metamask/ramps-controller';
import type { BasicInfoFormData } from './BasicInfo';

export interface AddressFormData {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postCode: string;
  countryCode: string;
}

interface V2EnterAddressParams {
  previousFormData?: BasicInfoFormData & AddressFormData;
  quote: TransakBuyQuote;
}

const V2EnterAddress = (): JSX.Element => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { quote, previousFormData } = useParams<V2EnterAddressParams>();
  const { patchUser } = useTransakController();
  const { userRegion } = useRampsUserRegion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trackEvent = useAnalytics();

  const regionIsoCode = userRegion?.country?.isoCode || '';

  const { routeAfterAuthentication } = useTransakRouting({
    screenLocation: 'V2 EnterAddress Screen',
  });

  const addressLine1InputRef = useRef<TextInput>(null);
  const addressLine2InputRef = useRef<TextInput>(null);
  const cityInputRef = useRef<TextInput>(null);
  const postCodeInputRef = useRef<TextInput>(null);

  const stateName = userRegion?.state?.name || '';

  const initialFormData: AddressFormData = {
    addressLine1: previousFormData?.addressLine1 || '',
    addressLine2: previousFormData?.addressLine2 || '',
    state: previousFormData?.state || stateName,
    city: previousFormData?.city || '',
    postCode: previousFormData?.postCode || '',
    countryCode: previousFormData?.countryCode || regionIsoCode,
  };

  const validateForm = (data: AddressFormData): Record<string, string> => {
    const formErrors: Record<string, string> = {};

    if (!data.addressLine1.trim()) {
      formErrors.addressLine1 = strings(
        'deposit.enter_address.address_line_1_required',
      );
    } else if (!VALIDATION_REGEX.addressLine1.test(data.addressLine1)) {
      formErrors.addressLine1 = strings(
        'deposit.enter_address.address_line_1_invalid',
      );
    }

    if (
      data.addressLine2.trim() &&
      !VALIDATION_REGEX.addressLine2.test(data.addressLine2)
    ) {
      formErrors.addressLine2 = strings(
        'deposit.enter_address.address_line_2_invalid',
      );
    }

    if (!data.city.trim()) {
      formErrors.city = strings('deposit.enter_address.city_required');
    } else if (!VALIDATION_REGEX.city.test(data.city)) {
      formErrors.city = strings('deposit.enter_address.city_invalid');
    }

    if (regionIsoCode === 'US') {
      if (!data.state.trim()) {
        formErrors.state = strings('deposit.enter_address.state_required');
      } else if (!VALIDATION_REGEX.state.test(data.state)) {
        formErrors.state = strings('deposit.enter_address.state_invalid');
      }
    }

    if (!data.postCode.trim()) {
      formErrors.postCode = strings(
        'deposit.enter_address.postal_code_required',
      );
    } else if (!VALIDATION_REGEX.postCode.test(data.postCode)) {
      formErrors.postCode = strings(
        'deposit.enter_address.postal_code_invalid',
      );
    }

    return formErrors;
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

    setError(null);

    trackEvent('RAMPS_ADDRESS_ENTERED', {
      region: regionIsoCode,
      ramp_type: 'DEPOSIT',
      kyc_type: 'SIMPLE',
    });

    try {
      setLoading(true);
      await patchUser({
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
    patchUser,
    quote,
    routeAfterAuthentication,
    regionIsoCode,
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
                  focusNextField(postCodeInputRef),
                )}
                error={errors.city}
                returnKeyType="next"
                testID="city-input"
                containerStyle={styles.nameInputContainer}
                ref={cityInputRef}
                textContentType="addressCity"
                autoCapitalize="words"
                onSubmitEditing={focusNextField(postCodeInputRef)}
              />

              <DepositTextField
                label={strings('deposit.enter_address.state')}
                placeholder={strings('deposit.enter_address.state')}
                value={formData.state}
                error={errors.state}
                testID="state-input"
                containerStyle={styles.nameInputContainer}
                isDisabled
              />
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
                keyboardType="numbers-and-punctuation"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <DepositTextField
                label={strings('deposit.enter_address.country')}
                placeholder={strings('deposit.enter_address.country')}
                value={userRegion?.country?.name || ''}
                error={errors.countryCode}
                returnKeyType="done"
                testID="country-input"
                containerStyle={styles.nameInputContainer}
                isDisabled
                startAccessory={
                  userRegion?.country?.flag ? (
                    <Text style={styles.countryFlag}>
                      {userRegion.country.flag}
                    </Text>
                  ) : undefined
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

export default V2EnterAddress;
