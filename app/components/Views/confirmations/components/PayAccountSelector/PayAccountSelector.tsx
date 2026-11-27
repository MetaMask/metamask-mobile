import React, { useCallback } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { MONEY_ACCOUNT_DEPOSIT_TYPES } from '../../constants/confirmations';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../../hooks/transactions/useTransactionAccountOverride';
import { replaceAccountInNestedTransactions } from '../../utils/transaction-pay';
import AccountSelector from '../AccountSelector';

const PayAccountSelector: React.FC<{ style?: StyleProp<ViewStyle> }> = ({
  style,
}) => {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id;
  const accountOverride = useTransactionAccountOverride();

  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const isMoneyAccountDeposit = hasTransactionType(
    transactionMeta,
    MONEY_ACCOUNT_DEPOSIT_TYPES,
  );

  const handleAccountSelected = useCallback(
    (account: InternalAccount) => {
      if (!transactionId) {
        return;
      }

      replaceAccountInNestedTransactions({
        transactionId,
        nestedTransactions: transactionMeta?.nestedTransactions,
        oldAddress: accountOverride ?? transactionMeta?.txParams?.from,
        newAddress: account.address,
      });

      Engine.context.TransactionPayController.setTransactionConfig(
        transactionId,
        (config) => {
          config.accountOverride = account.id;
        },
      );
    },
    [accountOverride, transactionId, transactionMeta],
  );

  if (!isMoneyAccountDeposit && !isMoneyAccountWithdraw) {
    return null;
  }

  const label = isMoneyAccountDeposit
    ? strings('confirm.label.from')
    : undefined;

  const selectorTitle = isMoneyAccountDeposit
    ? strings('bridge.select_account')
    : strings('bridge.select_recipient');

  return (
    <AccountSelector
      label={label}
      selectorTitle={selectorTitle}
      selectedAddress={accountOverride}
      onAccountSelected={handleAccountSelected}
      style={style}
    />
  );
};

export default PayAccountSelector;
