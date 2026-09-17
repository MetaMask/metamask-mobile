import React, { useCallback, useEffect, useRef } from 'react';
import { Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardScreens, withCardProvider } from '../../util/metrics';
import { selectCardActiveProviderId } from '../../../../../selectors/cardController';
import MM_CARD_ONBOARDING_FAILED from '../../../../../images/mm-card-onboarding-failed.png';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';
import { colors as importedColors } from '../../../../../styles/common';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';

const staticStyles = StyleSheet.create({
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  headerContainer: {
    zIndex: 2,
  },
  footerContainer: {
    zIndex: 3,
  },
});

/**
 * Screen shown when KYC verification has failed.
 * Informs the user they are not eligible for the MetaMask Card.
 */
const KYCFailed = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const tw = useTailwind();
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
    <Box twClassName="flex-1" style={tw.style(`bg-[${brandColor.purple800}]`)}>
      <Image
        source={MM_CARD_ONBOARDING_FAILED}
        resizeMode="cover"
        style={staticStyles.backgroundImage}
        testID="kyc-failed-image"
      />

      {/* Header with back button */}
      <SafeAreaView edges={['top']} style={staticStyles.headerContainer}>
        <Box twClassName="px-4 py-2 items-start">
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSizes.Md}
            iconColor={importedColors.white}
            onPress={navigateToHome}
            testID="kyc-failed-back-button"
          />
        </Box>

        {/* Title and description */}
        <Box twClassName="px-4 mb-4">
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-white"
            testID="kyc-failed-title"
          >
            {strings('card.card_onboarding.kyc_failed.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-white opacity-80 mt-2"
            testID="kyc-failed-description"
          >
            {strings('card.card_onboarding.kyc_failed.description')}
          </Text>
        </Box>
      </SafeAreaView>

      {/* Footer */}
      <SafeAreaView
        edges={['bottom']}
        style={[
          staticStyles.footerContainer,
          tw.style('absolute bottom-0 left-0 right-0 px-4'),
        ]}
      >
        <Box twClassName="pt-2 pb-4">
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
    </Box>
  );
};

export default KYCFailed;
