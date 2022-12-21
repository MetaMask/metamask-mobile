import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

const styles = StyleSheet.create({
  row: {
    marginVertical: 8,
  },
  first: {
    marginTop: 0,
  },
  last: {
    marginBottom: 0,
  },
});

interface Props {
  style?: ViewStyle;
  first?: boolean;
  last?: boolean;
  children?: React.ReactNode;
}

function Row({ style, first, last, ...props }: Props) {
  return (
    <View
      style={[styles.row, first && styles.first, last && styles.last, style]}
      {...props}
    />
  );
}

export default Row;
