import React, { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { StyleProp, ViewStyle } from 'react-native';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { MONEY_ACCOUNT_DEPOSIT_TYPES } from '../../constants/confirmations';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import { isHardwareAccount } from '../../../../../util/address';
import { selectInternalAccountByAddresses } from '../../../../../selectors/accountsController';
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
  const getInternalAccountsByAddresses = useSelector(
    selectInternalAccountByAddresses,
  );

  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const isMoneyAccountDeposit = hasTransactionType(
    transactionMeta,
    MONEY_ACCOUNT_DEPOSIT_TYPES,
  );

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

      const [selectedAccount] = getInternalAccountsByAddresses([address]);

      // Withdraws re-encode the transfer once the override is set, see
      // `useMoneyAccountWithdrawTransferSync`. A quoted withdraw transfers to
      // the money account, which the teller withdraw also pays, so an address
      // swap would redirect the vault redemption.
      if (!isMoneyAccountWithdraw) {
        replaceAccountInNestedTransactions({
          transactionId,
          nestedTransactions: transactionMeta?.nestedTransactions,
          oldAddress: accountOverride ?? transactionMeta?.txParams?.from,
          newAddress: address,
        });
      }

      Engine.context.TransactionPayController.setTransactionConfig(
        transactionId,
        (config) => {
          config.accountOverride = selectedAccount.id;
        },
      );
    },
    [
      accountOverride,
      getInternalAccountsByAddresses,
      isMoneyAccountWithdraw,
      transactionId,
      transactionMeta,
    ],
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
