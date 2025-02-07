import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { ApprovalType } from '@metamask/controller-utils';

import { isExternalHardwareAccount } from '../../../../util/address';
import {
  type ConfirmationRedesignRemoteFlags,
  selectConfirmationRedesignFlags,
} from '../../../../selectors/featureFlagController';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import useApprovalRequest from './useApprovalRequest';

const REDESIGNED_SIGNATURE_TYPES = [
  ApprovalType.EthSignTypedData,
  ApprovalType.PersonalSign,
];

const REDESIGNED_TRANSACTION_TYPES = [TransactionType.stakingDeposit];

function isRedesignedSignature({
  approvalRequestType,
  confirmationRedesignFlags,
  fromAddress,
}: {
  approvalRequestType: ApprovalType;
  confirmationRedesignFlags: ConfirmationRedesignRemoteFlags;
  fromAddress: string;
}) {
  return (
    confirmationRedesignFlags?.signatures &&
    // following condition will ensure that user is redirected to old designs for hardware wallets
    !isExternalHardwareAccount(fromAddress) &&
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
  const isTransactionTypeRedesigned = REDESIGNED_TRANSACTION_TYPES.includes(
    transactionMetadata?.type as TransactionType,
  );

  if (
    !isTransactionTypeRedesigned ||
    approvalRequestType !== ApprovalType.Transaction ||
    !transactionMetadata
  ) {
    return false;
  }

  if (transactionMetadata.type === TransactionType.stakingDeposit) {
    return confirmationRedesignFlags?.staking_transactions;
  }

  return false;
}

export const useConfirmationRedesignEnabled = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const confirmationRedesignFlags = useSelector(
    selectConfirmationRedesignFlags,
  );

  const approvalRequestType = approvalRequest?.type as ApprovalType;
  const fromAddress = approvalRequest?.requestData?.from;

  const isRedesignedEnabled = useMemo(
    () =>
      isRedesignedSignature({
        approvalRequestType,
        confirmationRedesignFlags,
        fromAddress,
      }) ||
      isRedesignedTransaction({
        approvalRequestType,
        confirmationRedesignFlags,
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
