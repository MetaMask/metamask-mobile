import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Engine from '../../../../../../core/Engine';
import useApprovalRequest from '../../../hooks/useApprovalRequest';

const styles = StyleSheet.create({
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 32,
    marginTop: 40,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
});

const Header = () => {
  const { approvalRequest } = useApprovalRequest();
  const { NetworkController } = Engine.context as any;
  const networkType = NetworkController.state.providerConfig.type;

  return (
    <View>
      <Text style={styles.title}>Sign the message?</Text>
      <Text style={styles.info}>{approvalRequest?.origin}</Text>
      <Text style={styles.info}>{networkType}</Text>
    </View>
  );
};

export default Header;
