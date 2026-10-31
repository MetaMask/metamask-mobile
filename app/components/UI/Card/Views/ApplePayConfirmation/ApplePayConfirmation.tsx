import React, { useCallback, useEffect } from 'react';
import { Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
import ApplePayHandGraphic from '../../components/ApplePayHandGraphic';
import marksLight from './assets/marks-light.png';
import marksDark from './assets/marks-dark.png';

const MARKS_WIDTH = 155;
const MARKS_ASPECT_RATIO = 465 / 129;

const ApplePayConfirmation = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { themeAppearance } = useTheme();
  const isDark = themeAppearance === AppThemeKey.dark;

  const returnToCardHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      const actionType = event.data.action.type;
      if (actionType !== 'GO_BACK' && actionType !== 'POP') {
        return;
      }

      event.preventDefault();
      returnToCardHome();
    });

    return unsubscribe;
  }, [navigation, returnToCardHome]);

  return (
    <Box twClassName="flex-1 bg-background-default">
      <SafeAreaView edges={['top']} />
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('grow px-6 pt-8')}
      >
        <Text
          variant={TextVariant.DisplayMd}
          testID="apple-pay-confirmation-title"
        >
          {strings('card.apple_pay_confirmation.title')}
        </Text>
        <Box twClassName="mt-6">
          <ApplePayHandGraphic
            testID="apple-pay-confirmation-graphic"
            imageTestID="apple-pay-confirmation-hand"
          />
        </Box>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="mt-6 text-text-alternative"
          testID="apple-pay-confirmation-instructions"
        >
          {strings('card.apple_pay_confirmation.instructions')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="mt-4 text-text-alternative"
          testID="apple-pay-confirmation-marks-copy"
        >
          {strings('card.apple_pay_confirmation.marks')}
        </Text>
        <Box twClassName="mt-4">
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
      </ScrollView>
      <SafeAreaView edges={['bottom']}>
        <Box twClassName="px-4 pb-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            onPress={returnToCardHome}
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
