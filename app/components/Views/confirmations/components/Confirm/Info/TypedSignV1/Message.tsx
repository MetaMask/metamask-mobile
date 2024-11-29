import React from 'react';
import { useSelector } from 'react-redux';

import { selectChainId } from '../../../../../../../selectors/networkController';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import SignatureMessageSection from '../../SignatureMessageSection';
import DataTree, { DataTreeInput } from '../../DataTree/DataTree';

interface TypesSignDataV1 {
  name: string;
  value: string;
  type: string;
}

const Message = () => {
  const { approvalRequest } = useApprovalRequest();
  const chainId = useSelector(selectChainId);

  const typedSignData = approvalRequest?.requestData?.data;

  if (!typedSignData) {
    return null;
  }

  const parsedData = typedSignData.reduce(
    (val: DataTreeInput, { name, value, type }: TypesSignDataV1) => ({
      ...val,
      [name]: { type, value },
    }),
    {},
  );

  const firstDataValue = typedSignData[0];

  return (
    <SignatureMessageSection
      messageCollapsed={
        <DataTree
          data={{
            [firstDataValue.name]: {
              type: firstDataValue.type,
              value: firstDataValue.value,
            },
          }}
          chainId={chainId}
        />
      }
      messageExpanded={<DataTree data={parsedData} chainId={chainId} />}
      copyMessageText={typedSignData}
    />
  );
};

export default Message;
