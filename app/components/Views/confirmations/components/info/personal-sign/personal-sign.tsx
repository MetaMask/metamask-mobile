import React from 'react';

import useApprovalRequest from '../../../hooks/useApprovalRequest';
import AccountNetworkInfoRow from '../../rows/account-network-info-row';
import OriginRow from '../../rows/origin-row';
import Message from './message';

const PersonalSign = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest) {
    return null;
  }

  return (
    <>
      <AccountNetworkInfoRow />
      <OriginRow isSignatureRequest />
      <Message />
    </>
  );
};

export default PersonalSign;
