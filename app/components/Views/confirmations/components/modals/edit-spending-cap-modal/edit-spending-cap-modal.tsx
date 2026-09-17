import React, { useCallback, useRef, useState } from 'react';
import { Modal, View } from 'react-native';

import { ApproveComponentIDs } from '../../../ConfirmationView.testIds';
import { useStyles } from '../../../../../../component-library/hooks';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { ApproveMethod } from '../../../types/approve';
import { SpendingCapInput } from '../../spending-cap-input';
import styleSheet from './edit-spending-cap-modal.styles';

export interface EditSpendingCapProps {
  approveMethod: ApproveMethod;
  balance: string;
  decimals: number;
  onSpendingCapUpdate: (spendingCap: string) => Promise<void>;
  spendingCap: string;
  tokenSymbol?: string;
}

export interface ModalProps {
  onClose: () => void;
}

export const EditSpendingCapModal = ({
  approveMethod,
  balance,
  decimals,
  spendingCap,
  onSpendingCapUpdate,
  onClose,
  tokenSymbol,
}: EditSpendingCapProps & ModalProps) => {
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [newSpendingCap, setNewSpendingCap] = useState(spendingCap);
  const [error, setError] = useState<string | boolean>(false);
  const [isDataUpdating, setIsDataUpdating] = useState<boolean>(false);

  const handleRequestClose = useCallback(() => {
    if (!isDataUpdating) {
      bottomSheetRef.current?.onCloseBottomSheet();
    }
  }, [isDataUpdating]);

  const handleSheetClosed = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleRequestClose}
    >
      <BottomSheet
        ref={bottomSheetRef}
        keyboardAvoidingViewEnabled
        onClose={handleSheetClosed}
      >
        <BottomSheetHeader onClose={handleRequestClose}>
          {strings('confirm.edit_spending_cap_modal.title')}
        </BottomSheetHeader>
        <Box twClassName="flex flex-col p-4 pt-0">
          <Text
            variant={TextVariant.BodyMd}
            style={styles.description}
            color={TextColor.TextAlternative}
          >
            {strings('confirm.edit_spending_cap_modal.description')}
          </Text>
          <SpendingCapInput
            approveMethod={approveMethod}
            initialValue={spendingCap}
            decimals={decimals}
            onChange={(updatedSpendingCap) => {
              setNewSpendingCap(updatedSpendingCap);
            }}
            onErrorChange={(newError) => {
              setError(newError);
            }}
          />

          <Text
            variant={TextVariant.BodyMd}
            style={styles.balanceInfo}
            color={TextColor.TextAlternative}
          >
            {strings('confirm.edit_spending_cap_modal.account_balance')} :{' '}
            {balance} {tokenSymbol ?? ''}
          </Text>

          <View style={styles.buttonsContainer}>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isDisabled={isDataUpdating}
              style={styles.button}
              onPress={handleRequestClose}
            >
              {strings('confirm.edit_spending_cap_modal.cancel')}
            </Button>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              style={styles.button}
              isDisabled={!!error}
              testID={ApproveComponentIDs.EDIT_SPENDING_CAP_SAVE_BUTTON}
              onPress={async () => {
                setIsDataUpdating(true);
                await onSpendingCapUpdate?.(newSpendingCap);
                onClose();
                setIsDataUpdating(false);
              }}
            >
              {strings('confirm.edit_spending_cap_modal.save')}
            </Button>
          </View>
        </Box>
      </BottomSheet>
    </Modal>
  );
};
