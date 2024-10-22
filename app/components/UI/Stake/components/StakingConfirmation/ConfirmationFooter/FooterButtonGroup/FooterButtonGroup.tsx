import React from 'react';
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

const FooterButtonGroup = ({ valueWei, action }: FooterButtonGroupProps) => {
  const { styles } = useStyles(styleSheet, {});

  const { navigate } = useNavigation();

  const activeAccount = useSelector(selectSelectedInternalAccount);

  const { attemptDepositTransaction } = usePoolStakedDeposit();

  const handleStake = async () => {
    if (!activeAccount?.address) return;

    const txRes = await attemptDepositTransaction(
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

    // Engine.controllerMessenger.subscribeOnceIf(
    //   'TransactionController:transactionConfirmed',
    //   () => {
    // TODO: Call refreshPooledStakes();
    // refreshPooledStakes();
    //   },
    //   (transactionMeta) => transactionMeta.id === transactionId,
    // );
  };

  const handleConfirmation = () => {
    if (action === FooterButtonGroupActions.STAKE) return handleStake();
    // TODO: Add handler (STAKE-803)
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
        onPress={() => navigate('Asset')}
      />
      <Button
        label={
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Inverse}>
            {strings('stake.confirm')}
          </Text>
        }
        style={styles.button}
        variant={ButtonVariants.Primary}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        onPress={handleConfirmation}
      />
    </View>
  );
};

export default FooterButtonGroup;
