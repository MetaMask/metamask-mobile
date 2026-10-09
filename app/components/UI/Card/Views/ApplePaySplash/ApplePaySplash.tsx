import React, { useCallback } from 'react';
import { Image, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  HeaderStandard,
  IconSize,
  Spinner,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import { AddToWalletButton } from '../../pushProvisioning/components/AddToWalletButton';
import { useCardWalletProvisioning } from '../CardHome/hooks/useCardWalletProvisioning';
import lockupLight from './assets/lockup-light.png';
import lockupDark from './assets/lockup-dark.png';
import hero from './assets/hero.png';

const LOCKUP_WIDTH = 175;
const LOCKUP_ASPECT_RATIO = 525 / 170;
const HERO_ASPECT_RATIO = 620 / 1283;

const ApplePaySplash = () => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const { themeAppearance } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isDark = themeAppearance === AppThemeKey.dark;
  const { data } = useCardHomeData();
  const { initiateProvisioning, isProvisioning } = useCardWalletProvisioning(
    data,
    {
      showSuccessToast: false,
      onSuccess: () => {
        navigation.replace(Routes.CARD.APPLE_PAY_CONFIRMATION);
      },
    },
  );

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAddToWallet = useCallback(() => {
    initiateProvisioning();
  }, [initiateProvisioning]);

  const lockupWidth = Math.min(LOCKUP_WIDTH, screenWidth - 112);
  const heroWidth = Math.min(207, screenWidth * 0.62);

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
      <Box twClassName="items-center -mt-9">
        <Image
          source={isDark ? lockupDark : lockupLight}
          resizeMode="contain"
          accessibilityLabel={strings('card.apple_pay_splash.lockup_label')}
          testID={`apple-pay-splash-lockup-${isDark ? 'dark' : 'light'}`}
          style={{
            width: lockupWidth,
            height: lockupWidth / LOCKUP_ASPECT_RATIO,
          }}
        />
      </Box>
      <Box twClassName="px-7 pt-6">
        <Text variant={TextVariant.DisplayMd} twClassName="text-center">
          {strings('card.apple_pay_splash.title')}
        </Text>
      </Box>
      <Box twClassName="flex-1 items-center justify-center px-4">
        <Image
          source={hero}
          resizeMode="contain"
          testID="apple-pay-splash-hero"
          style={{
            width: heroWidth,
            height: heroWidth / HERO_ASPECT_RATIO,
          }}
        />
      </Box>
      <SafeAreaView edges={['bottom']}>
        <Box twClassName="w-full items-center px-4 pb-4">
          {isProvisioning ? (
            <Box twClassName="py-3">
              <Spinner
                testID="apple-pay-splash-spinner"
                spinnerIconProps={{ size: IconSize.Xl }}
              />
            </Box>
          ) : (
            <AddToWalletButton
              onPress={handleAddToWallet}
              buttonStyle={isDark ? 'blackOutline' : 'black'}
              buttonType="basic"
              borderRadius={12}
              testID="apple-pay-splash-add-to-wallet"
            />
          )}
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default ApplePaySplash;
