import { TransactionType } from '@metamask/transaction-controller';
import React from 'react';

import useApprovalRequest from '../../../hooks/useApprovalRequest';
import PersonalSign from './PersonalSign';

const ConfirmationInfoComponentMap = {
  [TransactionType.personalSign]: () => PersonalSign,
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
