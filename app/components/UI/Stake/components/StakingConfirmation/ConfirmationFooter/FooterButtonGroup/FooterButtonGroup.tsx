import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../hooks/useStyles';
import styleSheet from './FooterButtonGroup.styles';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../../../../selectors/accountsController';
import usePoolStakedDeposit from '../../../../hooks/usePoolStakedDeposit';
import Engine from '../../../../../../../core/Engine';
import {
  FooterButtonGroupActions,
  FooterButtonGroupProps,
} from './FooterButtonGroup.types';
import Routes from '../../../../../../../constants/navigation/Routes';
import usePoolStakedUnstake from '../../../../hooks/usePoolStakedUnstake/usePoolStakedUnstake';
import usePooledStakes from '../../../../hooks/usePooledStakes';

const FooterButtonGroup = ({ valueWei, action }: FooterButtonGroupProps) => {
  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation();
  const { navigate } = navigation;

  const activeAccount = useSelector(selectSelectedInternalAccount);

  const { attemptDepositTransaction } = usePoolStakedDeposit();
  const { refreshPooledStakes } = usePooledStakes();

  const { attemptUnstakeTransaction } = usePoolStakedUnstake();

  const [isSubmittedTransaction, setIsSubmittingTransaction] = useState(false);

  const handleStake = async () => {
    if (!activeAccount?.address) return;

    setIsSubmittingTransaction(true);

    const txRes = await attemptDepositTransaction(
      valueWei,
      activeAccount.address,
    );

    const transactionId = txRes?.transactionMeta?.id;

    // Listening for confirmation
    Engine.controllerMessenger.subscribeOnceIf(
      'TransactionController:transactionSubmitted',
      () => {
        setIsSubmittingTransaction(false);
        navigate(Routes.TRANSACTIONS_VIEW);
      },
      ({ transactionMeta }) => transactionMeta.id === transactionId,
    );

    Engine.controllerMessenger.subscribeOnceIf(
      'TransactionController:transactionFailed',
      () => {
        setIsSubmittingTransaction(false);
      },
      ({ transactionMeta }) => transactionMeta.id === transactionId,
    );

    Engine.controllerMessenger.subscribeOnceIf(
      'TransactionController:transactionRejected',
      () => {
        setIsSubmittingTransaction(false);
      },
      ({ transactionMeta }) => transactionMeta.id === transactionId,
    );

      Engine.controllerMessenger.subscribeOnceIf(
                                                 'TransactionController:transactionConfirmed',
                                                 () => {
                                                 refreshPooledStakes();
                                                 },
                                                 (transactionMeta) => transactionMeta.id === transactionId,
                                                 );
  };

  const handleUnstake = async () => {
    if (!activeAccount?.address) return;

    const txRes = await attemptUnstakeTransaction(
      valueWei,
      activeAccount.address,
    );

    const transactionId = txRes?.transactionMeta?.id;

    // Listening for confirmation
    Engine.controllerMessenger.subscribeOnceIf(
      'TransactionController:transactionSubmitted',
      () => {
        navigate(Routes.TRANSACTIONS_VIEW);
      },
      ({ transactionMeta }) => transactionMeta.id === transactionId,
    );
  };

  const handleConfirmation = () => {
    if (action === FooterButtonGroupActions.STAKE) return handleStake();
    if (action === FooterButtonGroupActions.UNSTAKE) return handleUnstake();
  };

  return (
    <View style={styles.footerContainer}>
      <Button
        label={
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
            {strings('stake.cancel')}
          </Text>
        }
        style={styles.button}
        variant={ButtonVariants.Secondary}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        onPress={() => {
          navigation.goBack();
        }}
        disabled={isSubmittedTransaction}
      />
      <Button
        label={
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Inverse}>
            {strings('stake.continue')}
          </Text>
        }
        style={styles.button}
        variant={ButtonVariants.Primary}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        onPress={handleConfirmation}
        disabled={isSubmittedTransaction}
        loading={isSubmittedTransaction}
      />
    </View>
  );
};

export default FooterButtonGroup;
