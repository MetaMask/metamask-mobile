import React, { useCallback, useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
import type { RootState } from '../../../reducers';

const VerificationCodeBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const hasDisplayedOtpRef = useRef(false);
  const hasAutoClosedRef = useRef(false);
  const { otp, phase } = useSelector((state: RootState) => ({
    otp: state.engine.backgroundState.QrSyncController.otp?.otp ?? '',
    phase: state.engine.backgroundState.QrSyncController.phase,
  }));

  const closeSheet = useCallback(() => {
    navigation.goBack();
    setTimeout(() => {
      navigation.goBack();
    }, 100);
  }, [navigation]);

  const goBack = useCallback(() => {
    DeviceEventEmitter.emit('addDeviceVerificationDone');
    closeSheet();
  }, [closeSheet]);

  useEffect(() => {
    if (otp) {
      hasDisplayedOtpRef.current = true;
    }

    if (
      hasDisplayedOtpRef.current &&
      !hasAutoClosedRef.current &&
      (phase !== 'displaying-otp' || !otp)
    ) {
      hasAutoClosedRef.current = true;
      closeSheet();
    }
  }, [closeSheet, otp, phase]);

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
          {otp}
        </Text>
        <Button twClassName="w-full" onPress={goBack}>
          {strings('app_settings.add_device.done')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default VerificationCodeBottomSheet;
