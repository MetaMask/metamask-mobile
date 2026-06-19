import React, { useCallback, useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
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
  Button,
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
  const pendingNavigationTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(
    () => () => {
      if (pendingNavigationTimeoutRef.current) {
        clearTimeout(pendingNavigationTimeoutRef.current);
      }
    },
    [],
  );

  const goBack = useCallback(() => {
    DeviceEventEmitter.emit('addDeviceVerificationDone');
    navigation.goBack();
    pendingNavigationTimeoutRef.current = setTimeout(() => {
      pendingNavigationTimeoutRef.current = null;
      navigation.goBack();
    }, 100);
  }, [navigation]);

  return (
    <BottomSheet ref={bottomSheetRef} goBack={goBack}>
      <BottomSheetHeader onClose={goBack}>
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
        <Button twClassName="w-full" onPress={goBack}>
          {strings('app_settings.add_device.done')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default VerificationCodeBottomSheet;
