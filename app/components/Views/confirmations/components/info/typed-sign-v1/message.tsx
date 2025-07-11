import React from 'react';
import SignatureMessageSection from '../../signature-message-section';
import DataTree, { DataTreeInput } from '../../data-tree/data-tree';
import { useSignatureRequest } from '../../../hooks/signatures/useSignatureRequest';

interface TypesSignDataV1 {
  name: string;
  value: string;
  type: string;
}

const Message = () => {
  const signatureRequest = useSignatureRequest();
  const chainId = signatureRequest?.chainId as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedSignData = signatureRequest?.messageParams?.data as any;

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
