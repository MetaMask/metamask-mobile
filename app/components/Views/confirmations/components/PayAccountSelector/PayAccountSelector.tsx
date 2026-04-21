import React, { useCallback } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../../hooks/transactions/useTransactionAccountOverride';
import { hasTransactionType } from '../../utils/transaction';
import AccountSelector from '../AccountSelector';

const PayAccountSelector: React.FC = () => {
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
            if (isMoneyAccountWithdraw) {
              config.isPostQuote = true;
            }
          },
        );
      }
    },
    [transactionId, isMoneyAccountWithdraw],
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
      selectedAddress={accountOverride}
      onAccountSelected={handleAccountSelected}
    />
  );
};

export default PayAccountSelector;
