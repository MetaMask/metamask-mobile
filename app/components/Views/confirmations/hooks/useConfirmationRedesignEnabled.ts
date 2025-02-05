import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { ApprovalType } from '@metamask/controller-utils';

import { isHardwareAccount } from '../../../../util/address';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import { useTransactionMetadata } from './useTransactionMetadata';
import useApprovalRequest from './useApprovalRequest';

type RedesignRequest = {
  confirmation_redesign: ConfirmationRedesignRemoteFlags;
  approvalRequestType?: ApprovalType;
  fromAddress: string;
  transactionMetadata?: TransactionMeta;
};

type ConfirmationRedesignRemoteFlags = {
  signatures: boolean;
  stakingDeposit: boolean;
};

const REDESIGNED_SIGNATURE_TYPES = [
  ApprovalType.EthSignTypedData,
  ApprovalType.PersonalSign,
];

const REDESIGNED_TRANSACTION_TYPES = [TransactionType.stakingDeposit];

function isRedesignedSignature({
  confirmation_redesign,
  fromAddress,
  approvalRequestType,
}: RedesignRequest) {
  return (
    confirmation_redesign?.signatures &&
    // following condition will ensure that user is redirected to old designs for hardware wallets
    !isHardwareAccount(fromAddress) &&
    approvalRequestType &&
    REDESIGNED_SIGNATURE_TYPES.includes(approvalRequestType as ApprovalType)
  );
}

function isRedesignedStaking({
  approvalRequestType,
  confirmation_redesign,
  transactionMetadata,
}: RedesignRequest) {
  if (
    !transactionMetadata ||
    approvalRequestType !== ApprovalType.Transaction
  ) {
    return false;
  }

  return (
    confirmation_redesign?.stakingDeposit &&
    REDESIGNED_TRANSACTION_TYPES.includes(
      transactionMetadata.type as TransactionType,
    )
  );
}

export const useConfirmationRedesignEnabled = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadata();
  const { confirmation_redesign } = useSelector(selectRemoteFeatureFlags) as {
    confirmation_redesign: ConfirmationRedesignRemoteFlags;
  };

  const approvalRequestType = approvalRequest?.type as ApprovalType;
  const fromAddress = approvalRequest?.requestData?.from;

  const redesignRequest: RedesignRequest = {
    approvalRequestType,
    confirmation_redesign,
    fromAddress,
    transactionMetadata,
  };

  const isRedesignedEnabled = useMemo(
    () =>
      isRedesignedSignature(redesignRequest) ||
      isRedesignedStaking(redesignRequest),
    [
      approvalRequestType,
      confirmation_redesign,
      fromAddress,
      transactionMetadata,
    ],
  );

  return { isRedesignedEnabled };
};
