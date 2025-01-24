import React from 'react';
import { StyleSheet, View } from 'react-native';

import DataField from './DataField';

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
}: {
  data: DataTreeInput;
  chainId: string;
  depth?: number;
}) => (
  <View style={styles.container}>
    {Object.keys(data).map((dataKey: string, index: number) => {
      const datum = data[dataKey];
      return (
        <DataField
          label={dataKey}
          key={`${dataKey}-${index}`}
          chainId={chainId}
          depth={depth}
          {...datum}
        />
      );
    })}
  </View>
);

export default DataTree;
