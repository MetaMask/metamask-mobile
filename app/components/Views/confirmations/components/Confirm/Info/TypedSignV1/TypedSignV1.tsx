import React from 'react';

import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import InfoRowOrigin from '../Shared/InfoRowOrigin';
import Message from './Message';
import AccountNetworkInfo from '../../AccountNetworkInfo';

const TypedSignV1 = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest) {
    return null;
  }

  return (
    <>
      <AccountNetworkInfo />
      <InfoRowOrigin />
      <Message />
    </>
  );
};

export default TypedSignV1;
