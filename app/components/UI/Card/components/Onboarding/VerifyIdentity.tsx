import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, type LayoutChangeEvent } from 'react-native';
import { useNavigation, StackActions } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import VeriffSdk, { type VeriffBranding } from '@veriff/react-native-sdk';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import useStartVerification from '../../hooks/useStartVerification';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import MM_CARD_VERIFY_IDENTITY from '../../../../../images/card-fingerprint-kyc-image.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Logger from '../../../../../util/Logger';
import { useTheme } from '../../../../../util/theme';
import { brandColor } from '@metamask/design-tokens';
import useRegions from '../../hooks/useRegions';

/**
 * The KYC fingerprint PNG is 2096². Artwork visual center sits 105.5px right
 * and 53.5px down of the frame. Keep the original flex-fill `contain` size and
 * shift opposite that offset so it reads as centered.
 */
const VERIFY_IDENTITY_ASSET_SIZE = 2096;
const VERIFY_IDENTITY_CONTENT_OFFSET_X = 105.5;
const VERIFY_IDENTITY_CONTENT_OFFSET_Y = 53.5;

const VerifyIdentity = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { userCountry: selectedCountry } = useRegions();
  const [isLaunchingVeriff, setIsLaunchingVeriff] = useState(false);
  const [illustrationLayout, setIllustrationLayout] = useState({
    width: 0,
    height: 0,
  });

  const illustrationNudgeStyle = useMemo(() => {
    const displayedSize = Math.min(
      illustrationLayout.width,
      illustrationLayout.height,
    );
    if (displayedSize === 0) {
      return undefined;
    }

    return {
      transform: [
        {
          translateX: -Math.round(
            (displayedSize * VERIFY_IDENTITY_CONTENT_OFFSET_X) /
              VERIFY_IDENTITY_ASSET_SIZE,
          ),
        },
        {
          translateY: -Math.round(
            (displayedSize * VERIFY_IDENTITY_CONTENT_OFFSET_Y) /
              VERIFY_IDENTITY_ASSET_SIZE,
          ),
        },
      ],
    };
  }, [illustrationLayout]);

  const handleIllustrationLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setIllustrationLayout((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  }, []);

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
        bold: 'Geist-SemiBold',
      },
      androidFont: {
        regular: 'Geist-Regular',
        medium: 'Geist-Medium',
        bold: 'Geist-SemiBold',
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
        .addProperties(
          withCardProvider(CardProviderIds.Baanx, {
            action: CardActions.VERIFY_IDENTITY_BUTTON,
          }),
        )
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
            Logger.error(new Error('Veriff verification failed'), {
              tags: { feature: 'card', provider: 'baanx' },
              context: {
                name: 'VerifyIdentity',
                data: {
                  method: 'veriffSdk',
                  status: 'error',
                  errorCode: result.error,
                  country: selectedCountry?.key,
                },
              },
            });
            break;
        }
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'card', provider: 'baanx' },
          context: {
            name: 'VerifyIdentity',
            data: {
              method: 'veriffSdk',
              status: 'launch_failed',
              country: selectedCountry?.key,
            },
          },
        });
      } finally {
        setIsLaunchingVeriff(false);
      }
    }
  }, [
    navigation,
    sessionUrl,
    trackEvent,
    createEventBuilder,
    veriffBranding,
    selectedCountry?.key,
  ]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Baanx, {
            screen: CardScreens.VERIFY_IDENTITY,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const renderFormFields = () => (
    <>
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="w-full flex-1"
        testID="verify-identity-illustration-container"
      >
        <Image
          source={MM_CARD_VERIFY_IDENTITY}
          resizeMode="contain"
          testID="verify-identity-illustration"
          onLayout={handleIllustrationLayout}
          style={tw.style('w-full h-full', illustrationNudgeStyle)}
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
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      isFullWidth
      isDisabled={!sessionUrl || isLaunchingVeriff}
      isLoading={isLaunchingVeriff}
      testID="verify-identity-continue-button"
    >
      {strings('card.card_onboarding.continue_button')}
    </Button>
  );
  return (
    <OnboardingStep
      title={strings('card.card_onboarding.verify_identity.title')}
      description={strings('card.card_onboarding.verify_identity.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
      headerMode="close-with-confirmation"
    />
  );
};

export default VerifyIdentity;
