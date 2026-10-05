import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  ButtonSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { ProHubTestIds } from '../../ProHub.testIds';

interface PaymentFailureSheetProps {
  isVisible: boolean;
  onTryAgain: () => void;
  onDismiss: () => void;
}

/**
 * Demo sheet shown after the "Adding funds" toast when the selected outcome
 * is a payment failure.
 */
const PaymentFailureSheet = ({
  isVisible,
  onTryAgain,
  onDismiss,
}: PaymentFailureSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleClose = useCallback(() => {
    if (!sheetRef.current) {
      onDismiss();
      return;
    }
    sheetRef.current.onCloseBottomSheet(onDismiss);
  }, [onDismiss]);

  const handleTryAgain = useCallback(() => {
    if (!sheetRef.current) {
      onTryAgain();
      return;
    }
    sheetRef.current.onCloseBottomSheet(onTryAgain);
  }, [onTryAgain]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      keyboardAvoidingViewEnabled={false}
      onClose={onDismiss}
      testID={ProHubTestIds.PAYMENT_FAILURE_SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: ProHubTestIds.PAYMENT_FAILURE_CLOSE,
        }}
      />
      <Box alignItems={BoxAlignItems.Center} twClassName="px-4 pb-4">
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="h-12 w-12 rounded-full bg-error-muted"
        >
          <Icon
            name={IconName.Error}
            size={IconSize.Xl}
            color={IconColor.ErrorDefault}
          />
        </Box>
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Bold}
          twClassName="text-center pt-4"
          testID={ProHubTestIds.PAYMENT_FAILURE_TITLE}
        >
          {strings('pro_hub.membership_alert.payment_failed.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Regular}
          twClassName="text-center py-4"
          testID={ProHubTestIds.PAYMENT_FAILURE_DESCRIPTION}
        >
          {strings('pro_hub.membership_alert.payment_failed.description')}
        </Text>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('pro_hub.add_funds_toast.failed_action'),
          onPress: handleTryAgain,
          size: ButtonSize.Lg,
          testID: ProHubTestIds.PAYMENT_FAILURE_TRY_AGAIN,
        }}
      />
    </BottomSheet>
  );
};

export default PaymentFailureSheet;
