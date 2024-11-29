import React from 'react';

import InfoRow from '../../UI/InfoRow';
import DataField from './DataField';

export type DataTreeInput = Record<string, { type: string; value: string }>;

const dataRowStyle = { paddingBottom: 0, paddingHorizontal: 0 };

const DataTree = ({
  data,
  chainId,
}: {
  data: DataTreeInput;
  chainId: string;
}) => (
  <>
    {Object.keys(data).map((dataKey: string, index: number) => {
      const datum = data[dataKey];
      return (
        <InfoRow
          key={`${dataKey}-${index}`}
          label={dataKey}
          style={dataRowStyle}
        >
          <DataField chainId={chainId} {...datum} />
        </InfoRow>
      );
    })}
  </>
);

export default DataTree;
