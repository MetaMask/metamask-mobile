import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, StackActions } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import VeriffSdk, { type VeriffBranding } from '@veriff/react-native-sdk';
import { strings } from '../../../../../../locales/i18n';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  IconName,
  HelpText,
  HelpTextSeverity,
  ListItem,
  ListItemVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  TitleStandard,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import useStartVerification from '../../hooks/useStartVerification';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Logger from '../../../../../util/Logger';
import { useTheme } from '../../../../../util/theme';
import { brandColor } from '@metamask/design-tokens';
import useRegions from '../../hooks/useRegions';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';

/**
 * Card Veriff identity intro. Visual layout mirrors VBA's SumSub VerifyIdentity
 * (TitleStandard + ListItem checklist). No top illustration — title/body only,
 * matching SumSub VerifyIdentity (Connor: remove the icon on this view).
 */
const VerifyIdentity = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { colors } = useTheme();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const headerHandlers = useCardHeaderHandlers('close-with-confirmation');
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

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID="onboarding-step"
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        twClassName="bg-background-default"
        {...headerHandlers}
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow pb-4')}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        <TitleStandard
          title={strings('card.card_onboarding.verify_identity.title')}
          bottomLabel={strings(
            'card.card_onboarding.verify_identity.description',
          )}
          titleProps={{ testID: 'onboarding-step-title' }}
          bottomLabelProps={{ testID: 'onboarding-step-description' }}
          twClassName="px-4 pb-4"
        />
        <Box testID="onboarding-step-form-fields">
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
            title={strings(
              'card.card_onboarding.verify_identity.terms_1_title',
            )}
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
            title={strings(
              'card.card_onboarding.verify_identity.terms_2_title',
            )}
            description={terms2Description}
            testID="verify-identity-term-id"
          />

          {startVerificationIsError ? (
            <HelpText
              severity={HelpTextSeverity.Danger}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              testID="verify-identity-start-verification-error"
              twClassName="text-center px-4 mt-4"
            >
              {startVeriricationErr}
            </HelpText>
          ) : !sessionUrl && !startVerificationIsLoading ? (
            <HelpText
              severity={HelpTextSeverity.Danger}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              testID="verify-identity-start-verification-error"
              twClassName="text-center px-4 mt-4"
            >
              {strings(
                'card.card_onboarding.verify_identity.start_verification_error',
              )}
            </HelpText>
          ) : null}
        </Box>
      </ScrollView>
      <Box twClassName="gap-2 px-4 pb-2 pt-4" testID="onboarding-step-actions">
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
      </Box>
    </SafeAreaView>
  );
};

export default VerifyIdentity;
