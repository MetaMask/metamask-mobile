import React, { useCallback } from 'react';

import { TransactionType } from '@metamask/transaction-controller';

import { useParams } from '../../../../../../util/navigation/navUtils';
import { updateTransaction } from '../../../../../../util/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import { formatCurrencyValue } from '../../../../../UI/Predict/utils/format';
import { PredictAccountPickerSelectorsIDs } from '../../../ConfirmationView.testIds';
import {
  usePredictSubAccounts,
  type PredictSubAccountInfo,
} from '../../../hooks/transactions/usePredictSubAccounts';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../confirm/confirm-component';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../utils/transaction';
import { replaceAccountInNestedTransactions } from '../../../utils/transaction-pay';
import { AccountPickerRowContent } from '../account-picker-row';

const formatPredictBalance = (account: PredictSubAccountInfo): string => {
  const num = parseFloat(account.balance);
  if (isNaN(num)) return '$0.00';
  return formatCurrencyValue(num) ?? '$0.00';
};

const PredictAccountPickerRowContent: React.FC = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { subAccounts, selectedSubAccount } = usePredictSubAccounts();

  const handleSelect = useCallback(
    (id: string) => {
      const transactionId = transactionMeta?.id;
      if (!transactionId) return;

      const oldWallet = selectedSubAccount?.walletAddress;
      const newAccount = subAccounts.find((a) => a.id === id);
      const newWallet = newAccount?.walletAddress;

      updateTransaction(
        {
          ...transactionMeta,
          txParams: { ...transactionMeta?.txParams, from: id, to: id },
        },
        transactionId,
      );

      if (oldWallet && newWallet && oldWallet !== newWallet) {
        replaceAccountInNestedTransactions({
          transactionId,
          nestedTransactions: transactionMeta?.nestedTransactions,
          oldAddress: oldWallet,
          newAddress: newWallet,
        });
      }
    },
    [transactionMeta, selectedSubAccount, subAccounts],
  );

  return (
    <AccountPickerRowContent<PredictSubAccountInfo>
      subAccounts={subAccounts}
      selectedSubAccount={selectedSubAccount}
      onSelect={handleSelect}
      formatBalance={formatPredictBalance}
      title={strings('predict.select_predict_account')}
      searchPlaceholder={strings('predict.search_account')}
      testIDs={PredictAccountPickerSelectorsIDs}
    />
  );
};

export const PredictAccountPickerRow: React.FC = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { payWithOption } = useParams<ConfirmationParams>({});

  const isPredictDeposit =
    payWithOption === PayWithOption.MoneyAccount &&
    hasTransactionType(transactionMeta, [TransactionType.predictDeposit]);

  if (!isPredictDeposit) {
    return null;
  }

  return <PredictAccountPickerRowContent />;
};
