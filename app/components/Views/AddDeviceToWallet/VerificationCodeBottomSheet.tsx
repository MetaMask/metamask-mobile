import React, { useCallback, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetHeader,
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';

interface VerificationCodeBottomSheetParams {
  verificationCode?: string;
}

const VerificationCodeBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const route = useRoute();
  const verificationCode = (
    route.params as VerificationCodeBottomSheetParams | undefined
  )?.verificationCode;

  const dismissSheet = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <BottomSheet ref={bottomSheetRef} goBack={dismissSheet}>
      <BottomSheetHeader>
        {strings('app_settings.add_device.enter_code_on_extension')}
      </BottomSheetHeader>
      <Box alignItems={BoxAlignItems.Center} twClassName="px-4 pb-6">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-left"
        >
          {strings('app_settings.add_device.enter_code_on_extension_desc')}
        </Text>
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          twClassName="my-6"
        >
          {verificationCode ??
            strings('app_settings.add_device.verification_code_pending')}
        </Text>
      </Box>
    </BottomSheet>
  );
};

export default VerificationCodeBottomSheet;
