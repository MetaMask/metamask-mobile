import React from 'react';
import { View, Text } from 'react-native';
import Logger from '../../../util/Logger';

interface Props {
  requestState: {
    smartTransaction: {
      status: string;
      creationTime: number;
      transactionHash?: string;
    };
  };
}

const SmartTransactionStatus = (props: Props) => {
  Logger.log('STX SmartTransactionStatus props', props);
  return (
    <View>
      <Text>{JSON.stringify(props)}</Text>
    </View>
  );
};

export default SmartTransactionStatus;
