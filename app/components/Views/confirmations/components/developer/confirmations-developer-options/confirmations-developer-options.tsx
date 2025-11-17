import React, { useCallback } from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from '../../../../Settings/DeveloperOptions/DeveloperOptions.styles';
import { Hex } from '@metamask/utils';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { useTheme } from '@react-navigation/native';
import { addTransactionBatch } from '../../../../../../util/transaction-controller';
import { useSelector } from 'react-redux';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import Routes from '../../../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../confirm/confirm-component';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { selectDefaultEndpointByChainId } from '../../../../../../selectors/networkController';
import { generateTransferData } from '../../../../../../util/transactions';
import { useConfirmNavigation } from '../../../hooks/useConfirmNavigation';
import { selectSelectedInternalAccountAddress } from '../../../../../../selectors/accountsController';
import { RootState } from '../../../../../../reducers';

const POLYGON_USDCE_ADDRESS =
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Hex;

// Update as needed.
const PROXY_ADDRESS = '0x13032833b30f3388208cda38971fdc839936b042' as Hex;

export function ConfirmationsDeveloperOptions() {
  return (
    <>
      <PredictDeposit />
      <PredictClaim />
      <PredictWithdraw />
    </>
  );
}

function PredictWithdraw() {
  const { addTransactionBatchAndNavigate } = useAddTransactionBatch();

  const handleWithdraw = useCallback(() => {
    addTransactionBatchAndNavigate({
      loader: ConfirmationLoader.CustomAmount,
      transactionType: TransactionType.predictWithdraw,
    });
  }, [addTransactionBatchAndNavigate]);

  return (
    <DeveloperButton
      title="Predict Withdraw"
      description="Trigger a Predict withdraw confirmation."
      buttonLabel="Withdraw"
      onPress={handleWithdraw}
    />
  );
}

function PredictClaim() {
  const { addTransactionBatchAndNavigate } = useAddTransactionBatch();

  const handleClaim = useCallback(() => {
    addTransactionBatchAndNavigate({
      headerShown: false,
      transactionType: TransactionType.predictClaim,
      loader: ConfirmationLoader.PredictClaim,
    });
  }, [addTransactionBatchAndNavigate]);

  return (
    <DeveloperButton
      title="Predict Claim"
      description="Trigger a Predict claim confirmation."
      buttonLabel="Claim"
      onPress={handleClaim}
    />
  );
}

function PredictDeposit() {
  const { addTransactionBatchAndNavigate } = useAddTransactionBatch();

  const handleDeposit = useCallback(async () => {
    addTransactionBatchAndNavigate({
      loader: ConfirmationLoader.CustomAmount,
      transactionType: TransactionType.predictDeposit,
    });
  }, [addTransactionBatchAndNavigate]);

  return (
    <DeveloperButton
      title="Predict Deposit"
      description="Trigger a Predict deposit confirmation."
      buttonLabel="Deposit"
      onPress={handleDeposit}
    />
  );
}

function useAddTransactionBatch() {
  const selectedAccount = useSelector(selectSelectedInternalAccountAddress);
  const { navigateToConfirmation } = useConfirmNavigation();

  const { networkClientId } =
    useSelector((state: RootState) =>
      selectDefaultEndpointByChainId(state, CHAIN_IDS.POLYGON),
    ) ?? {};

  const transferData = generateTransferData('transfer', {
    toAddress: PROXY_ADDRESS,
    amount: '0x0',
  }) as Hex;

  const addTransactionBatchAndNavigate = useCallback(
    async ({
      headerShown,
      loader,
      transactionType,
    }: {
      headerShown?: boolean;
      loader?: ConfirmationLoader;
      transactionType: TransactionType;
    }) => {
      navigateToConfirmation({
        headerShown,
        loader,
        stack: Routes.PREDICT.ROOT,
      });

      addTransactionBatch({
        from: selectedAccount as Hex,
        origin: ORIGIN_METAMASK,
        networkClientId,
        disableHook: true,
        disableSequential: true,
        transactions: [
          {
            params: {
              to: PROXY_ADDRESS,
              value: '0x1',
            },
          },
          {
            params: {
              to: POLYGON_USDCE_ADDRESS,
              data: transferData,
            },
            type: transactionType,
          },
        ],
      }).catch((e) => {
        console.error('Predict transaction error', e);
      });
    },
    [navigateToConfirmation, networkClientId, selectedAccount, transferData],
  );

  return {
    addTransactionBatchAndNavigate,
  };
}

function DeveloperButton({
  buttonLabel,
  description,
  onPress,
  title,
}: {
  buttonLabel: string;
  description: string;
  onPress: () => void;
  title: string;
}) {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  return (
    <>
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        {title}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {description}
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        label={buttonLabel}
        onPress={onPress}
        width={ButtonWidthTypes.Full}
        style={styles.accessory}
      />
    </>
  );
}
