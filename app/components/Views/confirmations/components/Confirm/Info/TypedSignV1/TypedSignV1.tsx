import React from 'react';

import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import AccountNetworkInfo from '../../AccountNetworkInfo';
import InfoRowOrigin from '../Shared/InfoRowOrigin';
import Message from './Message';

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
