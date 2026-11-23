import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, StackActions } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import VeriffSdk, { type VeriffBranding } from '@veriff/react-native-sdk';
import { strings } from '../../../../../../locales/i18n';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  HelpText,
  HelpTextSeverity,
  IconName,
  ListItem,
  ListItemVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import useStartVerification from '../../hooks/useStartVerification';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import Logger from '../../../../../util/Logger';
import { useTheme } from '../../../../../util/theme';
import { brandColor } from '@metamask/design-tokens';
import useRegions from '../../hooks/useRegions';
import OnboardingStep from './OnboardingStep';

/**
 * Card Veriff identity intro. Terms are ListItems inside the shared
 * OnboardingStep. No top illustration — title and body only.
 */
const VerifyIdentity = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { userCountry: selectedCountry } = useRegions();
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
        regular: 'Inter-Regular',
        medium: 'Inter-Medium',
        bold: 'Inter-SemiBold',
      },
      androidFont: {
        regular: 'Inter-Regular',
        medium: 'Inter-Medium',
        bold: 'Inter-SemiBold',
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

  const terms2Description =
    selectedCountry?.key === 'US'
      ? strings('card.card_onboarding.verify_identity.terms_2_us_description')
      : strings('card.card_onboarding.verify_identity.terms_2_description');

  const renderFormFields = () => (
    <>
      {/* ListItem already pads itself; cancel OnboardingStep's horizontal padding. */}
      <Box twClassName="-mx-4">
        <ListItem
          variant={ListItemVariant.MultiLine}
          twClassName="min-h-0 justify-start py-2"
          avatar={
            <AvatarIcon
              iconName={IconName.EyeSlash}
              severity={AvatarIconSeverity.Neutral}
              size={AvatarIconSize.Lg}
            />
          }
          title={strings('card.card_onboarding.verify_identity.terms_1_title')}
          description={strings(
            'card.card_onboarding.verify_identity.terms_1_description',
          )}
          testID="verify-identity-term-privacy"
        />
        <ListItem
          variant={ListItemVariant.MultiLine}
          twClassName="min-h-0 justify-start py-2"
          avatar={
            <AvatarIcon
              iconName={IconName.Fingerprint}
              severity={AvatarIconSeverity.Neutral}
              size={AvatarIconSize.Lg}
            />
          }
          title={strings('card.card_onboarding.verify_identity.terms_2_title')}
          description={terms2Description}
          testID="verify-identity-term-id"
        />
      </Box>

      {startVerificationIsError ? (
        <HelpText
          severity={HelpTextSeverity.Danger}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID="verify-identity-start-verification-error"
          twClassName="text-center"
        >
          {startVeriricationErr}
        </HelpText>
      ) : !sessionUrl && !startVerificationIsLoading ? (
        <HelpText
          severity={HelpTextSeverity.Danger}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID="verify-identity-start-verification-error"
          twClassName="text-center"
        >
          {strings(
            'card.card_onboarding.verify_identity.start_verification_error',
          )}
        </HelpText>
      ) : null}
    </>
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.verify_identity.title')}
      description={strings('card.card_onboarding.verify_identity.description')}
      formFields={renderFormFields()}
      primaryButtonProps={{
        children: strings('card.card_onboarding.continue_button'),
        onPress: handleContinue,
        isDisabled: !sessionUrl || isLaunchingVeriff,
        isLoading: isLaunchingVeriff,
        testID: 'verify-identity-continue-button',
      }}
      headerMode="close-with-confirmation"
    />
  );
};

export default VerifyIdentity;
