import { Hex } from '@metamask/utils';
import { useCallback } from 'react';

import { updateEditableParams } from '../../../../util/transaction-controller';
import { ERC20_DEFAULT_DECIMALS } from '../utils/token';
import { updateApprovalAmount } from '../utils/approvals';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useApproveTransactionData } from './useApproveTransactionData';

export const useApproveTransactionActions = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { decimals } = useApproveTransactionData();
  const { id, txParams } = transactionMeta ?? {};

  const onSpendingCapUpdate = useCallback(
    async (spendingCap: string) => {
      const normalizedSpendingCap = spendingCap.replace(',', '.');
      const data = updateApprovalAmount(
        txParams?.data as Hex,
        normalizedSpendingCap,
        Number(decimals || ERC20_DEFAULT_DECIMALS),
      );

      await updateEditableParams(id as string, {
        data,
      });
    },
    [decimals, id, txParams],
  );

  return { onSpendingCapUpdate };
};
