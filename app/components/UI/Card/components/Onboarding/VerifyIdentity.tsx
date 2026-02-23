import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'react-native';
import { useNavigation, StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import VeriffSdk, { type VeriffBranding } from '@veriff/react-native-sdk';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import useStartVerification from '../../hooks/useStartVerification';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens } from '../../util/metrics';
import MM_CARD_VERIFY_IDENTITY from '../../../../../images/card-fingerprint-kyc-image.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { selectSelectedCountry } from '../../../../../core/redux/slices/card';
import Logger from '../../../../../util/Logger';
import { useTheme } from '../../../../../util/theme';
import { brandColor } from '@metamask/design-tokens';

const VerifyIdentity = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const selectedCountry = useSelector(selectSelectedCountry);
  const [isLaunchingVeriff, setIsLaunchingVeriff] = useState(false);

  const veriffBranding: VeriffBranding = useMemo(
    () => ({
      logo: 'fox',
      background: colors.background.default,
      onBackground: colors.text.default,
      onBackgroundSecondary: colors.text.alternative,
      onBackgroundTertiary: colors.text.muted,
      primary: colors.icon.default,
      onPrimary: colors.icon.inverse,
      secondary: colors.primary.default,
      onSecondary: colors.primary.inverse,
      outline: colors.border.default,
      cameraOverlay: brandColor.grey900,
      onCameraOverlay: brandColor.grey000,
      error: colors.error.default,
      success: colors.success.default,
      buttonRadius: 12,
      iOSFont: {
        regular: 'Geist-Regular',
        medium: 'Geist-Medium',
        bold: 'Geist-Bold',
      },
      androidFont: {
        regular: 'Geist-Regular',
        medium: 'Geist-Medium',
        bold: 'Geist-Bold',
      },
    }),
    [colors],
  );
  const {
    data: verificationResponse,
    isLoading: startVerificationIsLoading,
    isError: startVerificationIsError,
    error: startVeriricationErr,
  } = useStartVerification();

  const { sessionUrl } = verificationResponse || {};

  const handleContinue = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.VERIFY_IDENTITY_BUTTON,
        })
        .build(),
    );

    if (sessionUrl) {
      setIsLaunchingVeriff(true);
      try {
        const result = await VeriffSdk.launchVeriff({
          sessionUrl,
          branding: veriffBranding,
        });

        switch (result.status) {
          case VeriffSdk.statusDone:
            navigation.dispatch(
              StackActions.replace(Routes.CARD.ONBOARDING.VERIFYING_VERIFF_KYC),
            );
            break;
          case VeriffSdk.statusCanceled:
            break;
          case VeriffSdk.statusError:
            Logger.error(
              new Error('Veriff verification failed'),
              `Veriff verification failed with error=${result.error}`,
            );
            break;
        }
      } catch (error) {
        Logger.error(error as Error, 'Veriff SDK launch failed unexpectedly');
      } finally {
        setIsLaunchingVeriff(false);
      }
    }
  }, [navigation, sessionUrl, trackEvent, createEventBuilder, veriffBranding]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.VERIFY_IDENTITY,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const renderFormFields = () => (
    <>
      <Box twClassName="flex flex-1 items-center justify-center">
        <Image
          source={MM_CARD_VERIFY_IDENTITY}
          resizeMode="contain"
          style={tw.style('w-full h-full')}
        />
      </Box>
      <Box twClassName="flex flex-row gap-3">
        <Icon
          name={IconName.EyeSlash}
          size={IconSize.Lg}
          color={IconColor.IconAlternative}
        />
        <Text
          variant={TextVariant.BodyMd}
          twClassName="flex-1 flex-shrink text-text-alternative"
        >
          {strings('card.card_onboarding.verify_identity.terms_1')}
        </Text>
      </Box>
      <Box twClassName="flex flex-row gap-3">
        <Icon
          name={IconName.Fingerprint}
          size={IconSize.Lg}
          color={IconColor.IconAlternative}
        />
        <Text
          variant={TextVariant.BodyMd}
          twClassName="flex-1 flex-shrink text-text-alternative"
        >
          {selectedCountry?.key === 'US'
            ? strings('card.card_onboarding.verify_identity.terms_2_us')
            : strings('card.card_onboarding.verify_identity.terms_2')}
        </Text>
      </Box>

      {startVerificationIsError ? (
        <Text
          variant={TextVariant.BodySm}
          testID="verify-identity-start-verification-error"
          twClassName="text-error-default text-center"
        >
          {startVeriricationErr}
        </Text>
      ) : !sessionUrl && !startVerificationIsLoading ? (
        <Text
          variant={TextVariant.BodySm}
          testID="verify-identity-start-verification-error"
          twClassName="text-error-default text-center"
        >
          {strings(
            'card.card_onboarding.verify_identity.start_verification_error',
          )}
        </Text>
      ) : (
        <></>
      )}
    </>
  );

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.continue_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      width={ButtonWidthTypes.Full}
      isDisabled={!sessionUrl || isLaunchingVeriff}
      loading={isLaunchingVeriff}
      testID="verify-identity-continue-button"
    />
  );
  return (
    <OnboardingStep
      title={strings('card.card_onboarding.verify_identity.title')}
      description={strings('card.card_onboarding.verify_identity.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default VerifyIdentity;
