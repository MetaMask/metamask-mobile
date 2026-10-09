import React, { useCallback } from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonBaseSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import check from './assets/check.png';
import marksLight from './assets/marks-light.png';
import marksDark from './assets/marks-dark.png';

const CHECK_WIDTH = 112;
const CHECK_ASPECT_RATIO = 336 / 255;
const MARKS_WIDTH = 155;
const MARKS_ASPECT_RATIO = 465 / 129;

const ApplePayConfirmation = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { themeAppearance } = useTheme();
  const isDark = themeAppearance === AppThemeKey.dark;

  const handleDone = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
  }, [navigation]);

  return (
    <Box twClassName="flex-1 bg-background-default">
      <SafeAreaView edges={['top']}>
        <Box twClassName="px-6 pt-14">
          <Image
            source={check}
            resizeMode="contain"
            accessible={false}
            testID="apple-pay-confirmation-check"
            style={{
              width: CHECK_WIDTH,
              height: CHECK_WIDTH / CHECK_ASPECT_RATIO,
            }}
          />
          <Text variant={TextVariant.DisplayLg} twClassName="mt-9">
            {strings('card.apple_pay_confirmation.title')}
          </Text>
          <Text variant={TextVariant.HeadingMd} twClassName="mt-3">
            {strings('card.apple_pay_confirmation.subtitle')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="mt-9 text-text-alternative"
          >
            {strings('card.apple_pay_confirmation.description')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="mt-9 text-text-alternative"
          >
            {strings('card.apple_pay_confirmation.symbols')}
          </Text>
          <Box twClassName="mt-3">
            <Image
              source={isDark ? marksDark : marksLight}
              resizeMode="contain"
              accessibilityLabel={strings(
                'card.apple_pay_confirmation.marks_label',
              )}
              testID={`apple-pay-confirmation-marks-${isDark ? 'dark' : 'light'}`}
              style={{
                width: MARKS_WIDTH,
                height: MARKS_WIDTH / MARKS_ASPECT_RATIO,
              }}
            />
          </Box>
        </Box>
      </SafeAreaView>
      <Box twClassName="flex-1" />
      <SafeAreaView edges={['bottom']}>
        <Box twClassName="px-4 pb-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            onPress={handleDone}
            testID="apple-pay-confirmation-done"
          >
            {strings('card.apple_pay_confirmation.done')}
          </Button>
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default ApplePayConfirmation;
