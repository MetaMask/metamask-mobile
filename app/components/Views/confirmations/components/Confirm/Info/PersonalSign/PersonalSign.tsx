import React from 'react';

import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import AccountNetworkInfo from '../../AccountNetworkInfo';
import InfoRowOrigin from '../Shared/InfoRowOrigin';
import Message from './Message';

const PersonalSign = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest) {
    return null;
  }

  return (
    <>
      <AccountNetworkInfo isSignatureRequest />
      <InfoRowOrigin isSignatureRequest />
      <Message />
    </>
  );
};

export default PersonalSign;
