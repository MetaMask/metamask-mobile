import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { TransactionStatus } from '@metamask/transaction-controller';
import {
  BottomSheet,
  BottomSheetHeader,
  IconName,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { selectTransactions } from '../../../../../selectors/transactionController';
import { rejectPendingTransactions } from '../../utils/rejectPendingTransactions';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import { useMoneyPerpsDeposit } from '../../../../Views/confirmations/hooks/pay/useMoneyPerpsDeposit';
import { useMoneyPredictDeposit } from '../../../../Views/confirmations/hooks/pay/useMoneyPredictDeposit';
import { selectPerpsEligibility } from '../../../Perps/selectors/perpsController';
import { usePredictEligibility } from '../../../Predict/hooks/usePredictEligibility';
import Logger from '../../../../../util/Logger';
import MoneySheetOptionsList, {
  type MoneySheetOption,
} from '../MoneySheetOptionsList';
import styleSheet from './MoneyTransferSheet.styles';
import { MoneyTransferSheetTestIds } from './MoneyTransferSheet.testIds';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';

type TransferAction = 'withdraw' | 'perps' | 'predict';

const MoneyTransferSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { initiateWithdrawal } = useMoneyAccountWithdrawal();
  const { isEnabled: isPerpsEnabled, initiatePerpsDeposit } =
    useMoneyPerpsDeposit();
  const { isEnabled: isPredictEnabled, initiatePredictDeposit } =
    useMoneyPredictDeposit();
  const isPerpsEligible = useSelector(selectPerpsEligibility);
  const { isEligible: isPredictEligible } = usePredictEligibility();

  const { trackBottomSheetViewed, trackSurfaceClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_TRANSFER_MONEY_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const transactions = useSelector(selectTransactions);

  const hasPendingTransaction = useMemo(
    () =>
      (transactions ?? []).some(
        (tx) => tx.status === TransactionStatus.unapproved,
      ),
    [transactions],
  );

  const [deferredAction, setDeferredAction] = useState<TransferAction | null>(
    null,
  );

  // Close the sheet (which pops the modal) and kick off the transfer in one
  // atomic step, so the confirmation slides straight over the sheet rather than
  // flashing back to Money home in between. We resolve the initiator here rather
  // than capturing it earlier so a deferred run uses the up-to-date navigation
  // closure (which no longer sees the just-rejected transaction), not a stale
  // snapshot.
  const closeAndStart = useCallback(
    (action: TransferAction) => {
      let initiate = initiateWithdrawal;
      if (action === 'perps') {
        initiate = initiatePerpsDeposit;
      } else if (action === 'predict') {
        initiate = initiatePredictDeposit;
      }
      sheetRef.current?.onCloseBottomSheet(() => {
        initiate().catch((error: Error) => {
          Logger.error(
            error,
            '[MoneyTransferSheet] Transfer initiation failed',
          );
        });
      });
    },
    [initiateWithdrawal, initiatePerpsDeposit, initiatePredictDeposit],
  );

  // A leftover unapproved transaction would be picked up by the confirmation
  // screen, so we reject it before opening a fresh one. Rejection clears from
  // state asynchronously and closing the sheet unmounts us, so when something is
  // pending we stay mounted and defer the close+navigate (see effect) instead of
  // letting it race the unmount.
  const startAction = useCallback(
    (action: TransferAction) => {
      if (hasPendingTransaction) {
        rejectPendingTransactions(transactions ?? []);
        setDeferredAction(action);
        return;
      }
      closeAndStart(action);
    },
    [hasPendingTransaction, transactions, closeAndStart],
  );

  useEffect(() => {
    if (!deferredAction || hasPendingTransaction) {
      return;
    }
    closeAndStart(deferredAction);
    setDeferredAction(null);
  }, [deferredAction, hasPendingTransaction, closeAndStart]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBetweenAccounts = useCallback(() => {
    trackSurfaceClicked({
      component_name:
        COMPONENT_NAMES.MONEY_TRANSFER_MONEY_SHEET_BETWEEN_ACCOUNTS,
      redirect_target: SCREEN_NAMES.MONEY_TRANSFER,
    });

    startAction('withdraw');
  }, [startAction, trackSurfaceClicked]);

  const handlePerpsAccount = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_TRANSFER_MONEY_SHEET_PERPS_ACCOUNT,
      redirect_target: SCREEN_NAMES.MONEY_TRANSFER,
    });

    startAction('perps');
  }, [startAction, trackSurfaceClicked]);

  const handlePredictionsAccount = useCallback(() => {
    trackSurfaceClicked({
      component_name:
        COMPONENT_NAMES.MONEY_TRANSFER_MONEY_SHEET_PREDICTIONS_ACCOUNT,
      redirect_target: SCREEN_NAMES.MONEY_TRANSFER,
    });

    startAction('predict');
  }, [startAction, trackSurfaceClicked]);

  const options: MoneySheetOption[] = [
    {
      label: strings('money.transfer_sheet.between_accounts'),
      icon: IconName.Arrow2UpRight,
      onPress: handleBetweenAccounts,
      testID: MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION,
    },
    ...(isPerpsEligible
      ? [
          {
            label: strings('money.transfer_sheet.perps_account'),
            icon: IconName.Candlestick,
            onPress: handlePerpsAccount,
            testID: MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION,
            disabled: !isPerpsEnabled,
          },
        ]
      : []),
    ...(isPredictEligible
      ? [
          {
            label: strings('money.transfer_sheet.predictions_account'),
            icon: IconName.Speedometer,
            onPress: handlePredictionsAccount,
            testID: MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION,
            disabled: !isPredictEnabled,
          },
        ]
      : []),
    {
      label: strings('money.transfer_sheet.send_external'),
      icon: IconName.Arrow2Up,
      testID: MoneyTransferSheetTestIds.SEND_EXTERNAL_ROW,
      disabled: true,
      comingSoon: true,
    },
    {
      label: strings('money.transfer_sheet.withdraw_to_bank'),
      icon: IconName.Bank,
      testID: MoneyTransferSheetTestIds.WITHDRAW_TO_BANK_ROW,
      disabled: true,
      comingSoon: true,
    },
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyTransferSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.transfer_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.list}>
        <MoneySheetOptionsList options={options} />
      </View>
    </BottomSheet>
  );
};

export default MoneyTransferSheet;
