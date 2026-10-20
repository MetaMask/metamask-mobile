import React, { useCallback } from 'react';
import { Image, ScrollView, useWindowDimensions } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  HeaderStandard,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import { selectCardHomeData } from '../../../../../selectors/cardController';
import ManageCardListItem from '../../components/ManageCardListItem';
import AddToWalletButton from '../../pushProvisioning/components/AddToWalletButton';
import { getWalletName } from '../../pushProvisioning/constants';
import { useCardWalletProvisioning } from '../CardHome/hooks/useCardWalletProvisioning';
import applePayMark from '../../components/ApplePayUsageSheet/assets/apple-pay-mark.png';
import hero from './assets/hero.png';
import { navigateToApplePayEntry } from './navigateToApplePayEntry';
import { useApplePayHomeEligibility } from './useApplePayHomeEligibility';

interface ApplePaySplashParams {
  ApplePaySplash?: { source?: 'home' | 'card' };
}

const HERO_WIDTH = 874 / 3;
const HERO_ASPECT_RATIO = 874 / 1209;

const ApplePaySplash = () => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const route = useRoute<RouteProp<ApplePaySplashParams, 'ApplePaySplash'>>();
  const source = route.params?.source ?? 'card';
  const tw = useTailwind();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const cardHomeData = useSelector(selectCardHomeData);
  const homeEligibility = useApplePayHomeEligibility();
  const { initiateProvisioning } = useCardWalletProvisioning(
    source === 'card' ? cardHomeData : null,
    { platformWalletSupported: true },
  );

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleHomePress = useCallback(() => {
    if (homeEligibility.mode === 'none') {
      navigation.goBack();
      return;
    }
    navigateToApplePayEntry(navigation, homeEligibility.mode, {
      dismissCurrentScreen: true,
    });
  }, [homeEligibility.mode, navigation]);

  const handleCardPress = useCallback(() => {
    initiateProvisioning().catch(() => undefined);
  }, [initiateProvisioning]);

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
          {source === 'home' && homeEligibility.mode === 'sign_in' ? (
            <ManageCardListItem
              title={strings('card.push_provisioning.add_to_wallet', {
                walletName: getWalletName(),
              })}
              startAccessory={
                <Image
                  source={applePayMark}
                  resizeMode="contain"
                  accessible={false}
                  style={tw.style('w-10 h-6')}
                />
              }
              rightIcon={IconName.ArrowRight}
              onPress={handleHomePress}
              testID="apple-pay-splash-add-row"
            />
          ) : (
            <AddToWalletButton
              onPress={source === 'home' ? handleHomePress : handleCardPress}
              buttonStyle="black"
              testID="apple-pay-splash-add"
            />
          )}
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default ApplePaySplash;
