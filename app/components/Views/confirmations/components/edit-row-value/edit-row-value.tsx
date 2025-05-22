import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import TextField from '../../../../../component-library/components/Form/TextField';
import { BalanceChange } from '../../../../UI/SimulationDetails/types';
import { useStyles } from '../../../../hooks/useStyles';
import { updateApprovalAmount } from '../../utils/approvals';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import BottomModal from '../UI/bottom-modal';
import styleSheet from './edit-row-value.styles';

interface EditRowValueProps {
  balanceChange: BalanceChange;
}

const EditRowValue: React.FC<EditRowValueProps> = ({ balanceChange }) => {
  const { styles } = useStyles(styleSheet, {});
  const [approvalAmount, setApprovalAmount] = useState(
    balanceChange.amount.abs().toString(),
  );
  const [isModalVisible, setModalVisibility] = useState(false);
  const transactionMeta = useTransactionMetadataRequest();
  const { id, nestedTransactions } = transactionMeta;

  const onUpdate = useCallback(async () => {
    if (!nestedTransactions || !id) {
      return;
    }
    const trxn = nestedTransactions[balanceChange.nestedTransactionIndex];
    const data = updateApprovalAmount(
      trxn.data as Hex,
      (approvalAmount || '0').replace('#', ''),
      Number(balanceChange.decimals || 0),
    );

    await Engine.context.TransactionController.updateAtomicBatchData({
      transactionId: id,
      transactionData: data,
      transactionIndex: balanceChange.nestedTransactionIndex,
    });

    setModalVisibility(false);
  }, [approvalAmount, id, nestedTransactions]);

  return (
    <>
      <ButtonIcon
        iconColor={IconColor.Primary}
        iconName={IconName.Edit}
        size={ButtonIconSizes.Md}
        onPress={() => setModalVisibility(true)}
      />
      {isModalVisible && (
        <BottomModal onClose={() => setModalVisibility(false)}>
          <View style={styles.wrapper}>
            <Text style={styles.title} variant={TextVariant.HeadingMD}>
              Edit approval limit
            </Text>
            <Text
              style={styles.text}
              color={TextColor.Alternative}
              variant={TextVariant.BodyMD}
            >
              Enter the amount that you feel comfortable being spent on your
              behalf.
            </Text>
            <TextField
              style={styles.input}
              value={approvalAmount}
              onChange={(evt) => setApprovalAmount(evt.nativeEvent.text)}
            />
            <Text
              style={styles.text}
              color={TextColor.Alternative}
              variant={TextVariant.BodyMD}
            >
              Account balance: {balanceChange.balance?.toString()}{' '}
              {balanceChange.asset.tokenId}
            </Text>
            <View style={styles.buttonSection}>
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                style={styles.buttons}
                label="Cancel"
                onPress={() => setModalVisibility(false)}
              />
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                style={styles.buttons}
                label="Save"
                onPress={onUpdate}
              />
            </View>
          </View>
        </BottomModal>
      )}
    </>
  );
};

export default EditRowValue;
