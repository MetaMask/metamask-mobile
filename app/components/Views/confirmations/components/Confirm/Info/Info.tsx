import { TransactionType } from '@metamask/transaction-controller';
import { ApprovalType } from '@metamask/controller-utils';
import React from 'react';

import useApprovalRequest from '../../../hooks/useApprovalRequest';
import { useTransactionMetadata } from '../../../hooks/useTransactionMetadata';
import PersonalSign from './PersonalSign';
import TypedSignV1 from './TypedSignV1';
import TypedSignV3V4 from './TypedSignV3V4';
import StakingDeposit from './StakingDeposit';

type ConfirmationInfoComponentRequest = {
  signatureRequestVersion?: string;
  transactionType?: TransactionType;
};

const ConfirmationInfoComponentMap = {
  [TransactionType.personalSign]: () => PersonalSign,
  [TransactionType.signTypedData]: ({
    signatureRequestVersion,
  }: ConfirmationInfoComponentRequest) => {
    if (signatureRequestVersion === 'V1') return TypedSignV1;
    return TypedSignV3V4;
  },
  [ApprovalType.Transaction]: ({
    transactionType,
  }: ConfirmationInfoComponentRequest) => {
    if (transactionType === TransactionType.stakingDeposit)
      return StakingDeposit;
    return null;
  },
};

const Info = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadata();

  if (!approvalRequest?.type) {
    return null;
  }

  const { requestData } = approvalRequest ?? {
    requestData: {},
  };
  const signatureRequestVersion = requestData?.version;
  const transactionType = transactionMetadata?.type;

  const InfoComponent: React.FC | null = ConfirmationInfoComponentMap[
    approvalRequest?.type as keyof typeof ConfirmationInfoComponentMap
  ]({ signatureRequestVersion, transactionType });

  if (!InfoComponent) {
    return null;
  }

  return <InfoComponent />;
};

export default Info;
