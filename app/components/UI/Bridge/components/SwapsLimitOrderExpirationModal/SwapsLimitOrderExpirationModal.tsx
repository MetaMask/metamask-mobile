import React, { useCallback, useEffect, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  ListItemSelect,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  SWAPS_LIMIT_ORDER_EXPIRATION_CLOSE_DELAY_MS,
  SWAPS_LIMIT_ORDER_EXPIRATION_OPTIONS_MINUTES,
  getSwapsLimitOrderExpirationLabel,
  type SwapsLimitOrderExpirationMinutes,
} from '../../constants/limitOrders';
import { SwapsLimitOrderExpirationModalSelectorsIDs } from './testIds';
import type { SwapsLimitOrderExpirationModalProps } from './types';

const SwapsLimitOrderExpirationModal: React.FC<
  SwapsLimitOrderExpirationModalProps
> = ({
  selectedMinutes,
  onSelect,
  onClose,
  goBack,
  testID = SwapsLimitOrderExpirationModalSelectorsIDs.SHEET,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  useEffect(
    () => () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    },
    [],
  );

  const handleSelect = useCallback(
    (minutes: SwapsLimitOrderExpirationMinutes) => {
      onSelect(minutes);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      // Brief delay so the user sees the new selection before the sheet closes.
      closeTimeoutRef.current = setTimeout(
        closeSheet,
        SWAPS_LIMIT_ORDER_EXPIRATION_CLOSE_DELAY_MS,
      );
    },
    [closeSheet, onSelect],
  );

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
            onPress={() => handleSelect(minutes)}
            testID={SwapsLimitOrderExpirationModalSelectorsIDs.OPTION(minutes)}
          />
        ))}
      </Box>
    </BottomSheet>
  );
};

export default SwapsLimitOrderExpirationModal;
