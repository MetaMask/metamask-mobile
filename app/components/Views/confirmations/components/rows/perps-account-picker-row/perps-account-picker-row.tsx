import React, { useCallback } from 'react';
import { providerErrors } from '@metamask/rpc-errors';

import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';

import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { addTransaction } from '../../../../../../util/transaction-controller';
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
import { AccountPickerRowContent } from '../account-picker-row';

const formatBalance = (account: SubAccountInfo): string =>
  formatPerpsBalance(account.totalBalance);

const PerpsAccountPickerRowContent: React.FC = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { subAccounts, selectedSubAccount } = usePerpsSubAccounts();

  const handleSelect = useCallback(
    (id: string) => {
      const transactionId = transactionMeta?.id;
      const networkClientId = transactionMeta?.networkClientId;

      if (
        !transactionId ||
        !networkClientId ||
        transactionMeta.txParams?.from?.toLowerCase() === id.toLowerCase()
      ) {
        return;
      }

      // A new approval replaces the open one, so the confirmation stays on
      // this screen and follows the new transaction id.
      void addTransaction(
        {
          ...transactionMeta.txParams,
          from: id,
        },
        {
          nestedTransactions: transactionMeta.nestedTransactions,
          networkClientId,
          origin: transactionMeta.origin,
          requireApproval: true,
          type: transactionMeta.type,
        },
      )
        .then(() => {
          Engine.context.ApprovalController.rejectRequest(
            transactionId,
            providerErrors.userRejectedRequest(),
          );
        })
        .catch((error: unknown) => {
          Logger.error(
            error as Error,
            'Failed to recreate the Perps deposit for the selected account',
          );
        });
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
    hasTransactionType(transactionMeta, [
      TransactionType.perpsDeposit,
      TransactionType.perpsLighterDeposit,
    ]);

  if (!isPerpsDeposit) {
    return null;
  }

  return <PerpsAccountPickerRowContent />;
};
