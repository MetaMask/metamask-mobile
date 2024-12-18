import { TransactionType } from '@metamask/transaction-controller';
import React from 'react';

import useApprovalRequest from '../../../hooks/useApprovalRequest';
import PersonalSign from './PersonalSign';
import TypedSignV1 from './TypedSignV1';
import TypedSignV3V4 from './TypedSignV3V4';

const ConfirmationInfoComponentMap = {
  [TransactionType.personalSign]: () => PersonalSign,
  [TransactionType.signTypedData]: (approvalRequestVersion: string) => {
    if (approvalRequestVersion === 'V1') return TypedSignV1;
    return TypedSignV3V4;
  },
};

const Info = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest?.type) {
    return null;
  }

  const { requestData } = approvalRequest ?? {
    requestData: {},
  };
  const approvalRequestVersion = requestData?.version;

  const InfoComponent: React.FC = ConfirmationInfoComponentMap[
    approvalRequest?.type as keyof typeof ConfirmationInfoComponentMap
  ](approvalRequestVersion);

  return <InfoComponent />;
};

export default Info;
