import React from 'react';
import { Text } from 'react-native';

import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import SignatureMessageSection from '../../SignatureMessageSection';

const Message = () => {
  const { approvalRequest } = useApprovalRequest();

  const typedSignData = approvalRequest?.requestData?.data;

  if (!typedSignData) {
    return null;
  }

  const parsedData = JSON.stringify(typedSignData);

  const firstDataValue = parsedData?.substring(0, 100);

  // todo: detailed data tree to be implemented
  return (
    <SignatureMessageSection
      messageCollapsed={<Text>{firstDataValue}</Text>}
      messageExpanded={<Text>{parsedData}</Text>}
      copyMessageText={typedSignData}
    />
  );
};

export default Message;
