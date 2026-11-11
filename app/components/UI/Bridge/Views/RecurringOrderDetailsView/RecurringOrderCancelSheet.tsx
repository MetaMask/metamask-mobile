import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  ButtonSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { RecurringOrderDetailsViewSelectorsIDs } from './RecurringOrderDetailsView.testIds';

interface RecurringOrderCancelSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  onSuccess: () => void;
  isSubmitting: boolean;
}

export function RecurringOrderCancelSheet({
  isVisible,
  onClose,
  onSubmit,
  onSuccess,
  isSubmitting,
}: RecurringOrderCancelSheetProps) {
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    sheetRef.current?.onCloseBottomSheet();
  }, [isSubmitting]);

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    try {
      await onSubmit();
      sheetRef.current?.onCloseBottomSheet(onSuccess);
    } catch {
      // Keep the sheet open so the user can retry.
    }
  }, [isSubmitting, onSubmit, onSuccess]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      isInteractable={!isSubmitting}
      testID={RecurringOrderDetailsViewSelectorsIDs.CANCEL_SHEET}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID:
            RecurringOrderDetailsViewSelectorsIDs.CANCEL_SHEET_CLOSE_BUTTON,
        }}
      >
        {strings('bridge.recurring.cancel_confirmation_title')}
      </BottomSheetHeader>
      <Box paddingHorizontal={4} paddingBottom={4}>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('bridge.recurring.cancel_confirmation_body')}
        </Text>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('bridge.recurring.confirm'),
          onPress: handleConfirm,
          size: ButtonSize.Lg,
          isLoading: isSubmitting,
          isDisabled: isSubmitting,
          isFullWidth: true,
          testID:
            RecurringOrderDetailsViewSelectorsIDs.CANCEL_SHEET_CONFIRM_BUTTON,
        }}
      />
    </BottomSheet>
  );
}
