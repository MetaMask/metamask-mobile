import React, { useCallback, useRef } from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import marksLight from '../../Views/ApplePayConfirmation/assets/marks-light.png';
import marksDark from '../../Views/ApplePayConfirmation/assets/marks-dark.png';
import hand from './assets/hand.png';
import { ApplePayUsageSheetSelectors } from './ApplePayUsageSheet.testIds';

const HAND_WIDTH = 240;
const HAND_ASPECT_RATIO = 720 / 531;
const MARKS_WIDTH = 141;
const MARKS_ASPECT_RATIO = 465 / 129;

const ApplePayUsageSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { themeAppearance } = useTheme();
  const isDark = themeAppearance === AppThemeKey.dark;

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={ApplePayUsageSheetSelectors.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: ApplePayUsageSheetSelectors.CLOSE_BUTTON,
        }}
      >
        <Text variant={TextVariant.HeadingSm} twClassName="text-center">
          {strings('card.apple_pay_usage.title')}
        </Text>
      </BottomSheetHeader>
      <Box twClassName="items-center px-4 pt-7 pb-4">
        <Image
          source={hand}
          resizeMode="contain"
          accessible={false}
          testID={ApplePayUsageSheetSelectors.HAND}
          style={{
            width: HAND_WIDTH,
            height: HAND_WIDTH / HAND_ASPECT_RATIO,
          }}
        />
        <Text
          variant={TextVariant.BodyMd}
          twClassName="mt-4 text-center text-text-alternative"
        >
          {strings('card.apple_pay_usage.instructions')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="mt-4 text-center text-text-alternative"
        >
          {strings('card.apple_pay_usage.marks')}
        </Text>
        <Box twClassName="mt-4">
          <Image
            source={isDark ? marksDark : marksLight}
            resizeMode="contain"
            accessibilityLabel={strings('card.apple_pay_usage.marks_label')}
            testID={
              isDark
                ? ApplePayUsageSheetSelectors.MARKS_DARK
                : ApplePayUsageSheetSelectors.MARKS_LIGHT
            }
            style={{
              width: MARKS_WIDTH,
              height: MARKS_WIDTH / MARKS_ASPECT_RATIO,
            }}
          />
        </Box>
        <Box twClassName="mt-6 w-full">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleClose}
            testID={ApplePayUsageSheetSelectors.CONTINUE_BUTTON}
          >
            {strings('card.apple_pay_usage.continue')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default ApplePayUsageSheet;
