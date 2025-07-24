import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import {
  ConfirmationRedesignRemoteFlags,
  selectConfirmationRedesignFlags,
} from '../../../../selectors/featureFlagController/confirmations';
import { isStakingConfirmation } from '../utils/confirm';
import {
  REDESIGNED_APPROVE_TYPES,
  REDESIGNED_CONTRACT_INTERACTION_TYPES,
  REDESIGNED_SIGNATURE_TYPES,
  REDESIGNED_TRANSACTION_TYPES,
  REDESIGNED_TRANSFER_TYPES,
} from '../constants/confirmations';
import useApprovalRequest from './useApprovalRequest';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

function isRedesignedSignature({
  approvalRequestType,
  confirmationRedesignFlags,
}: {
  approvalRequestType: ApprovalType;
  confirmationRedesignFlags: ConfirmationRedesignRemoteFlags;
}) {
  return (
    confirmationRedesignFlags?.signatures &&
    approvalRequestType &&
    REDESIGNED_SIGNATURE_TYPES.includes(approvalRequestType as ApprovalType)
  );
}

function isRedesignedTransaction({
  approvalRequestType,
  confirmationRedesignFlags,
  transactionMetadata,
}: {
  approvalRequestType: ApprovalType;
  confirmationRedesignFlags: ConfirmationRedesignRemoteFlags;
  transactionMetadata?: TransactionMeta;
}) {
  const transactionType = transactionMetadata?.type as TransactionType;
  const isTransactionTypeRedesigned =
    REDESIGNED_TRANSACTION_TYPES.includes(transactionType);

  if (
    !isTransactionTypeRedesigned ||
    approvalRequestType !== ApprovalType.Transaction ||
    !transactionMetadata
  ) {
    return false;
  }

  if (isStakingConfirmation(transactionType)) {
    return confirmationRedesignFlags?.staking_confirmations;
  }

  if (REDESIGNED_CONTRACT_INTERACTION_TYPES.includes(transactionType)) {
    return confirmationRedesignFlags?.contract_interaction;
  }

  if (
    transactionType === TransactionType.revokeDelegation ||
    transactionType === TransactionType.batch
  ) {
    return true;
  }

  if (REDESIGNED_TRANSFER_TYPES.includes(transactionType)) {
    return confirmationRedesignFlags?.transfer;
  }

  if (REDESIGNED_APPROVE_TYPES.includes(transactionType)) {
    return confirmationRedesignFlags?.approve;
  }

  if (transactionType === TransactionType.deployContract) {
    return confirmationRedesignFlags?.contract_deployment;
  }

  return false;
}

function isBatchTransaction(approvalRequestType: ApprovalType) {
  return approvalRequestType === ApprovalType.TransactionBatch;
}

export const useConfirmationRedesignEnabled = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const confirmationRedesignFlags = useSelector(
    selectConfirmationRedesignFlags,
  );

  const approvalRequestType = approvalRequest?.type as ApprovalType;

  const isRedesignedEnabled = useMemo(
    () =>
      isRedesignedSignature({
        approvalRequestType,
        confirmationRedesignFlags,
      }) ||
      isRedesignedTransaction({
        approvalRequestType,
        confirmationRedesignFlags,
        transactionMetadata,
      }) ||
      isBatchTransaction(approvalRequestType),
    [approvalRequestType, confirmationRedesignFlags, transactionMetadata],
  );

  return { isRedesignedEnabled };
};
