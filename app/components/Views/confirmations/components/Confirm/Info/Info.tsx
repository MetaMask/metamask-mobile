import React from 'react';

import { ApprovalTypes } from '../../../../../../core/RPCMethods/RPCMethodMiddleware';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import PersonalSignInfo from './PersonalSignInfo';
import TransactionInfo from './TransactionInfo';

const Info = () => {
  const { approvalRequest } = useApprovalRequest();

  if (approvalRequest?.type === ApprovalTypes.PERSONAL_SIGN) {
    return <PersonalSignInfo />;
  }

  if (approvalRequest?.type === ApprovalTypes.TRANSACTION) {
    return <TransactionInfo />;
  }

  return null;
};

export default Info;
