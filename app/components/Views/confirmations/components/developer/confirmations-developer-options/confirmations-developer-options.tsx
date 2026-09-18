import React, { useCallback } from 'react';
import { useStyles } from '../../../../../../component-library/hooks';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import styleSheet from '../../../../Settings/DeveloperOptions/DeveloperOptions.styles';
import { Hex } from '@metamask/utils';
import {
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonSize,
  ButtonVariant,
  Text as DSText,
  TextColor as DSTextColor,
  TextVariant as DSTextVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '@react-navigation/native';
import { addTransactionBatch } from '../../../../../../util/transaction-controller';
import { useSelector, useDispatch } from 'react-redux';
import { StyleSheet, Switch, View } from 'react-native';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  ConfirmationLoader,
  ConfirmationLaunchSource,
} from '../../confirm/confirm-component';
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
import { usePerpsTrading } from '../../../../../UI/Perps/hooks/usePerpsTrading';
import { useMoneyAccountDeposit } from '../../../../../UI/Money/hooks/useMoneyAccount';
import Logger from '../../../../../../util/Logger';
import { selectMmPayDebugEnabled } from '../../../../../../reducers/experimentalSettings/selectors';
import { setMmPayDebugEnabled } from '../../../../../../actions/experimental';
import { isRc, isTestEnvironment } from '../../../../../../util/test/utils';

const POLYGON_USDCE_ADDRESS =
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Hex;

// Update as needed.
const PROXY_ADDRESS = '0x13032833b30f3388208cda38971fdc839936b042' as Hex;

const localStyles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export function ConfirmationsDeveloperOptions() {
  const isMoneyAccountDepositEnabled = useSelector(
    selectMoneyAccountDepositEnabledFlag,
  );
  const isMoneyAccountWithdrawEnabled = useSelector(
    selectMoneyAccountWithdrawEnabledFlag,
  );
  const isMmPayDebugEnabled = useSelector(selectMmPayDebugEnabled);
  const dispatch = useDispatch();

  const showMmPayDebugToggle = isRc || isTestEnvironment;

  return (
    <>
      <PerpsDeposit />
      <PredictDeposit />
      <PredictClaim />
      <PredictWithdraw />
      <PerpsWithdraw />
      {showMmPayDebugToggle && (
        <MmPayDebugToggle
          value={isMmPayDebugEnabled}
          onValueChange={(value: boolean) =>
            dispatch(setMmPayDebugEnabled(value))
          }
        />
      )}
      {isMoneyAccountDepositEnabled && <MoneyAccountDeposit />}
      {isMoneyAccountWithdrawEnabled && <MoneyAccountWithdraw />}
    </>
  );
}

function usePerpsDepositConfirmation() {
  const { depositWithConfirmation: controllerDeposit } = usePerpsTrading();
  const { navigateToConfirmation } = useConfirmNavigation();

  const depositWithConfirmation = useCallback(
    async ({
      forceBottomSheet = false,
      bottomSheetHeightPercentage,
    }: {
      forceBottomSheet?: boolean;
      bottomSheetHeightPercentage?: number;
    } = {}) => {
      navigateToConfirmation({
        stack: Routes.PERPS.ROOT,
        forceBottomSheet,
        bottomSheetHeightPercentage,
      });

      try {
        await controllerDeposit();
      } catch (error) {
        Logger.error(
          error as Error,
          'usePerpsDepositConfirmation: deposit initiation failed',
        );
      }
    },
    [controllerDeposit, navigateToConfirmation],
  );

  return { depositWithConfirmation };
}

