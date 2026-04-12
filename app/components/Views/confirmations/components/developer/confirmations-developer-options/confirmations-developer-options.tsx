import React, { useCallback } from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from '../../../../Settings/DeveloperOptions/DeveloperOptions.styles';
import { Hex } from '@metamask/utils';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
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
import { ConfirmationsDeveloperOptionsTestIds } from './confirmations-developer-options.testIds';
import {
  selectMoneyAccountDepositEnabledFlag,
  selectMoneyAccountWithdrawEnabledFlag,
} from '../../../../../../selectors/featureFlagController/moneyAccount';
import { usePerpsWithdrawConfirmation } from '../../../../../../components/UI/Perps/hooks/usePerpsWithdrawConfirmation';

const POLYGON_USDCE_ADDRESS =
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Hex;

// Update as needed.
const PROXY_ADDRESS = '0x13032833b30f3388208cda38971fdc839936b042' as Hex;

export function ConfirmationsDeveloperOptions() {
  const isMoneyAccountDepositEnabled = useSelector(
    selectMoneyAccountDepositEnabledFlag,
  );
  const isMoneyAccountWithdrawEnabled = useSelector(
    selectMoneyAccountWithdrawEnabledFlag,
  );

  return (
    <>
      <PredictDeposit />
      <PredictClaim />
      <PredictWithdraw />
      <PerpsWithdraw />
      {isMoneyAccountDepositEnabled && <MoneyAccountDeposit />}
      {isMoneyAccountWithdrawEnabled && <MoneyAccountWithdraw />}
    </>
  );
}

function PerpsWithdraw() {
  const { withdrawWithConfirmation } = usePerpsWithdrawConfirmation();

  const handleWithdraw = useCallback(() => {
    withdrawWithConfirmation();
  }, [withdrawWithConfirmation]);

  return (
    <DeveloperButton
      title="Perps Withdraw"
      description="Trigger a Perps withdraw confirmation."
      buttonLabel="Withdraw"
      onPress={handleWithdraw}
      testID={ConfirmationsDeveloperOptionsTestIds.PERPS_WITHDRAW_BUTTON}
    />
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

function MoneyAccountDeposit() {
  const { addTransactionBatchAndNavigate } = useAddTransactionBatch();

  const handleDeposit = useCallback(() => {
    addTransactionBatchAndNavigate({
      loader: ConfirmationLoader.CustomAmount,
      transactionType: TransactionType.moneyAccountDeposit,
      recipient: PROXY_ADDRESS,
    });
  }, [addTransactionBatchAndNavigate]);

  return (
    <DeveloperButton
      title="Money Account Deposit"
      description="Trigger a Money Account deposit confirmation."
      buttonLabel="Deposit"
      onPress={handleDeposit}
      testID={ConfirmationsDeveloperOptionsTestIds.MONEY_ACCOUNT_DEPOSIT_BUTTON}
    />
  );
}

function MoneyAccountWithdraw() {
  const { addTransactionBatchAndNavigate } = useAddTransactionBatch();

  const handleWithdraw = useCallback(() => {
    addTransactionBatchAndNavigate({
      loader: ConfirmationLoader.CustomAmount,
      transactionType: TransactionType.moneyAccountWithdraw,
    });
  }, [addTransactionBatchAndNavigate]);

  return (
    <DeveloperButton
      title="Money Account Withdraw"
      description="Trigger a Money Account withdraw confirmation."
      buttonLabel="Withdraw"
      onPress={handleWithdraw}
      testID={
        ConfirmationsDeveloperOptionsTestIds.MONEY_ACCOUNT_WITHDRAW_BUTTON
      }
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
      recipient = POLYGON_USDCE_ADDRESS,
    }: {
      headerShown?: boolean;
      loader?: ConfirmationLoader;
      transactionType: TransactionType;
      recipient?: Hex;
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
              to: recipient,
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
  testID,
  title,
}: {
  buttonLabel: string;
  description: string;
  onPress: () => void;
  testID?: string;
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
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={onPress}
        testID={testID}
        isFullWidth
        style={styles.accessory}
      >
        {buttonLabel}
      </Button>
    </>
  );
}
