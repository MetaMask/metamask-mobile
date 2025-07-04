import React, { useMemo } from 'react';
import { Linking } from 'react-native';
import { TransactionStatus } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import { selectTransactions } from '../../../../../selectors/transactionController';
import Text from '../../../../../component-library/components/Texts/Text';
import ButtonLink from '../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { SPEEDUP_CANCEL_TRANSACTION_URL } from '../../constants/url';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

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
          <>
            <Text>{strings('alert_system.pending_transaction.message')}</Text>
            <ButtonLink
              label={strings('alert_system.pending_transaction.learn_more')}
              onPress={() => Linking.openURL(SPEEDUP_CANCEL_TRANSACTION_URL)}
            />
          </>
        ),
        title: strings('alert_system.pending_transaction.title'),
        severity: Severity.Warning,
      },
    ];
  }, [transactions, transactionMeta]);
};
