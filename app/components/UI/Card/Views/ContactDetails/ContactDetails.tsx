import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Label,
  Spinner,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Engine from '../../../../../core/Engine';
import type { CardContactDetails } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  selectCardActiveProviderId,
  selectCardHomeData,
} from '../../../../../selectors/cardController';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { validateEmail } from '../../../Ramp/utils/depositUtils';
import useRegions from '../../hooks/useRegions';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import SelectField from '../../components/Onboarding/SelectField';
import {
  clearOnValueChange,
  createRegionSelectorModalNavigationDetails,
  setOnValueChange,
} from '../../components/Onboarding/RegionSelectorModal';
import { navigateWithDetails } from '../../../../../util/navigation/navUtils';
import type { Region } from '../../types';
import {
  formatE164PhoneNumber,
  isValidE164PhoneNumber,
  isValidLocalPhoneNumber,
  normalizePhoneDigits,
  parseE164PhoneNumber,
  stripCallingCodePrefix,
} from '../../util/contactDetails';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { ContactDetailsSelectors } from './ContactDetails.testIds';

interface InitialContactDetails {
  email: string;
  phone: string;
}

const ContactDetails = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const headerHandlers = useCardHeaderHandlers('back');
  const tw = useTailwind();
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const activeProviderId = useSelector(selectCardActiveProviderId);
  const cardHomeData = useSelector(selectCardHomeData);
  const {
    allRegions,
    getRegionByCode,
    isLoading: isLoadingRegions,
    error: regionsError,
    refetch: refetchRegions,
  } = useRegions();

  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneRegion, setPhoneRegion] = useState<Region | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [contactDetails, setContactDetails] =
    useState<CardContactDetails | null>(null);
  const [isLoadingContact, setIsLoadingContact] = useState(true);
  const [contactLoadError, setContactLoadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const hasHydratedForm = useRef(false);
  const initialContactDetails = useRef<InitialContactDetails | null>(null);
  const preserveUnmatchedStoredPhone = useRef(false);

  const loadContactDetails = useCallback(async () => {
    setIsLoadingContact(true);
    setContactLoadError(false);
    try {
      const details = await Engine.context.CardController.getContactDetails();
      setContactDetails(details);
    } catch {
      setContactLoadError(true);
    } finally {
      setIsLoadingContact(false);
    }
  }, []);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(activeProviderId, {
            screen: CardScreens.CONTACT_DETAILS,
          }),
        )
        .build(),
    );
    loadContactDetails();
  }, [activeProviderId, createEventBuilder, loadContactDetails, trackEvent]);

  useEffect(() => {
    if (
      hasHydratedForm.current ||
      isLoadingRegions ||
      !contactDetails ||
      allRegions.length === 0
    ) {
      return;
    }

    const preferredRegionKey = cardHomeData?.card?.regionCode;
    const parsedPhone = parseE164PhoneNumber(
      contactDetails.phone,
      allRegions,
      preferredRegionKey,
    );
    const hasStoredPhone =
      normalizePhoneDigits(contactDetails.phone).length > 0;
    const selectedRegion =
      parsedPhone.region ??
      (hasStoredPhone ? null : getRegionByCode(preferredRegionKey));
    const initialEmail = contactDetails.email ?? '';
    const initialPhone = contactDetails.phone ?? '';

    setEmail(initialEmail);
    setPhoneNumber(parsedPhone.phoneNumber);
    setPhoneRegion(selectedRegion);
    initialContactDetails.current = {
      email: initialEmail,
      phone: initialPhone,
    };
    preserveUnmatchedStoredPhone.current =
      hasStoredPhone && !parsedPhone.region;
    hasHydratedForm.current = true;
  }, [
    allRegions,
    cardHomeData?.card?.regionCode,
    contactDetails,
    getRegionByCode,
    isLoadingRegions,
  ]);

  useEffect(() => () => clearOnValueChange(), []);

  const trimmedEmail = email.trim();
  const formattedPhone = phoneRegion?.areaCode
    ? formatE164PhoneNumber(phoneRegion.areaCode, phoneNumber)
    : '';
  const isEmailValid = validateEmail(trimmedEmail);
  const isPhoneValid = Boolean(
    phoneRegion?.areaCode &&
      isValidLocalPhoneNumber(phoneNumber) &&
      isValidE164PhoneNumber(formattedPhone),
  );
  const hasEmailChanges = Boolean(
    initialContactDetails.current &&
      trimmedEmail !== initialContactDetails.current.email,
  );
  const hasPhoneChanges = Boolean(
    initialContactDetails.current &&
      !preserveUnmatchedStoredPhone.current &&
      (phoneRegion
        ? formattedPhone !== initialContactDetails.current.phone
        : phoneNumber !==
          normalizePhoneDigits(initialContactDetails.current.phone)),
  );
  const hasChanges = hasEmailChanges || hasPhoneChanges;

  const hasLoadError = Boolean(
    contactLoadError ||
      regionsError ||
      (!isLoadingContact &&
        !isLoadingRegions &&
        contactDetails &&
        allRegions.length === 0),
  );
  const isLoading = Boolean(
    isLoadingContact ||
      isLoadingRegions ||
      (!hasHydratedForm.current && !hasLoadError),
  );
  const isSaveDisabled =
    !isEmailValid ||
    (hasPhoneChanges && !isPhoneValid) ||
    !hasChanges ||
    isSubmitting ||
    isLoading;

  const handleRetry = useCallback(async () => {
    hasHydratedForm.current = false;
    initialContactDetails.current = null;
    preserveUnmatchedStoredPhone.current = false;
    setContactDetails(null);
    setSubmitError(null);
    await Promise.all([refetchRegions(), loadContactDetails()]);
  }, [loadContactDetails, refetchRegions]);

  const handlePhoneRegionSelect = useCallback(() => {
    setOnValueChange((region) => {
      const nextPhoneNumber = stripCallingCodePrefix(
        phoneNumber,
        region.areaCode ?? '',
      );
      if (nextPhoneNumber !== normalizePhoneDigits(phoneNumber)) {
        preserveUnmatchedStoredPhone.current = false;
      }
      setPhoneNumber(nextPhoneNumber);
      setPhoneRegion(region);
      setPhoneTouched(true);
      setSubmitError(null);
    });
    navigateWithDetails(
      navigation,
      createRegionSelectorModalNavigationDetails({
        regions: allRegions,
        renderAreaCode: true,
        selectedRegionKey: phoneRegion?.key ?? null,
      }),
    );
  }, [allRegions, navigation, phoneNumber, phoneRegion?.key]);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    setSubmitError(null);
  }, []);

  const handlePhoneNumberChange = useCallback((value: string) => {
    preserveUnmatchedStoredPhone.current = false;
    setPhoneNumber(value.replace(/\D/g, ''));
    setSubmitError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setEmailTouched(true);
    if (hasPhoneChanges) {
      setPhoneTouched(true);
    }
    if (isSaveDisabled) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.CONTACT_DETAILS_SAVE_BUTTON,
          }),
        )
        .build(),
    );

    try {
      const updatedDetails: CardContactDetails = {
        ...(hasEmailChanges ? { email: trimmedEmail } : {}),
        ...(hasPhoneChanges ? { phone: formattedPhone } : {}),
      };
      await Engine.context.CardController.patchContactDetails(updatedDetails);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(activeProviderId, {
              action: CardActions.CONTACT_DETAILS_SAVE_BUTTON,
              status: 'succeeded',
            }),
          )
          .build(),
      );
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('card.contact_details.success_message') },
        ],
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        hasNoTimeout: false,
      });
      navigation.goBack();
    } catch {
      setSubmitError(strings('card.contact_details.update_error'));
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(activeProviderId, {
              action: CardActions.CONTACT_DETAILS_SAVE_BUTTON,
              status: 'failed',
            }),
          )
          .build(),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activeProviderId,
    createEventBuilder,
    formattedPhone,
    hasEmailChanges,
    hasPhoneChanges,
    isSaveDisabled,
    navigation,
    theme.colors.success.default,
    toastRef,
    trackEvent,
    trimmedEmail,
  ]);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <Box
          twClassName="flex-1 items-center justify-center"
          testID={ContactDetailsSelectors.LOADING}
        >
          <Spinner />
        </Box>
      );
    }

    if (hasLoadError) {
      return (
        <Box
          twClassName="flex-1 items-center justify-center gap-4 px-4"
          testID={ContactDetailsSelectors.LOAD_ERROR}
        >
          <Text variant={TextVariant.BodyMd} twClassName="text-center">
            {strings('card.contact_details.load_error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleRetry}
            testID={ContactDetailsSelectors.RETRY_BUTTON}
          >
            {strings('card.contact_details.retry')}
          </Button>
        </Box>
      );
    }

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw.style('flex-1')}
      >
        <ScrollView
          contentContainerStyle={tw.style('flex-grow px-4')}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Box gap={4} paddingTop={2}>
            <Text variant={TextVariant.HeadingLg}>
              {strings('card.contact_details.title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('card.contact_details.description')}
            </Text>
            <Box gap={1}>
              <Label>{strings('card.contact_details.email_label')}</Label>
              <TextField
                value={email}
                onChangeText={handleEmailChange}
                onBlur={() => setEmailTouched(true)}
                isError={emailTouched && !isEmailValid}
                inputProps={{
                  testID: ContactDetailsSelectors.EMAIL_INPUT,
                  autoCapitalize: 'none',
                  autoCorrect: false,
                  autoComplete: 'email',
                  keyboardType: 'email-address',
                }}
              />
              {emailTouched && !isEmailValid ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                  testID={ContactDetailsSelectors.EMAIL_ERROR}
                >
                  {strings('card.contact_details.invalid_email')}
                </Text>
              ) : null}
            </Box>
            <Box gap={1}>
              <Label>{strings('card.contact_details.phone_label')}</Label>
              <Box twClassName="flex-row items-center gap-2">
                <Box twClassName="w-26">
                  <SelectField
                    value={`${phoneRegion?.emoji ?? ''} +${phoneRegion?.areaCode ?? ''}`}
                    onPress={handlePhoneRegionSelect}
                    hideIcon
                    testID={ContactDetailsSelectors.PHONE_AREA_CODE_SELECT}
                  />
                </Box>
                <Box twClassName="flex-1">
                  <TextField
                    value={phoneNumber}
                    onChangeText={handlePhoneNumberChange}
                    onBlur={() => setPhoneTouched(true)}
                    isError={phoneTouched && !isPhoneValid}
                    inputProps={{
                      testID: ContactDetailsSelectors.PHONE_NUMBER_INPUT,
                      autoComplete: 'tel',
                      keyboardType: 'phone-pad',
                      returnKeyType: 'done',
                      onSubmitEditing: handleSave,
                    }}
                  />
                </Box>
              </Box>
              {phoneTouched && !isPhoneValid ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                  testID={ContactDetailsSelectors.PHONE_ERROR}
                >
                  {strings('card.contact_details.invalid_phone')}
                </Text>
              ) : null}
            </Box>
            {submitError ? (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.ErrorDefault}
                testID={ContactDetailsSelectors.SUBMIT_ERROR}
              >
                {submitError}
              </Text>
            ) : null}
          </Box>
        </ScrollView>
        <Box padding={4}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={isSaveDisabled}
            isLoading={isSubmitting}
            onPress={handleSave}
            testID={ContactDetailsSelectors.SAVE_BUTTON}
          >
            {strings('card.contact_details.save')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    );
  }, [
    email,
    emailTouched,
    handleEmailChange,
    handlePhoneNumberChange,
    handlePhoneRegionSelect,
    handleRetry,
    handleSave,
    hasLoadError,
    isEmailValid,
    isLoading,
    isPhoneValid,
    isSaveDisabled,
    isSubmitting,
    phoneNumber,
    phoneRegion?.areaCode,
    phoneRegion?.emoji,
    phoneTouched,
    submitError,
    tw,
  ]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
      testID={ContactDetailsSelectors.ROOT}
    >
      <HeaderStandard
        includesTopInset
        twClassName="bg-background-default"
        {...headerHandlers}
      />
      {content}
    </SafeAreaView>
  );
};

export default ContactDetails;
