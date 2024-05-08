import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import useTransaction from '../../../../hooks/useTransaction';

const styles = StyleSheet.create({
  container: {
    marginBottom: 100,
    marginTop: 32,
    marginLeft: 32,
    marginRight: 32,
  },
  row: {
    marginBottom: 32,
  },
});

const TransactionInfo = () => {
  const { transaction } = useTransaction();

  return (
    <View style={styles.container}>
      <Text style={styles.row}>From: {transaction?.txParams?.from}</Text>
      <Text style={styles.row}>
        Max Fee: {transaction?.txParams?.maxFeePerGas}
      </Text>
      <Text style={styles.row}>
        Priority Fee: {transaction?.txParams?.maxPriorityFeePerGas}
      </Text>
    </View>
  );
};

export default TransactionInfo;
