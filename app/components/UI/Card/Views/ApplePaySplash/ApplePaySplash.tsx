import React, { useCallback } from 'react';
import { Image, ScrollView, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonBaseSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import hero from './assets/hero.png';

const HERO_WIDTH = 874 / 3;
const HERO_ASPECT_RATIO = 874 / 1209;

const ApplePaySplash = () => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const tw = useTailwind();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const heroWidth = Math.min(HERO_WIDTH, screenWidth - 32);
  const heroHeight = Math.min(
    heroWidth / HERO_ASPECT_RATIO,
    screenHeight * 0.42,
  );

  return (
    <Box twClassName="flex-1 bg-background-default">
      <HeaderStandard
        includesTopInset
        twClassName="bg-background-default"
        onClose={handleClose}
        closeButtonProps={{
          testID: 'apple-pay-splash-close',
          accessibilityLabel: strings('card.apple_pay_splash.close'),
        }}
      />
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('grow px-6')}
      >
        <Text variant={TextVariant.DisplayMd} twClassName="px-10 text-center">
          {strings('card.apple_pay_splash.title')}
        </Text>
        <Box twClassName="items-center py-4">
          <Image
            source={hero}
            resizeMode="contain"
            accessible={false}
            testID="apple-pay-splash-hero"
            style={{
              width: heroHeight * HERO_ASPECT_RATIO,
              height: heroHeight,
            }}
          />
        </Box>
        <Box alignItems={BoxAlignItems.Center} gap={4}>
          <Text variant={TextVariant.BodyMd} twClassName="text-center">
            {strings('card.apple_pay_splash.description')}
          </Text>
          <Text variant={TextVariant.BodyMd} twClassName="text-center">
            {strings('card.apple_pay_splash.no_downloads')}
          </Text>
          <Text variant={TextVariant.BodyMd} twClassName="text-center">
            {strings('card.apple_pay_splash.setup')}
          </Text>
        </Box>
      </ScrollView>
      <SafeAreaView edges={['bottom']}>
        <Box twClassName="px-4 pb-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            onPress={handleClose}
            testID="apple-pay-splash-continue"
          >
            {strings('card.apple_pay_splash.continue')}
          </Button>
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default ApplePaySplash;
