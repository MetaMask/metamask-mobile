import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ListItemSelect,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  SWAPS_LIMIT_ORDER_EXPIRATION_OPTIONS_MINUTES,
  getSwapsLimitOrderExpirationLabel,
} from '../../constants/limitOrders';
import { SwapsLimitOrderExpirationModalSelectorsIDs } from './testIds';
import type { SwapsLimitOrderExpirationModalProps } from './types';

const SwapsLimitOrderExpirationModal: React.FC<
  SwapsLimitOrderExpirationModalProps
> = ({
  selectedMinutes,
  onSelect,
  onConfirm,
  onClose,
  goBack,
  testID = SwapsLimitOrderExpirationModalSelectorsIDs.SHEET,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(selectedMinutes);
    closeSheet();
  }, [closeSheet, onConfirm, selectedMinutes]);

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
          testID: SwapsLimitOrderExpirationModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.limit.expiration')}
      </BottomSheetHeader>
      <Box paddingBottom={2}>
        {SWAPS_LIMIT_ORDER_EXPIRATION_OPTIONS_MINUTES.map((minutes) => (
          <ListItemSelect
            key={minutes}
            title={getSwapsLimitOrderExpirationLabel(minutes)}
            isSelected={selectedMinutes === minutes}
            showSelectedIcon
            onPress={() => onSelect(minutes)}
            testID={SwapsLimitOrderExpirationModalSelectorsIDs.OPTION(minutes)}
          />
        ))}
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('bridge.confirm'),
          onPress: handleConfirm,
          testID: SwapsLimitOrderExpirationModalSelectorsIDs.CONFIRM_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

export default SwapsLimitOrderExpirationModal;
