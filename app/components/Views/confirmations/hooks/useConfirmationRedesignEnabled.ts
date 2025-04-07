import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ConfirmationRedesignRemoteFlags, selectConfirmationRedesignFlags } from '../../../../selectors/confirmTransaction';
import { isHardwareAccount } from '../../../../util/address';
import { isStakingConfirmation } from '../utils/confirm';
import useApprovalRequest from './useApprovalRequest';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

const REDESIGNED_SIGNATURE_TYPES = [
  ApprovalType.EthSignTypedData,
  ApprovalType.PersonalSign,
];

export const REDESIGNED_TRANSACTION_TYPES = [
  TransactionType.stakingDeposit,
  TransactionType.stakingUnstake,
  TransactionType.stakingClaim,
  TransactionType.contractInteraction,
];

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