function PerpsDeposit() {
  const { depositWithConfirmation } = usePerpsDepositConfirmation();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const handleDeposit = useCallback(() => {
    depositWithConfirmation();
  }, [depositWithConfirmation]);

  const handleDepositBottomSheet = useCallback(() => {
    depositWithConfirmation({ forceBottomSheet: true });
  }, [depositWithConfirmation]);

  return (
    <>
      <DeveloperButton
        title="Perps Deposit"
        description="Trigger a Perps deposit confirmation."
        buttonLabel="Deposit"
        onPress={handleDeposit}
        testID={ConfirmationsDeveloperOptionsTestIds.PERPS_DEPOSIT_BUTTON}
      />
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleDepositBottomSheet}
        testID={
          ConfirmationsDeveloperOptionsTestIds.PERPS_DEPOSIT_BOTTOM_SHEET_BUTTON
        }
        isFullWidth
        style={styles.accessory}
      >
        Deposit in BottomSheet
      </Button>
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
  const { initiateDeposit } = useMoneyAccountDeposit();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const handleDeposit = useCallback(() => {
    initiateDeposit().catch((error) => {
      Logger.error(error as Error, 'Developer Options: Money deposit failed');
    });
  }, [initiateDeposit]);

  const handleDepositBottomSheet = useCallback(() => {
    initiateDeposit({ forceBottomSheet: true }).catch((error) => {
      Logger.error(error as Error, 'Developer Options: Money deposit failed');
    });
  }, [initiateDeposit]);

  const handleDepositFiveDollars = useCallback(() => {
    initiateDeposit({ forceBottomSheet: true, amount: '5' }).catch((error) => {
      Logger.error(error as Error, 'Developer Options: Money deposit failed');
    });
  }, [initiateDeposit]);

  const handleMembershipTopUp = useCallback(() => {
    initiateDeposit({
      forceBottomSheet: true,
      amount: '5',
      launchedFrom: ConfirmationLaunchSource.MembershipTopUp,
    }).catch((error) => {
      Logger.error(error as Error, 'Developer Options: Money deposit failed');
    });
  }, [initiateDeposit]);

  return (
    <>
      <DeveloperButton
        title="Money Account Deposit"
        description="Trigger a Money Account deposit confirmation."
        buttonLabel="Deposit"
        onPress={handleDeposit}
        testID={
          ConfirmationsDeveloperOptionsTestIds.MONEY_ACCOUNT_DEPOSIT_BUTTON
        }
      />
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleDepositBottomSheet}
        testID={
          ConfirmationsDeveloperOptionsTestIds.MONEY_ACCOUNT_DEPOSIT_BOTTOM_SHEET_BUTTON
        }
        isFullWidth
        style={styles.accessory}
      >
        Deposit in BottomSheet
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleDepositFiveDollars}
        testID={
          ConfirmationsDeveloperOptionsTestIds.MONEY_ACCOUNT_DEPOSIT_FIVE_DOLLARS_BUTTON
        }
        isFullWidth
        style={styles.accessory}
      >
        Deposit 5$
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleMembershipTopUp}
        testID={
          ConfirmationsDeveloperOptionsTestIds.MONEY_ACCOUNT_MEMBERSHIP_TOP_UP_BUTTON
        }
        isFullWidth
        style={styles.accessory}
      >
        Deposit 5$ - membership top-up
      </Button>
    </>
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
    amount: '0xF4240',
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

      const overwriteUpgrade =
        transactionType === TransactionType.predictDeposit ||
        transactionType === TransactionType.predictDepositAndOrder ||
        transactionType === TransactionType.predictClaim ||
        transactionType === TransactionType.predictWithdraw;

      addTransactionBatch({
        from: selectedAccount as Hex,
        origin: ORIGIN_METAMASK,
        networkClientId,
        disableHook: true,
        disableSequential: true,
        ...(overwriteUpgrade ? { overwriteUpgrade: true } : {}),
        transactions: [
          {
            params: {
              to: PROXY_ADDRESS,
              data: '0x',
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

function MmPayDebugToggle({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const navigationTheme = useTheme();
  const { styles } = useStyles(styleSheet, { theme: navigationTheme });

  return (
    <>
      <View style={styles.heading}>
        <View style={localStyles.toggleRow}>
          <DSText
            color={DSTextColor.TextDefault}
            variant={DSTextVariant.HeadingLg}
          >
            {'MMPay Debug Modal'}
          </DSText>
          <Switch
            value={value}
            onValueChange={onValueChange}
            testID="mm-pay-debug-toggle"
            trackColor={{
              true: navigationTheme.colors.primary,
              false: navigationTheme.colors.border,
            }}
            thumbColor={navigationTheme.colors.card}
            ios_backgroundColor={navigationTheme.colors.border}
          />
        </View>
      </View>
      <DSText
        color={DSTextColor.TextAlternative}
        variant={DSTextVariant.BodyMd}
        style={styles.desc}
      >
        {'Show a debug button on MMPay confirmations (dev/RC)'}
      </DSText>
    </>
  );
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
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {title}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
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
