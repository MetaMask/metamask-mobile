import React, { useCallback } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../../hooks/transactions/useTransactionAccountOverride';
import { hasTransactionType } from '../../utils/transaction';
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
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  const handleAccountSelected = useCallback(
    (address: string) => {
      if (transactionId) {
        Engine.context.TransactionPayController.setTransactionConfig(
          transactionId,
          (config) => {
            config.accountOverride = address as Hex;
          },
        );
      }
    },
    [transactionId],
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
