import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
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
import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../../core/NavigationService';
import {
  NotificationMoment,
  playNotification,
} from '../../../../../util/haptics';
import { PaymentFailedSheetTestIds } from './PaymentFailedSheet.testIds';

interface PaymentFailedSheetProps {
  onClose: () => void;
}

/**
 * Shown when a provisional membership payment does not complete.
 * Try again opens the Money Account add-funds sheet.
 */
const PaymentFailedSheet = ({ onClose }: PaymentFailedSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const tryAgainRef = useRef(false);

  useEffect(() => {
    playNotification(NotificationMoment.Error);
  }, []);

  const closeSheet = useCallback(
    (openAddMoney: boolean) => {
      sheetRef.current?.onCloseBottomSheet(() => {
        onClose();
        if (!openAddMoney) {
          return;
        }
        NavigationService.navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
        });
      });
    },
    [onClose],
  );

  const handleClose = useCallback(() => {
    tryAgainRef.current = false;
    closeSheet(false);
  }, [closeSheet]);

  const handleTryAgain = useCallback(() => {
    if (tryAgainRef.current) {
      return;
    }
    tryAgainRef.current = true;
    closeSheet(true);
  }, [closeSheet]);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('pro_subscription.payment.try_again'),
      onPress: handleTryAgain,
      testID: PaymentFailedSheetTestIds.TRY_AGAIN,
      size: ButtonSize.Lg,
    }),
    [handleTryAgain],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      testID={PaymentFailedSheetTestIds.SHEET}
      keyboardAvoidingViewEnabled={false}
      onClose={onClose}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: PaymentFailedSheetTestIds.CLOSE,
        }}
      >
        <Box twClassName="flex-row items-center gap-2">
          <Icon
            name={IconName.Danger}
            color={IconColor.ErrorDefault}
            size={IconSize.Lg}
          />
          <Text
            variant={TextVariant.HeadingSm}
            testID={PaymentFailedSheetTestIds.TITLE}
          >
            {strings('pro_subscription.payment.failed_title')}
          </Text>
        </Box>
      </BottomSheetHeader>
      <Box twClassName="px-4">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={PaymentFailedSheetTestIds.BODY}
        >
          {strings('pro_subscription.payment.failed_body')}
        </Text>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={primaryButtonProps}
        twClassName="pt-6"
      />
    </BottomSheet>
  );
};

export default PaymentFailedSheet;
