import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { strings } from '../../../../../../locales/i18n';
import { TransactionDetails } from '../../../../Views/confirmations/components/activity/transaction-details/transaction-details';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { hasTransactionType } from '../../../../Views/confirmations/utils/transaction';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';
import { resolveMusdTransferMeta } from '../../constants/activityStyles';
import { MoneyReceivedDetails } from './MoneyReceivedDetails';
import { MoneySentDetails } from './MoneySentDetails';

const RECEIVED_TYPES: TransactionType[] = [
  TransactionType.incoming,
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
];

const SENT_TYPES: TransactionType[] = [TransactionType.moneyAccountWithdraw];

const TITLE_KEYS: Partial<Record<TransactionType, string>> = {
  [TransactionType.moneyAccountDeposit]:
    'transaction_details.title.money_account_deposit',
  [TransactionType.moneyAccountWithdraw]:
    'transaction_details.title.money_account_withdraw',
  [TransactionType.incoming]:
    'transaction_details.title.money_account_received',
  [TransactionType.tokenMethodTransfer]:
    'transaction_details.title.money_account_received',
  [TransactionType.tokenMethodTransferFrom]:
    'transaction_details.title.money_account_received',
  [TransactionType.musdConversion]: 'transaction_details.title.musd_conversion',
  [TransactionType.musdClaim]: 'transaction_details.title.musd_claim',
  [TransactionType.perpsDeposit]: 'transaction_details.title.perps_deposit',
  [TransactionType.perpsWithdraw]: 'transaction_details.title.perps_withdraw',
  [TransactionType.predictClaim]: 'transaction_details.title.predict_claim',
  [TransactionType.predictDeposit]: 'transaction_details.title.predict_deposit',
  [TransactionType.predictWithdraw]:
    'transaction_details.title.predict_withdraw',
};

function getTitle(tx: TransactionMeta | undefined): string {
  const type =
    tx?.type === TransactionType.batch
      ? ((tx.nestedTransactions?.find((n) => n.type && n.type in TITLE_KEYS)
          ?.type as TransactionType | undefined) ?? tx.type)
      : tx?.type;
  // Sent transactions are titled "Sent {symbol}" (e.g. "Sent mUSD").
  if (tx && hasTransactionType(tx, SENT_TYPES)) {
    return strings('transaction_details.title.money_account_sent', {
      symbol: resolveMusdTransferMeta(tx)?.symbol ?? 'mUSD',
    });
  }
  return strings(
    (type && TITLE_KEYS[type]) ?? 'transaction_details.title.default',
  );
}

const MoneyTransactionDetailsSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { transactionMeta } = useTransactionDetails();
  const surfaceClass = useElevatedSurface();
  const title = getTitle(transactionMeta);
  // `isReceived` checks the top-level type only: a sent withdrawal is an
  // EIP-7702 batch that *contains* a nested tokenMethodTransfer, so a
  // nested-aware check would misclassify it as received. `isSent` is
  // nested-aware because the withdrawal's `moneyAccountWithdraw` lives in the
  // batch's nested transactions.
  const isReceived = Boolean(
    transactionMeta?.type && RECEIVED_TYPES.includes(transactionMeta.type),
  );
  const isSent = hasTransactionType(transactionMeta, SENT_TYPES);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  // Close the sheet first, then navigate — see `MoneySentDetailsProps.onCloseSheet`.
  const closeAndNavigate = useCallback(
    (navigate: () => void) => sheetRef.current?.onCloseBottomSheet(navigate),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      isFullscreen
      goBack={navigation.goBack}
      keyboardAvoidingViewEnabled={false}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMd}>{title}</Text>
      </BottomSheetHeader>
      {isReceived ? (
        <MoneyReceivedDetails />
      ) : isSent ? (
        <MoneySentDetails onCloseSheet={closeAndNavigate} />
      ) : (
        <TransactionDetails />
      )}
    </BottomSheet>
  );
};

export default MoneyTransactionDetailsSheet;
