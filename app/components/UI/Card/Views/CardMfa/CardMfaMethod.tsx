import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  Label,
  ListItemSelect,
  Text,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import {
  useParams,
  navigateWithDetails,
} from '../../../../../util/navigation/navUtils';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  CardProviderIds,
  type CardMfaMethod as MfaMethod,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import OnboardingStep from '../../components/Onboarding/OnboardingStep';
import SelectField from '../../components/Onboarding/SelectField';
import {
  clearOnValueChange,
  createRegionSelectorModalNavigationDetails,
  setOnValueChange,
} from '../../components/Onboarding/RegionSelectorModal';
import useRegions from '../../hooks/useRegions';
import {
  classifyImmersveMfaError,
  useImmersveMfa,
} from '../../hooks/useImmersveMfa';
import { getCardProviderErrorMessage } from '../../util/getCardProviderErrorMessage';
import { getSiweErrorType } from '../../hooks/useImmersveSiweAuth';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import type { Region } from '../../types';
import {
  callingCodeFromMaskedPhone,
  normalizeMfaEmail,
  toE164Phone,
} from './mfaDestination';
import type { CardMfaMethodParams } from './types';

function regionForCallingCode(
  regions: Region[],
  callingCode: string | null,
  country: string,
): Region | null {
  if (!callingCode) return null;
  const matches = regions.filter((region) => region.areaCode === callingCode);
  return matches.find((region) => region.key === country) ?? matches[0] ?? null;
}

