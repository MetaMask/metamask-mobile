import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import TextField from '../../../../component-library/components/Form/TextField';
import BottomModal from '../../../Views/confirmations/components/UI/bottom-modal';
import { BalanceChange } from '../../../UI/SimulationDetails/types';
import { useStyles } from '../../../hooks/useStyles';
import styleSheet from './EditRowValue.styles';

interface EditRowValueProps {
  balanceChange: BalanceChange;
  onUpdate: (balanceChange: BalanceChange, val: string) => void;
  editTexts: {
    title: string;
    description: string;
  };
}

const EditRowValue: React.FC<EditRowValueProps> = ({
  balanceChange,
  editTexts,
  onUpdate,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const [updatedAmount, setUpdatedAmount] = useState(
    balanceChange.amount.abs().toString(),
  );
  const [isModalVisible, setModalVisibility] = useState(false);

  const onUpdateConfirm = useCallback(async () => {
    onUpdate(balanceChange, updatedAmount);
    setModalVisibility(false);
  }, [balanceChange, onUpdate, setModalVisibility, updatedAmount]);

  const openModal = useCallback(
    () => setModalVisibility(true),
    [setModalVisibility],
  );

  const closeModal = useCallback(() => {
    setUpdatedAmount(balanceChange.amount.abs().toString());
    setModalVisibility(false);
  }, [balanceChange, setModalVisibility, setUpdatedAmount]);

  return (
    <>
      <ButtonIcon
        iconColor={IconColor.Primary}
        iconName={IconName.Edit}
        size={ButtonIconSizes.Md}
        onPress={openModal}
        testID="edit-amount-button-icon"
      />
      {isModalVisible && (
        <BottomModal onClose={closeModal}>
          <View style={styles.wrapper}>
            <Text style={styles.title} variant={TextVariant.HeadingMD}>
              {editTexts?.title}
            </Text>
            <Text
              style={styles.text}
              color={TextColor.Alternative}
              variant={TextVariant.BodyMD}
            >
              {editTexts?.description}
            </Text>
            <TextField
              style={styles.input}
              value={updatedAmount}
              onChange={(evt) => setUpdatedAmount(evt.nativeEvent.text)}
            />
            <Text
              style={styles.text}
              color={TextColor.Alternative}
              variant={TextVariant.BodyMD}
            >
              {strings('confirm.simulation.edit_value_balance_info')}{' '}
              {balanceChange.balance?.toString()} {balanceChange.tokenSymbol}
            </Text>
            <View style={styles.buttonSection}>
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                style={styles.buttons}
                label={strings('confirm.simulation.cancel')}
                onPress={closeModal}
              />
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                style={styles.buttons}
                label={strings('confirm.simulation.save')}
                onPress={onUpdateConfirm}
              />
            </View>
          </View>
        </BottomModal>
      )}
    </>
  );
};

export default EditRowValue;
