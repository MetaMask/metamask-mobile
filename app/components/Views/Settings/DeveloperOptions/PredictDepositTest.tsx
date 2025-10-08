import React, { useCallback } from 'react';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './DeveloperOptions.styles';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { selectDefaultEndpointByChainId } from '../../../../selectors/networkController';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { Hex } from '@metamask/utils';
import { generateTransferData } from '../../../../util/transactions';
import { useConfirmNavigation } from '../../confirmations/hooks/useConfirmNavigation';
import { ConfirmationLoader } from '../../confirmations/components/confirm/confirm-component';

export function PredictDepositTest() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const selectedAccount = useSelector(selectSelectedInternalAccountAddress);
  const { navigateToConfirmation } = useConfirmNavigation();

  const { networkClientId } = useSelector((state: RootState) =>
    selectDefaultEndpointByChainId(state, CHAIN_IDS.POLYGON),
  );

  const transferData = generateTransferData('transfer', {
    toAddress: '0x13032833b30f3388208cda38971fdc839936b042',
    amount: '0x0',
  }) as Hex;

  const handleDeposit = useCallback(async () => {
    navigateToConfirmation({
      loader: ConfirmationLoader.CustomAmount,
    });

    addTransactionBatch({
      from: selectedAccount as Hex,
      origin: ORIGIN_METAMASK,
      networkClientId,
      transactions: [
        {
          params: {
            to: '0x13032833b30f3388208cda38971fdc839936b042',
            value: '0x1',
          },
        },
        {
          params: {
            to: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            data: transferData,
          },
          type: TransactionType.predictDeposit,
        },
      ],
    }).catch((e) => {
      console.error('Predict deposit error', e);
    });
  }, [navigateToConfirmation, networkClientId, selectedAccount, transferData]);

  return (
    <>
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        {'Predict Deposit'}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        Trigger a Predict deposit confirmation.
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        label={'Deposit'}
        onPress={handleDeposit}
        width={ButtonWidthTypes.Full}
        style={styles.accessory}
      />
    </>
  );
}
