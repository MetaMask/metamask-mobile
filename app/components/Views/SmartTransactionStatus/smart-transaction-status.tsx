import React from 'react';
import { View, Text } from 'react-native';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';

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

  // TODO
  const timeLeft = '0:59';
  const savings = '$123.45';
  return (
    <View>
      {/* Submitting */}
      <Text>{strings('smart_transactions.status_submitting')}</Text>
      <Text>
        {strings('smart_transactions.estimated_completion', { timeLeft })}
      </Text>
      <Text>{strings('smart_transactions.view_transaction')}</Text>

      {/* Success */}
      <Text>{strings('smart_transactions.status_success')}</Text>

      {/* Reverted */}
      <Text>{strings('smart_transactions.status_reverted')}</Text>
      <Text>
        {strings('smart_transactions.reverted_description', { savings })}
      </Text>

      {/* Timeout */}
      <Text>{strings('smart_transactions.status_timeout')}</Text>
      <Text>{strings('smart_transactions.timeout_description')}</Text>
    </View>
  );
};

export default SmartTransactionStatus;
