import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

const styles = StyleSheet.create({
  row: {
    marginVertical: 8,
  },
});

interface Props {
  style?: ViewStyle;
  children?: React.ReactNode;
}

function Row({ style, ...props }: Props) {
  return <View style={[styles.row, style]} {...props} />;
}

export default Row;
