import React, { useCallback, useEffect } from 'react';
import { Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import WaitingKYCImage from '../../../../../images/waiting-kyc-card.png';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { colors as importedColors } from '../../../../../styles/common';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Threshold for small screen adjustments
const IS_SMALL_SCREEN = screenHeight < 700;

// Responsive image dimensions
const IMAGE_WIDTH = IS_SMALL_SCREEN ? screenWidth * 1.2 : screenWidth * 1.3;
const IMAGE_HEIGHT = IS_SMALL_SCREEN
  ? screenHeight * 0.48
  : screenHeight * 0.55;

/**
 * Screen shown when KYC verification is still pending after the polling timeout.
 * Informs the user that approvals typically take around 12 hours and they will be notified.
 */
const KYCPending = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useMetrics();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.KYC_PENDING,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleBack = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME);
  }, [navigation]);

  const handleGotIt = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME);
  }, [navigation]);

  return (
    <Box twClassName="flex-1" style={tw.style('bg-accent04-dark')}>
      {/* Header with back button */}
      <SafeAreaView edges={['top']}>
        <Box twClassName="px-4 py-2 items-start">
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSizes.Lg}
            iconColor={importedColors.white}
            onPress={handleBack}
            testID="kyc-pending-back-button"
          />
        </Box>
      </SafeAreaView>

      {/* Content */}
      <Box twClassName="flex-1 px-4">
        {/* Title and description */}
        <Box twClassName="mb-4">
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-white"
            testID="kyc-pending-title"
          >
            {strings('card.card_onboarding.kyc_pending.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-white opacity-80 mt-4"
            testID="kyc-pending-description"
          >
            {strings('card.card_onboarding.kyc_pending.description')}
          </Text>
        </Box>

        {/* Image - aligned left, extends beyond right edge */}
        <Box twClassName="flex-1 justify-center items-start -ml-1 overflow-visible">
          <Image
            source={WaitingKYCImage}
            resizeMode="contain"
            style={tw.style(`w-[${IMAGE_WIDTH}px] h-[${IMAGE_HEIGHT}px]`)}
            testID="kyc-pending-image"
          />
        </Box>

        {/* Footer */}
        <SafeAreaView edges={['bottom']}>
          <Box twClassName="pt-2 pb-4">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-white text-center mb-4"
            >
              {strings('card.card_onboarding.kyc_pending.footer_text')}
            </Text>
            <Button
              variant={ButtonVariants.Primary}
              label={strings('card.card_onboarding.kyc_pending.got_it_button')}
              size={ButtonSize.Lg}
              onPress={handleGotIt}
              width={ButtonWidthTypes.Full}
              testID="kyc-pending-got-it-button"
            />
          </Box>
        </SafeAreaView>
      </Box>
    </Box>
  );
};

export default KYCPending;
