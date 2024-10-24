import React, { useCallback, useState } from 'react';
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
import usePoolStakedUnstake from '../../../../hooks/usePoolStakedUnstake';
import usePooledStakes from '../../../../hooks/usePooledStakes';

const FooterButtonGroup = ({ valueWei, action }: FooterButtonGroupProps) => {
  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation();
  const { navigate } = navigation;

  const activeAccount = useSelector(selectSelectedInternalAccount);

  const { attemptDepositTransaction } = usePoolStakedDeposit();
  const { refreshPooledStakes } = usePooledStakes();

  const { attemptUnstakeTransaction } = usePoolStakedUnstake();

  const [didSubmitTransaction, setDidSubmitTransaction] = useState(false);

  const listenForTransactionEvents = useCallback(
    (transactionId?: string) => {
      if (!transactionId) return;

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionSubmitted',
        () => {
          setDidSubmitTransaction(false);
          navigate(Routes.TRANSACTIONS_VIEW);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionFailed',
        () => {
          setDidSubmitTransaction(false);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionRejected',
        () => {
          setDidSubmitTransaction(false);
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
    },
    [navigate, refreshPooledStakes],
  );

  const handleConfirmation = async () => {
    try {
      if (!activeAccount?.address) return;

      setDidSubmitTransaction(true);

      let transactionId: string | undefined;

      if (action === FooterButtonGroupActions.STAKE) {
        const txRes = await attemptDepositTransaction(
          valueWei,
          activeAccount.address,
        );
        transactionId = txRes?.transactionMeta?.id;
      }

      if (action === FooterButtonGroupActions.UNSTAKE) {
        const txRes = await attemptUnstakeTransaction(
          valueWei,
          activeAccount.address,
        );
        transactionId = txRes?.transactionMeta?.id;
      }

      listenForTransactionEvents(transactionId);
    } catch (e) {
      setDidSubmitTransaction(false);
    }
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
        disabled={didSubmitTransaction}
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
        disabled={didSubmitTransaction}
        loading={didSubmitTransaction}
      />
    </View>
  );
};

export default FooterButtonGroup;