const CardMfaMethod = () => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const { country, address, options, continuation } =
    useParams<CardMfaMethodParams>();
  const { allRegions } = useRegions();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { isSubmitting, submitMethod, restart, goToNextStep } =
    useImmersveMfa();

  const [selectedMethod, setSelectedMethod] = useState<MfaMethod | null>(() =>
    options.length === 1 ? options[0].method : null,
  );
  const [selectedCountry, setSelectedCountry] = useState<Region | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsRestart, setNeedsRestart] = useState(options.length === 0);

  const phoneMask = options.find(
    (option) => option.method === 'phone',
  )?.maskedDestination;
  const callingCode = callingCodeFromMaskedPhone(phoneMask ?? '');

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            screen: CardScreens.MFA_METHOD,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => () => clearOnValueChange(), []);

  useEffect(() => {
    if (selectedMethod !== 'phone' || selectedCountry) return;
    const match = regionForCallingCode(allRegions, callingCode, country);
    if (match) setSelectedCountry(match);
  }, [allRegions, callingCode, country, selectedCountry, selectedMethod]);

  const destination = (() => {
    if (selectedMethod === 'phone') {
      return toE164Phone(
        selectedCountry?.areaCode ?? callingCode ?? '',
        phoneNumber,
      );
    }
    if (selectedMethod === 'email') {
      return normalizeMfaEmail(email);
    }
    return null;
  })();

  const areaCode = selectedCountry?.areaCode ?? callingCode ?? '';
  const countryCodeLabel = areaCode
    ? strings('card.mfa.country_code_label', { code: areaCode })
    : strings('card.mfa.country_code');

  const openCountrySelector = useCallback(() => {
    setOnValueChange((region) => {
      setSelectedCountry(region);
      if (!needsRestart) setError(null);
    });
    navigateWithDetails(
      navigation,
      createRegionSelectorModalNavigationDetails({
        regions: allRegions,
        renderAreaCode: true,
        selectedRegionKey: selectedCountry?.key ?? null,
      }),
    );
  }, [allRegions, navigation, needsRestart, selectedCountry?.key]);

  const handleRestart = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.MFA_RESTART,
          }),
        )
        .build(),
    );
    try {
      await goToNextStep(await restart(country, address), {
        country,
        address,
        options,
        continuation,
      });
    } catch (restartError) {
      if (getSiweErrorType(restartError) === 'user_cancelled') return;
      setError(getCardProviderErrorMessage(restartError));
    }
  }, [
    address,
    continuation,
    country,
    createEventBuilder,
    goToNextStep,
    options,
    restart,
    trackEvent,
  ]);

  const handleContinue = useCallback(async () => {
    if (!selectedMethod || !destination) return;
    setError(null);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.MFA_METHOD_CONTINUE,
            mfa_method: selectedMethod,
          }),
        )
        .build(),
    );
    try {
      const result = await submitMethod(selectedMethod, destination);
      await goToNextStep(result, {
        country,
        address,
        options,
        continuation,
      });
    } catch (submitError) {
      if (classifyImmersveMfaError(submitError) === 'restart_required') {
        setNeedsRestart(true);
      }
      setError(getCardProviderErrorMessage(submitError));
    }
  }, [
    address,
    continuation,
    country,
    createEventBuilder,
    destination,
    goToNextStep,
    options,
    selectedMethod,
    submitMethod,
    trackEvent,
  ]);

  const formFields = (
    <Box twClassName="gap-4">
      {options.map((option) => {
        const isSelected = selectedMethod === option.method;
        return (
          <ListItemSelect
            key={option.method}
            isSelected={isSelected}
            showSelectedIcon
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              setSelectedMethod(option.method);
              if (!needsRestart) setError(null);
            }}
            testID={`card-mfa-option-${option.method}`}
            startAccessory={
              <Icon
                name={option.method === 'phone' ? IconName.Call : IconName.Mail}
                size={IconSize.Md}
              />
            }
            title={strings(
              option.method === 'phone'
                ? 'card.mfa.method_phone'
                : 'card.mfa.method_email',
            )}
            description={option.maskedDestination}
            twClassName={
              isSelected
                ? 'rounded-xl border border-primary-default bg-background-muted'
                : 'rounded-xl border border-border-muted'
            }
          />
        );
      })}

      {selectedMethod === 'phone' ? (
        <Box>
          <Label>{strings('card.mfa.phone_label')}</Label>
          <Box twClassName="flex-row items-center gap-2">
            <Box twClassName="w-26">
              <SelectField
                value={`${selectedCountry?.emoji ?? ''} +${selectedCountry?.areaCode ?? callingCode ?? ''}`}
                onPress={openCountrySelector}
                hideIcon
                testID="card-mfa-country-code"
                accessibilityLabel={countryCodeLabel}
              />
            </Box>
            <Box twClassName="flex-1">
              <TextField
                onChangeText={(value) => {
                  setPhoneNumber(value.replace(/\D/g, ''));
                  if (!needsRestart) setError(null);
                }}
                value={phoneNumber}
                isError={!!error}
                inputProps={{
                  keyboardType: 'phone-pad',
                  testID: 'card-mfa-phone-input',
                  accessibilityLabel: strings('card.mfa.phone_label'),
                }}
              />
            </Box>
          </Box>
        </Box>
      ) : null}

      {selectedMethod === 'email' ? (
        <Box>
          <Label>{strings('card.mfa.email_label')}</Label>
          <TextField
            onChangeText={(value) => {
              setEmail(value);
              if (!needsRestart) setError(null);
            }}
            value={email}
            isError={!!error}
            inputProps={{
              autoCapitalize: 'none',
              autoComplete: 'email',
              keyboardType: 'email-address',
              testID: 'card-mfa-email-input',
              accessibilityLabel: strings('card.mfa.email_label'),
            }}
          />
        </Box>
      ) : null}

      {error ? (
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-error-default"
          testID="card-mfa-method-error"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </Box>
  );

  const actions = needsRestart ? (
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      onPress={handleRestart}
      isFullWidth
      isLoading={isSubmitting}
      testID="card-mfa-method-restart"
    >
      {strings('card.mfa.start_over')}
    </Button>
  ) : (
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      isFullWidth
      isDisabled={!destination || isSubmitting}
      isLoading={isSubmitting}
      testID="card-mfa-method-continue"
    >
      {strings('card.mfa.continue')}
    </Button>
  );

  return (
    <OnboardingStep
      title={strings('card.mfa.method_title')}
      description={
        options.length === 0
          ? strings('card.mfa.errors.no_verified_contact')
          : strings('card.mfa.method_description')
      }
      formFields={formFields}
      actions={actions}
      stickyActions
      headerMode="back"
    />
  );
};

export default CardMfaMethod;
