import React from 'react';

import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import InfoRowOrigin from '../Shared/InfoRowOrigin';
import Message from './Message';

const TypedSignV3V4 = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest) {
    return null;
  }

  return (
    <>
      {/* SIMULATION TO BE ADDED */}
      <InfoRowOrigin />
      <Message />
    </>
  );
};

export default TypedSignV3V4;
