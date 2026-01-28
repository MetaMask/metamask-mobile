import React, { useCallback, useEffect } from 'react';
import { Image, Dimensions, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardScreens } from '../../util/metrics';
import MM_CARD_ONBOARDING_FAILED from '../../../../../images/mm-card-onboarding-failed.png';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { colors as importedColors } from '../../../../../styles/common';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Threshold for small screen adjustments
const IS_SMALL_SCREEN = screenHeight < 700;

// Image position from top (percentage of screen)
const IMAGE_TOP = IS_SMALL_SCREEN ? '28%' : '25%';

// Responsive image dimensions
const IMAGE_WIDTH = IS_SMALL_SCREEN ? screenWidth * 1.5 : screenWidth * 1.2;
const IMAGE_HEIGHT = IS_SMALL_SCREEN ? screenHeight * 0.8 : screenHeight * 0.75;

const styles = StyleSheet.create({
  imageContainer: {
    position: 'absolute',
    top: IMAGE_TOP,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 1,
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
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
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useMetrics();

  useEffect(() => {
    dispatch(resetOnboardingState());
  }, [dispatch]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.KYC_FAILED,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const navigateToHome = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME);
  }, [navigation]);

  return (
    <Box twClassName="flex-1" style={tw.style('bg-[#330745]')}>
      {/* Header with back button */}
      <SafeAreaView edges={['top']} style={styles.headerContainer}>
        <Box twClassName="px-4 py-2 items-start">
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSizes.Lg}
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
            twClassName="text-white opacity-80 mt-4"
            testID="kyc-failed-description"
          >
            {strings('card.card_onboarding.kyc_failed.description')}
          </Text>
        </Box>
      </SafeAreaView>

      {/* Image - positioned absolutely to extend behind footer */}
      <View style={styles.imageContainer}>
        <Image
          source={MM_CARD_ONBOARDING_FAILED}
          resizeMode="contain"
          style={styles.image}
          testID="kyc-failed-image"
        />
      </View>

      {/* Footer */}
      <SafeAreaView
        edges={['bottom']}
        style={[
          styles.footerContainer,
          tw.style('absolute bottom-0 left-0 right-0 px-4'),
        ]}
      >
        <Box twClassName="pt-2 pb-4">
          <Button
            variant={ButtonVariants.Primary}
            label={strings('card.card_onboarding.kyc_failed.close_button')}
            size={ButtonSize.Lg}
            onPress={navigateToHome}
            width={ButtonWidthTypes.Full}
            testID="kyc-failed-close-button"
          />
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default KYCFailed;
