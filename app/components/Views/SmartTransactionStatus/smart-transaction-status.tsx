import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

interface Props {
  requestState: {
    smartTransaction: {
      status: string;
      creationTime: number;
      transactionHash?: string;
    };
  };
}

const styles = StyleSheet.create({
  centered: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desc: {
    textAlign: 'center',
  },
});

const SmartTransactionStatus = ({
  requestState: {
    smartTransaction: { status },
  },
}: Props) => {
  // TODO
  const timeLeft = '0:59';
  const savings = '$123.45';
  return (
    <View>
      {/* Submitting */}
      {status === 'pending' && (
        <View style={styles.centered}>
          <Icon name={IconName.Clock} size={IconSize.Md} />
          <Text>{strings('smart_transactions.status_submitting')}</Text>
          <Text>
            {strings('smart_transactions.estimated_completion', { timeLeft })}
          </Text>
          <Text style={styles.desc}>
            {strings('smart_transactions.view_transaction')}
          </Text>
        </View>
      )}

      {/* Success */}
      {status === 'success' && (
        <View style={styles.centered}>
          <Icon name={IconName.Check} size={IconSize.Md} />
          <Text style={styles.desc}>
            {strings('smart_transactions.status_success')}
          </Text>
        </View>
      )}

      {/* Reverted */}
      <View style={styles.centered}>
        <Icon name={IconName.Info} size={IconSize.Md} />
        <Text>{strings('smart_transactions.status_reverted')}</Text>
        <Text style={styles.desc}>
          {strings('smart_transactions.reverted_description', { savings })}
        </Text>
      </View>

      {/* Timeout */}
      <View style={styles.centered}>
        <Icon name={IconName.Warning} size={IconSize.Md} />
        <Text>{strings('smart_transactions.status_timeout')}</Text>
        <Text style={styles.desc}>
          {strings('smart_transactions.timeout_description')}
        </Text>
      </View>
    </View>
  );
};

export default SmartTransactionStatus;
