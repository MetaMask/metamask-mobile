import React, { useCallback, useState } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../utils/transaction';
import AccountSelector from '../AccountSelector';

export interface PayAccountSelectorProps {
  selectedAccount?: string;
  onSelectedAccountChange?: (address: string) => void;
}

const PayAccountSelector: React.FC<PayAccountSelectorProps> = ({
  selectedAccount,
  onSelectedAccountChange,
}) => {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id;

  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  const onAccountSelected = useCallback(
    (address: string) => {
      onSelectedAccountChange?.(address);
    },
    [onSelectedAccountChange],
  );

  const handleAccountSelected = useCallback(
    (address: string) => {
      if (transactionId) {
        Engine.context.TransactionPayController.setTransactionConfig(
          transactionId,
          (config) => {
            config.accountOverride = address as Hex;
            if (isMoneyAccountWithdraw) {
              config.isPostQuote = true;
            }
          },
        );
      }
      onAccountSelected?.(address);
    },
    [transactionId, isMoneyAccountWithdraw, onAccountSelected],
  );

  if (!isMoneyAccountDeposit && !isMoneyAccountWithdraw) {
    return null;
  }

  const label = isMoneyAccountDeposit
    ? strings('confirm.label.from')
    : undefined;

  return (
    <AccountSelector
      label={label}
      selectedAddress={selectedAccount}
      onAccountSelected={handleAccountSelected}
    />
  );
};

export default PayAccountSelector;
