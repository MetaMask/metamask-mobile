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
import hero from '../../Views/ApplePaySplash/assets/hero.png';
import { ApplePayAddSheetSelectors } from './ApplePayAddSheet.testIds';

const HERO_WIDTH = 220;
const HERO_ASPECT_RATIO = 874 / 1209;

const ApplePayAddSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();

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
      testID={ApplePayAddSheetSelectors.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: ApplePayAddSheetSelectors.CLOSE_BUTTON,
        }}
      >
        <Text variant={TextVariant.HeadingSm} twClassName="text-center">
          {strings('card.apple_pay_add.title')}
        </Text>
      </BottomSheetHeader>
      <Box twClassName="items-center px-4 pt-4 pb-4">
        <Image
          source={hero}
          resizeMode="contain"
          accessible={false}
          testID={ApplePayAddSheetSelectors.HERO}
          style={{
            width: HERO_WIDTH,
            height: HERO_WIDTH / HERO_ASPECT_RATIO,
          }}
        />
        <Text
          variant={TextVariant.BodyMd}
          twClassName="mt-4 text-center text-text-alternative"
        >
          {strings('card.apple_pay_add.description')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="mt-4 text-center text-text-alternative"
        >
          {strings('card.apple_pay_add.details')}
        </Text>
        <Box twClassName="mt-6 w-full">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleClose}
            testID={ApplePayAddSheetSelectors.GOT_IT_BUTTON}
          >
            {strings('card.apple_pay_add.got_it')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default ApplePayAddSheet;
