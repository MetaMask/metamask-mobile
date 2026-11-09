import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardScreens, withCardProvider } from '../../util/metrics';
import { selectCardActiveProviderId } from '../../../../../selectors/cardController';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import VbaAccountCreateFailure from '../../../Ramp/Views/VirtualBankAccount/assets/vba-account-create-failure.svg';

/**
 * Terminal Card KYC rejection. Mirrors VBA's VbaAccountCreateError terminal
 * pattern (TitleStandard + vba-account-create-failure.svg topAccessory) as a
 * stop-gap away from the old-brand purple full-bleed artwork.
 */
const KYCFailed = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { trackEvent, createEventBuilder } = useAnalytics();
  const activeProviderId = useSelector(selectCardActiveProviderId);
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
    navigation.navigate(Routes.WALLET.HOME);
  }, [navigation]);

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
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 pb-6')}
      >
        <TitleStandard
          title={strings('card.card_onboarding.kyc_failed.title')}
          bottomLabel={strings('card.card_onboarding.kyc_failed.description')}
          titleProps={{
            twClassName: 'text-center',
            testID: 'kyc-failed-title',
          }}
          titleWrapperProps={{ justifyContent: BoxJustifyContent.Center }}
          bottomLabelProps={{
            twClassName: 'text-center',
            testID: 'kyc-failed-description',
          }}
          bottomLabelWrapperProps={{
            justifyContent: BoxJustifyContent.Center,
          }}
          topAccessory={
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.End}
              twClassName="mb-5 w-full"
              testID="kyc-failed-illustration"
            >
              <VbaAccountCreateFailure name="vba-account-create-failure" />
            </Box>
          }
        />
      </ScrollView>
      <Box gap={2} paddingHorizontal={4} paddingTop={4} paddingBottom={2}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={navigateToHome}
          isFullWidth
          testID="kyc-failed-close-button"
        >
          {strings('card.card_onboarding.kyc_failed.close_button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default KYCFailed;
