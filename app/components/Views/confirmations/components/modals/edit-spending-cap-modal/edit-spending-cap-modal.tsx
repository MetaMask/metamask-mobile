import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { ApproveComponentIDs } from '../../../ConfirmationView.testIds';
import { useStyles } from '../../../../../../component-library/hooks';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { ApproveMethod } from '../../../types/approve';
import { SpendingCapInput } from '../../spending-cap-input';
import BottomModal from '../../UI/bottom-modal';
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
  const [newSpendingCap, setNewSpendingCap] = useState(spendingCap);
  const [error, setError] = useState<string | boolean>(false);
  const [isDataUpdating, setIsDataUpdating] = useState<boolean>(false);

  const handleCloseModal = useCallback(() => {
    if (!isDataUpdating) {
      onClose();
    }
  }, [onClose, isDataUpdating]);

  return (
    <BottomModal
      avoidKeyboard
      onBackdropPress={handleCloseModal}
      onBackButtonPress={handleCloseModal}
      onSwipeComplete={handleCloseModal}
    >
      <View style={styles.container}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {strings('confirm.edit_spending_cap_modal.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          style={styles.description}
          color={TextColor.Alternative}
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
          variant={TextVariant.BodyMD}
          style={styles.balanceInfo}
          color={TextColor.Alternative}
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
            onPress={handleCloseModal}
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
      </View>
    </BottomModal>
  );
};
