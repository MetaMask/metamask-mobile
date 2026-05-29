import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetHeader,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { strings } from '../../../../../../locales/i18n';
import { TransactionDetails } from '../../../../Views/confirmations/components/activity/transaction-details/transaction-details';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { MoneyReceivedDetails } from './MoneyReceivedDetails';

const RECEIVED_TYPES: TransactionType[] = [
  TransactionType.incoming,
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
];

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
  return strings(
    (type && TITLE_KEYS[type]) ?? 'transaction_details.title.default',
  );
}

const MoneyTransactionDetailsSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { transactionMeta } = useTransactionDetails();
  const title = getTitle(transactionMeta);
  const isReceived = Boolean(
    transactionMeta?.type && RECEIVED_TYPES.includes(transactionMeta.type),
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      isFullscreen
      goBack={navigation.goBack}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMd}>{title}</Text>
      </BottomSheetHeader>
      {isReceived ? <MoneyReceivedDetails /> : <TransactionDetails />}
    </BottomSheet>
  );
};

export default MoneyTransactionDetailsSheet;
