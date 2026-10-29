import React, { useCallback, useRef } from 'react';
import { Image, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextButton,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { selectApplePayLearnMoreUrl } from '../../../../../selectors/featureFlagController/card';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import ApplePayHandGraphic from '../ApplePayHandGraphic';
import marksLight from '../../Views/ApplePayConfirmation/assets/marks-light.png';
import marksDark from '../../Views/ApplePayConfirmation/assets/marks-dark.png';
import { ApplePayUsageSheetSelectors } from './ApplePayUsageSheet.testIds';

const MARKS_WIDTH = 141;
const MARKS_ASPECT_RATIO = 465 / 129;

const ApplePayUsageSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { themeAppearance } = useTheme();
  const isDark = themeAppearance === AppThemeKey.dark;
  const applePayLearnMoreUrl = useSelector(selectApplePayLearnMoreUrl);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleLearnMore = useCallback(() => {
    Linking.openURL(applePayLearnMoreUrl).catch(() => undefined);
  }, [applePayLearnMoreUrl]);

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
        <Text
          variant={TextVariant.HeadingSm}
          twClassName="text-center"
          testID={ApplePayUsageSheetSelectors.TITLE}
        >
          {strings('card.apple_pay_usage.title')}
        </Text>
      </BottomSheetHeader>
      <Box twClassName="items-center px-4 pb-4">
        <Box twClassName="mt-2 w-full">
          <ApplePayHandGraphic
            testID={ApplePayUsageSheetSelectors.GRAPHIC}
            imageTestID={ApplePayUsageSheetSelectors.HAND}
          />
        </Box>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="mt-4 text-center text-text-alternative"
          testID={ApplePayUsageSheetSelectors.INSTRUCTIONS}
        >
          {strings('card.apple_pay_usage.instructions')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="mt-3 text-center text-text-alternative"
          testID={ApplePayUsageSheetSelectors.MARKS_COPY}
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
        <TextButton
          variant={TextVariant.BodySm}
          twClassName="mt-6"
          onPress={handleLearnMore}
          testID={ApplePayUsageSheetSelectors.LEARN_MORE_BUTTON}
        >
          {strings('card.apple_pay_usage.learn_more')}
        </TextButton>
        <Box twClassName="mt-4 w-full">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleClose}
            testID={ApplePayUsageSheetSelectors.CONTINUE_BUTTON}
          >
            {strings('card.apple_pay_usage.got_it')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default ApplePayUsageSheet;
