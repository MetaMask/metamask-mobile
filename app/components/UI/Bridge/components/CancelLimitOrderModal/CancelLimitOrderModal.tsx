import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CancelLimitOrderModalSelectorsIDs } from './testIds';
import type { CancelLimitOrderModalProps } from './types';

export const CancelLimitOrderModal = ({
  onConfirm,
  onClose,
  goBack,
  testID = CancelLimitOrderModalSelectorsIDs.SHEET,
}: CancelLimitOrderModalProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm();
    closeSheet();
  }, [closeSheet, onConfirm]);

  return (
    <BottomSheet
      ref={sheetRef}
      testID={testID}
      goBack={goBack}
      onClose={onClose}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: CancelLimitOrderModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.limit.cancel_order')}
      </BottomSheetHeader>
      <Box
        alignItems={BoxAlignItems.Center}
        paddingHorizontal={4}
        paddingBottom={4}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={CancelLimitOrderModalSelectorsIDs.DESCRIPTION}
        >
          {strings('bridge.limit.cancel_order_confirmation')}
        </Text>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('bridge.confirm'),
          onPress: handleConfirm,
          testID: CancelLimitOrderModalSelectorsIDs.CONFIRM_BUTTON,
        }}
      />
    </BottomSheet>
  );
};
