import React, { useCallback, useState } from 'react';
import { Hex } from '@metamask/utils';
import { updateEditableParams } from '../../../../../../util/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import useNavbar from '../../../hooks/ui/useNavbar';
import AccountSelector from '../../AccountSelector';
import { CustomAmountInfo } from '../custom-amount-info';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountWithdrawInfo() {
  useNavbar(strings('confirm.title.money_account_withdraw'));

  const [selectedFromAddress, setSelectedFromAddress] = useState<
    string | undefined
  >(undefined);
  const transactionMeta = useTransactionMetadataRequest();
  const { canSelectWithdrawToken } = useTransactionPayWithdraw();

  const handleRecipientAccountSelected = useCallback(
    (address: string) => {
      if (transactionMeta?.id) {
        updateEditableParams(transactionMeta.id, { to: address as Hex });
      }
      setSelectedFromAddress(address);
    },
    [transactionMeta?.id],
  );

  return (
    <CustomAmountInfo
      currency={MONEY_ACCOUNT_CURRENCY}
      disablePay={!canSelectWithdrawToken}
      disableConfirm={!selectedFromAddress}
      afterPayWith={
        <AccountSelector
          selectedAddress={selectedFromAddress}
          onAccountSelected={handleRecipientAccountSelected}
        />
      }
    />
  );
}
