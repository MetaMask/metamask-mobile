import React, { useCallback, useEffect, useRef } from 'react';
import { Linking, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useExitCardFlow } from '../../hooks/useExitCardFlow';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardScreens, withCardProvider } from '../../util/metrics';
import { selectCardActiveProviderId } from '../../../../../selectors/cardController';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { useImmersveKycOutcome } from '../../hooks/useImmersveKycOutcome';
import { describeImmersveKycFinal } from '../../util/immersveKycReasons';
import { IMMERSVE_SUPPORT_EMAIL } from '../../constants';
import { useCardIntercomSupport } from '../../Views/CardHome/hooks/useCardIntercomSupport';
import { useParams } from '../../../../../util/navigation/navUtils';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import KYCFailedContent from './KYCFailedContent';

/**
 * Terminal Card KYC rejection. The body mirrors VBA's VbaAccountCreateError
 * terminal (see `KYCFailedContent`); Immersve shows that same body in place.
 */
const KYCFailed = () => {
  const exitCardFlow = useExitCardFlow();
  const { notifyKycRejected } = useImmersveKycOutcome();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const isDarkTheme = useTheme().themeAppearance === AppThemeKey.dark;
  // This screen no longer uses OnboardingStep, which was what set the status bar.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(
        isDarkTheme ? 'light-content' : 'dark-content',
        true,
      );
    }, [isDarkTheme]),
  );
  const { trackEvent, createEventBuilder } = useAnalytics();
  const activeProviderId = useSelector(selectCardActiveProviderId);
  const isImmersve = activeProviderId === CardProviderIds.Immersve;
  const { reasons } = useParams<{ reasons?: string[] }>();
  const openIntercomSupport = useCardIntercomSupport();
  const contactSupport = useCallback(() => {
    if (openIntercomSupport) {
      openIntercomSupport();
      return;
    }
    Linking.openURL(`mailto:${IMMERSVE_SUPPORT_EMAIL}`).catch(() => undefined);
  }, [openIntercomSupport]);
  const hasTrackedView = useRef(false);

  useEffect(() => {
    dispatch(resetOnboardingState());
  }, [dispatch]);

  useEffect(() => {
    // Wait for a known provider so we don't fire with a Baanx fallback then
    // again when Immersve resolves (duplicate / misattributed views).
    if (hasTrackedView.current || !activeProviderId) {
      return;
    }
    hasTrackedView.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(activeProviderId, {
            screen: CardScreens.KYC_FAILED,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder, activeProviderId]);

  const navigateToHome = useCallback(() => {
    // The screen is the explanation. Signing out stops a later Link card
    // from treating this Immersve session as ready. Baanx keeps its session.
    if (isImmersve) {
      notifyKycRejected(
        { type: 'rejected', reasons },
        { source: 'kyc_failed', toast: false },
      ).catch(() => undefined);
    }
    exitCardFlow();
  }, [isImmersve, reasons, exitCardFlow, notifyKycRejected]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID="kyc-failed-container"
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        onBack={navigateToHome}
        backButtonProps={{
          testID: 'kyc-failed-back-button',
        }}
        includesTopInset
      />
      <KYCFailedContent
        onClose={navigateToHome}
        {...(isImmersve
          ? {
              ...describeImmersveKycFinal(reasons),
              onContactSupport: contactSupport,
            }
          : {})}
      />
    </SafeAreaView>
  );
};

export default KYCFailed;
