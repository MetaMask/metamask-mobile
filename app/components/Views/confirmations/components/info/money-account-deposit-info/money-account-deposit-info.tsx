import React, { useCallback, useState } from 'react';
import { Hex } from '@metamask/utils';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { updateEditableParams } from '../../../../../../util/transaction-controller';
import MoneyAccountSelector from '../../MoneyAccountSelector';

export const MONEY_ACCOUNT_CURRENCY = 'usd';

export function MoneyAccountDepositInfo() {
  useNavbar(strings('confirm.title.money_account_deposit'));

  const [selectedToAddress, setSelectedToAddress] = useState<
    string | undefined
  >(undefined);
  const transactionMeta = useTransactionMetadataRequest();

  const handleToAccountSelected = useCallback(
    (address: string) => {
      setSelectedToAddress(address);
      if (transactionMeta?.id) {
        updateEditableParams(transactionMeta.id, { to: address as Hex });
      }
    },
    [transactionMeta?.id],
  );

  return (
    <CustomAmountInfo
      currency={MONEY_ACCOUNT_CURRENCY}
      disableConfirm={!selectedToAddress}
      afterPayWith={
        <MoneyAccountSelector
          chainId={transactionMeta?.chainId}
          selectedAddress={selectedToAddress}
          onAccountSelected={handleToAccountSelected}
        />
      }
    />
  );
}
