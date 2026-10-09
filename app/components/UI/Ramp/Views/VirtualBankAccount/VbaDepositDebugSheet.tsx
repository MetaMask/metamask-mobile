import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

export const VbaDepositDebugSelectorsIDs = {
  SHEET: 'vba-deposit-debug-sheet',
  REFRESH_BUTTON: 'vba-deposit-debug-refresh',
  TRANSACTION_STATUS: 'vba-deposit-debug-transaction-status',
} as const;

interface VbaDepositDebugSheetProps {
  autorampId: string | null;
  autorampStatus: string | null;
  transactionStatus: string | null;
  loadError: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

/**
 * Local-only sheet for autoramp and deposit polling. Deposit progress belongs
 * on the activity screen; this exists so a device build can still see it.
 */
const VbaDepositDebugSheet = ({
  autorampId,
  autorampStatus,
  transactionStatus,
  loadError,
  onClose,
  onRefresh,
}: VbaDepositDebugSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleRefresh = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onRefresh);
  }, [onRefresh]);

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      keyboardAvoidingViewEnabled={false}
      testID={VbaDepositDebugSelectorsIDs.SHEET}
    >
      <Box twClassName="gap-3 px-4 pb-4 pt-2">
        <Text variant={TextVariant.HeadingMd}>{'Deposit debug'}</Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {`Autoramp: ${autorampId ?? 'none'}`}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {`Account status: ${autorampStatus ?? 'unknown'}`}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={VbaDepositDebugSelectorsIDs.TRANSACTION_STATUS}
        >
          {`Deposit: ${transactionStatus ?? 'none'}`}
        </Text>
        {loadError ? (
          <Text variant={TextVariant.BodyMd} color={TextColor.ErrorDefault}>
            {"Couldn't refresh the deposit."}
          </Text>
        ) : null}
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleRefresh}
          testID={VbaDepositDebugSelectorsIDs.REFRESH_BUTTON}
        >
          {'Refresh'}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default VbaDepositDebugSheet;
