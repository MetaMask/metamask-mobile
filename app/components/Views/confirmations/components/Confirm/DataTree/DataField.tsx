import React, { memo } from 'react';
import { Hex, isValidHexAddress } from '@metamask/utils';
import { StyleSheet, Text, View } from 'react-native';

import Address from '../../UI/InfoRow/InfoValue/Address';
import InfoRow from '../../UI/InfoRow';
import DataTree, { DataTreeInput } from './DataTree';

const createStyles = (depth: number) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: '100%',
      paddingLeft: depth > 0 ? 8 : 0,
    },
    dataRow: {
      paddingHorizontal: 0,
      paddingBottom: 0,
    },
  });

const convertToTitleCase = (str: string) =>
  str?.charAt(0)?.toUpperCase() + str?.slice(1);

const DataField = memo(
  ({
    label,
    type,
    value,
    chainId,
    depth,
  }: {
    label: string;
    type: string;
    value: string;
    chainId: string;
    depth: number;
  }) => {
    const styles = createStyles(depth);
    let fieldDisplay;
    if (type === 'address' && isValidHexAddress(value as Hex)) {
      fieldDisplay = <Address address={value} chainId={chainId} />;
    } else if (typeof value === 'object') {
      fieldDisplay = (
        <DataTree
          data={value as unknown as DataTreeInput}
          chainId={chainId}
          depth={depth + 1}
        />
      );
    } else {
      fieldDisplay = <Text>{value}</Text>;
    }
    return (
      <View style={styles.container}>
        <InfoRow label={convertToTitleCase(label)} style={styles.dataRow}>
          {fieldDisplay}
        </InfoRow>
      </View>
    );
  },
);

export default DataField;
