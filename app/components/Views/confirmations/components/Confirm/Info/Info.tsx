import { TransactionType } from '@metamask/transaction-controller';
import React from 'react';

import useApprovalRequest from '../../../hooks/useApprovalRequest';
import PersonalSign from './PersonalSign';
import TypedSignV1 from './TypedSignV1';

const ConfirmationInfoComponentMap = {
  [TransactionType.personalSign]: () => PersonalSign,
  [TransactionType.signTypedData]: () => TypedSignV1,
};

const Info = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest?.type) {
    return null;
  }

  const InfoComponent: React.FC =
    ConfirmationInfoComponentMap[
      approvalRequest?.type as keyof typeof ConfirmationInfoComponentMap
    ]();

  return <InfoComponent />;
};

export default Info;
