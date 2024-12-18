import React from 'react';

import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import NoChangeSimulation from '../../NoChangeSimulation';
import InfoRowOrigin from '../Shared/InfoRowOrigin';
import Message from './Message';

const PersonalSign = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest) {
    return null;
  }

  return (
    <>
      <NoChangeSimulation />
      <InfoRowOrigin />
      <Message />
    </>
  );
};

export default PersonalSign;
