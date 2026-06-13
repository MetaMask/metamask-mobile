import React, { useCallback } from 'react';

import { TransactionType } from '@metamask/transaction-controller';

import { useParams } from '../../../../../../util/navigation/navUtils';
import { updateTransaction } from '../../../../../../util/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import { formatPerpsBalance } from '../../../../../UI/Perps/utils/formatUtils';
import { PerpsAccountPickerSelectorsIDs } from '../../../ConfirmationView.testIds';
import {
  usePerpsSubAccounts,
  type SubAccountInfo,
} from '../../../hooks/transactions/usePerpsSubAccounts';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../confirm/confirm-component';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../utils/transaction';
import { AccountPickerRowContent } from '../account-picker-row';

const formatBalance = (account: SubAccountInfo): string =>
  formatPerpsBalance(account.totalBalance);

const PerpsAccountPickerRowContent: React.FC = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { subAccounts, selectedSubAccount } = usePerpsSubAccounts();

  const handleSelect = useCallback(
    (id: string) => {
      const transactionId = transactionMeta?.id;
      if (!transactionId) return;

      updateTransaction(
        {
          ...transactionMeta,
          txParams: { ...transactionMeta?.txParams, from: id },
        },
        transactionId,
      );
    },
    [transactionMeta],
  );

  return (
    <AccountPickerRowContent<SubAccountInfo>
      subAccounts={subAccounts}
      selectedSubAccount={selectedSubAccount}
      onSelect={handleSelect}
      formatBalance={formatBalance}
      title={strings('perps.select_perps_account')}
      searchPlaceholder={strings('perps.search_account')}
      testIDs={PerpsAccountPickerSelectorsIDs}
    />
  );
};

export const PerpsAccountPickerRow: React.FC = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { payWithOption } = useParams<ConfirmationParams>({});

  const isPerpsDeposit =
    payWithOption === PayWithOption.MoneyAccount &&
    hasTransactionType(transactionMeta, [TransactionType.perpsDeposit]);

  if (!isPerpsDeposit) {
    return null;
  }

  return <PerpsAccountPickerRowContent />;
};
