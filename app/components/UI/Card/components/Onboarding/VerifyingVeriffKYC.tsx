import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StatusBar } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useUserRegistrationStatus from '../../hooks/useUserRegistrationStatus';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardScreens, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import ImmersveVerifyingIdentityAnimation from './ImmersveVerifyingIdentityAnimation';

// Timeout before sending the user to Card home (KYC still pending)
const POLLING_TIMEOUT_MS = 30000;

/**
 * Screen shown after Veriff KYC WebView completes.
 * Polls the registration status to check if the user was approved or rejected.
 * - VERIFIED: Navigate to PERSONAL_DETAILS to continue onboarding
 * - REJECTED: Navigate to KYC_FAILED
 * - PENDING: After 30 seconds of polling, go to Card home (pending state)
 *
 * Visual: centred VBA verifying-identity terminal (same Rive + TitleStandard
 * pattern as the Immersve "Finish verifying" reopen prompt).
 */
const VerifyingVeriffKYC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const headerHandlers = useCardHeaderHandlers('close-direct');
  const isDarkTheme = useTheme().themeAppearance === AppThemeKey.dark;
  // This screen no longer uses OnboardingStep, which was what set the status
  // bar. Veriff's native UI can leave dark-content icons on a dark background.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(
        isDarkTheme ? 'light-content' : 'dark-content',
        true,
      );
    }, [isDarkTheme]),
  );
  const { trackEvent, createEventBuilder } = useAnalytics();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { verificationState, startPolling, stopPolling } =
    useUserRegistrationStatus();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Baanx, {
            screen: CardScreens.VERIFYING_VERIFF_KYC,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => {
    startPolling();

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.HOME, params: { fromKycPending: true } }],
      });
    }, POLLING_TIMEOUT_MS);

    return () => {
      stopPolling();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [startPolling, stopPolling, navigation]);

  useEffect(() => {
    if (verificationState === 'VERIFIED') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.PERSONAL_DETAILS }],
      });
    } else if (verificationState === 'REJECTED') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
      });
    }

    // PENDING state continues polling until timeout
  }, [verificationState, navigation]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID="verifying-veriff-kyc-container"
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        twClassName="bg-background-default"
        {...headerHandlers}
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 pb-6')}
      >
        <TitleStandard
          title={strings(
            'card.card_onboarding.verifying_veriff_kyc.in_progress_title',
          )}
          bottomLabel={strings(
            'card.card_onboarding.verifying_veriff_kyc.in_progress_description',
          )}
          titleProps={{
            twClassName: 'text-center',
            testID: 'verifying-veriff-kyc-title',
          }}
          titleWrapperProps={{ justifyContent: BoxJustifyContent.Center }}
          bottomLabelProps={{
            twClassName: 'text-center',
            testID: 'verifying-veriff-kyc-description',
          }}
          bottomLabelWrapperProps={{
            justifyContent: BoxJustifyContent.Center,
          }}
          topAccessory={
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="mb-5 w-full overflow-hidden"
              testID="verifying-veriff-kyc-illustration"
            >
              <ImmersveVerifyingIdentityAnimation />
            </Box>
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default VerifyingVeriffKYC;
