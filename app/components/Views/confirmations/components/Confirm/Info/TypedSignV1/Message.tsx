import React, { useMemo } from 'react';
import { Text } from 'react-native';

import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import SignatureMessageSection from '../../SignatureMessageSection';

const Message = () => {
  const { approvalRequest } = useApprovalRequest();

  const message = useMemo(
    () => JSON.stringify(approvalRequest?.requestData?.data, undefined, 4),
    [approvalRequest?.requestData?.data],
  );

  return (
    <SignatureMessageSection
      messageCollapsed={message}
      messageExpanded={<Text>{message}</Text>}
      copyMessageText={message}
    />
  );
};

export default Message;
