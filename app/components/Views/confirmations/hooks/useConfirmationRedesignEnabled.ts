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
import { isHardwareAccount } from '../../../../util/address';
import { isStakingConfirmation } from '../utils/confirm';
import {
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
  fromAddress,
  transactionMetadata,
}: {
  approvalRequestType: ApprovalType;
  confirmationRedesignFlags: ConfirmationRedesignRemoteFlags;
  fromAddress: string;
  transactionMetadata?: TransactionMeta;
}) {
  const isTransactionTypeRedesigned = REDESIGNED_TRANSACTION_TYPES.includes(
    transactionMetadata?.type as TransactionType,
  );

  if (
    !isTransactionTypeRedesigned ||
    approvalRequestType !== ApprovalType.Transaction ||
    !transactionMetadata ||
    isHardwareAccount(fromAddress)
  ) {
    return false;
  }

  if (isStakingConfirmation(transactionMetadata?.type as string)) {
    return confirmationRedesignFlags?.staking_confirmations;
  }

  if (transactionMetadata?.type === TransactionType.contractInteraction) {
    return confirmationRedesignFlags?.contract_interaction;
  }

  if (
    transactionMetadata?.type === TransactionType.revokeDelegation ||
    transactionMetadata?.type === TransactionType.batch
  ) {
    return true;
  }

  if (
    REDESIGNED_TRANSFER_TYPES.includes(
      transactionMetadata?.type as TransactionType,
    )
  ) {
    return confirmationRedesignFlags?.transfer;
  }

  return false;
}

export const useConfirmationRedesignEnabled = () => {
  const { approvalRequest } = useApprovalRequest();
  const fromAddress = approvalRequest?.requestData?.from;
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
        fromAddress,
        transactionMetadata,
      }),
    [
      approvalRequestType,
      confirmationRedesignFlags,
      fromAddress,
      transactionMetadata,
    ],
  );

  return { isRedesignedEnabled };
};
