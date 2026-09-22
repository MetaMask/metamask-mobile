import React, { useCallback, useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import type { InternalAccount } from '@metamask/keyring-internal-api';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import { isHardwareAccount } from '../../../../../util/address';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../../hooks/transactions/useTransactionAccountOverride';
import { replaceAccountInNestedTransactions } from '../../utils/transaction-pay';
import AccountSelector from '../AccountSelector';

const HARDWARE_KEYRING_TYPES: string[] = [
  ExtendedKeyringTypes.ledger,
  ExtendedKeyringTypes.qr,
  ExtendedKeyringTypes.oneKey,
];

const isNotHardwareAccount = (account: InternalAccount) =>
  !HARDWARE_KEYRING_TYPES.includes(account.metadata.keyring.type);

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
    // OGP: membershipSubscription will be added
    TransactionType.membershipSubscription as unknown as TransactionType,
  ]);

  useEffect(() => {
    if (
      !transactionId ||
      !isMoneyAccountWithdraw ||
      !accountOverride ||
      !isHardwareAccount(accountOverride)
    ) {
      return;
    }

    if (transactionMeta?.txParams?.from) {
      replaceAccountInNestedTransactions({
        transactionId,
        nestedTransactions: transactionMeta.nestedTransactions,
        oldAddress: accountOverride,
        newAddress: transactionMeta.txParams.from,
      });
    }

    Engine.context.TransactionPayController.setTransactionConfig(
      transactionId,
      (config) => {
        config.accountOverride = undefined;
      },
    );
  }, [accountOverride, isMoneyAccountWithdraw, transactionId, transactionMeta]);

  const handleAccountSelected = useCallback(
    (address: string) => {
      if (!transactionId) {
        return;
      }

      replaceAccountInNestedTransactions({
        transactionId,
        nestedTransactions: transactionMeta?.nestedTransactions,
        oldAddress: accountOverride ?? transactionMeta?.txParams?.from,
        newAddress: address,
      });

      Engine.context.TransactionPayController.setTransactionConfig(
        transactionId,
        (config) => {
          config.accountOverride = address as Hex;
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
      isAccountAllowed={
        isMoneyAccountWithdraw ? isNotHardwareAccount : undefined
      }
      style={style}
    />
  );
};

export default PayAccountSelector;
