import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { stripHexPrefix } from '../../../../../../../util/address';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';

const hexToText = (hex: string) => {
  if (!hex) {
    return hex;
  }
  try {
    const stripped = stripHexPrefix(hex);
    const buff = Buffer.from(stripped, 'hex');
    return buff.toString('utf8');
  } catch (e) {
    return hex;
  }
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 100,
    marginTop: 32,
  },
});

const PersonalSignInfo = () => {
  const { approvalRequest } = useApprovalRequest();

  return (
    <View style={styles.container}>
      <Text>{hexToText(approvalRequest?.requestData?.data)}</Text>
    </View>
  );
};

export default PersonalSignInfo;
