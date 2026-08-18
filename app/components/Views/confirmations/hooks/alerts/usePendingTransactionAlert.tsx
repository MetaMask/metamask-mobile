import React, { useMemo } from 'react';
import { Linking } from 'react-native';
import { TransactionStatus } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import { TextButton } from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import { selectTransactions } from '../../../../../selectors/transactionController';
import Text from '../../../../../component-library/components/Texts/Text';
import { SPEEDUP_CANCEL_TRANSACTION_URL } from '../../constants/url';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { PendingTransactionAlertTestIds } from './pending-transaction-alert.testIds';

export const usePendingTransactionAlert = () => {
  const transactions = useSelector(selectTransactions);
  const transactionMeta = useTransactionMetadataRequest();

  return useMemo(() => {
    if (!transactionMeta) {
      return [];
    }

    const showAlert = transactions.some(
      (transaction) =>
        transaction.status === TransactionStatus.submitted &&
        transaction.chainId === transactionMeta.chainId,
    );

    if (!showAlert) {
      return [];
    }

    return [
      {
        isBlocking: false,
        key: AlertKeys.PendingTransaction,
        field: RowAlertKey.PendingTransaction,
        message: (
          <Text>
            {strings('alert_system.pending_transaction.message')}{' '}
            <TextButton
              testID={PendingTransactionAlertTestIds.LEARN_MORE_BUTTON}
              onPress={() => Linking.openURL(SPEEDUP_CANCEL_TRANSACTION_URL)}
            >
              {strings('alert_system.pending_transaction.learn_more')}
            </TextButton>
          </Text>
        ),
        title: strings('alert_system.pending_transaction.title'),
        severity: Severity.Warning,
      },
    ];
  }, [transactions, transactionMeta]);
};
