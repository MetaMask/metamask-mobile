import React, { useCallback, useEffect, useRef } from 'react';
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
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { QrSyncPhases } from '../../../core/QrSync/constants';
import {
  selectQrSyncOtp,
  selectQrSyncPhase,
} from '../../../selectors/qrSyncController';

const VerificationCodeBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const phase = useSelector(selectQrSyncPhase);
  const otp = useSelector(selectQrSyncOtp) ?? '';

  const closeSheet = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    if (phase !== QrSyncPhases.DISPLAYING_OTP) {
      closeSheet();
    }
  }, [closeSheet, phase]);

  return (
    <BottomSheet ref={bottomSheetRef} goBack={closeSheet}>
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
          {otp}
        </Text>
      </Box>
    </BottomSheet>
  );
};

export default VerificationCodeBottomSheet;
