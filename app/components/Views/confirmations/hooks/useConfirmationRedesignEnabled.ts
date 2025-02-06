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

interface ConfirmationRedesignRemoteFlags {
  signatures: boolean;
  stakingDeposit: boolean;
}

const REDESIGNED_SIGNATURE_TYPES = [
  ApprovalType.EthSignTypedData,
  ApprovalType.PersonalSign,
];

const REDESIGNED_TRANSACTION_TYPES = [TransactionType.stakingDeposit];

function isRedesignedSignature({
  approvalRequestType,
  confirmation_redesign,
  fromAddress,
}: {
  approvalRequestType: ApprovalType;
  confirmation_redesign: ConfirmationRedesignRemoteFlags;
  fromAddress: string;
}) {
  return (
    confirmation_redesign?.signatures &&
    // following condition will ensure that user is redirected to old designs for hardware wallets
    !isHardwareAccount(fromAddress) &&
    approvalRequestType &&
    REDESIGNED_SIGNATURE_TYPES.includes(approvalRequestType as ApprovalType)
  );
}

function isRedesignedTransaction({
  approvalRequestType,
  confirmation_redesign,
  transactionMetadata,
}: {
  approvalRequestType: ApprovalType;
  confirmation_redesign: ConfirmationRedesignRemoteFlags;
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
    return confirmation_redesign?.stakingDeposit;
  }

  return false;
}

export const useConfirmationRedesignEnabled = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadata();
  const { confirmation_redesign } = useSelector(
    selectRemoteFeatureFlags,
  ) as unknown as {
    confirmation_redesign: ConfirmationRedesignRemoteFlags;
  };

  const approvalRequestType = approvalRequest?.type as ApprovalType;
  const fromAddress = approvalRequest?.requestData?.from;

  const isRedesignedEnabled = useMemo(
    () =>
      isRedesignedSignature({
        approvalRequestType,
        confirmation_redesign,
        fromAddress,
      }) ||
      isRedesignedTransaction({
        approvalRequestType,
        confirmation_redesign,
        transactionMetadata,
      }),
    [
      approvalRequestType,
      confirmation_redesign,
      fromAddress,
      transactionMetadata,
    ],
  );

  return { isRedesignedEnabled };
};
