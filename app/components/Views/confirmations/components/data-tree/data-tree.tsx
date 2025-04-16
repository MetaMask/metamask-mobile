import React from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryType } from '../../constants/signatures';
import DataField from './data-field';

export type DataTreeInput = Record<string, { type: string; value: string }>;

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
});

const DataTree = ({
  data,
  chainId,
  depth = 0,
  primaryType,
  tokenDecimals,
}: {
  data: DataTreeInput;
  chainId: string;
  depth?: number;
  primaryType?: PrimaryType;
  tokenDecimals?: number;
}) => (
  <View style={styles.container}>
    {Object.keys(data).map((dataKey: string, index: number) => {
      const datum = data[dataKey];
      return (
        <DataField
          chainId={chainId}
          depth={depth}
          label={dataKey}
          key={`${dataKey}-${index}`}
          primaryType={primaryType}
          tokenDecimals={tokenDecimals}
          {...datum}
        />
      );
    })}
  </View>
);

export default DataTree;
