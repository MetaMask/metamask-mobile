import { TransactionType } from '@metamask/transaction-controller';
import { ApprovalType } from '@metamask/controller-utils';
import React from 'react';

import useApprovalRequest from '../../../hooks/useApprovalRequest';
import { useTransactionMetadataRequest } from '../../../hooks/useTransactionMetadataRequest';
import { useQRHardwareContext } from '../../../context/QRHardwareContext/QRHardwareContext';
import PersonalSign from './PersonalSign';
import QRInfo from './QRInfo';
import TypedSignV1 from './TypedSignV1';
import TypedSignV3V4 from './TypedSignV3V4';
import StakingDeposit from './StakingDeposit';

interface ConfirmationInfoComponentRequest {
  signatureRequestVersion?: string;
  transactionType?: TransactionType;
}

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
  const transactionMetadata = useTransactionMetadataRequest();
  const { isSigningQRObject } = useQRHardwareContext();

  if (!approvalRequest?.type) {
    return null;
  }

  if (isSigningQRObject) {
    return <QRInfo />;
  }

  const { requestData } = approvalRequest ?? {
    requestData: {},
  };
  const signatureRequestVersion = requestData?.version;
  const transactionType = transactionMetadata?.type;

  const InfoComponent = ConfirmationInfoComponentMap[
    approvalRequest?.type as keyof typeof ConfirmationInfoComponentMap
  ]({ signatureRequestVersion, transactionType }) as React.FC;

  return <InfoComponent />;
};

export default Info;
