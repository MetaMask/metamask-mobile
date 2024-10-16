/* eslint-disable no-console */
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
import useDepositPoolStake from '../../../../utils/deposit';
import Engine from '../../../../../../../core/Engine';
import { FooterButtonGroupProps } from './FooterButtonGroup.types';

const FooterButtonGroup = ({ valueWei }: FooterButtonGroupProps) => {
  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation();

  const navigateToAssetScreen = () => navigation.navigate('Asset');

  const activeAccount = useSelector(selectSelectedInternalAccount);

  const { attemptDepositTransaction } = useDepositPoolStake();

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
        navigateToAssetScreen();
      },
      ({ transactionMeta }) => transactionMeta.id === transactionId,
    );
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
        onPress={navigateToAssetScreen}
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
        // TODO: Replace with actual stake confirmation flow
        onPress={handleStake}
      />
    </View>
  );
};

export default FooterButtonGroup;
