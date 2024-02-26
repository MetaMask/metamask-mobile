import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';
import Icon, {
  IconColor,
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
    gap: 10,
  },
  header: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
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

  let icon;
  let iconColor;
  let header;
  let description;

  if (status === 'pending') {
    icon = IconName.Clock;
    iconColor = IconColor.Primary;
    header = strings('smart_transactions.status_submitting');
    description = strings('smart_transactions.estimated_completion', {
      timeLeft,
    });
  } else if (status === 'success') {
    icon = IconName.Check;
    iconColor = IconColor.Success;
    header = strings('smart_transactions.status_success');
    description = undefined;
  } else if (status === 'cancelled') {
    icon = IconName.Warning;
    iconColor = IconColor.Warning;
    header = strings('smart_transactions.status_timeout');
    description = strings('smart_transactions.timeout_description');
  } else {
    icon = IconName.Danger;
    iconColor = IconColor.Error;
    header = strings('smart_transactions.status_reverted');
    description = strings('smart_transactions.reverted_description', {
      savings,
    });
  }

  return (
    <View>
      <View style={styles.centered}>
        <Icon name={icon} color={iconColor} size={IconSize.Xl} />
        <Text style={styles.header}>{header}</Text>
        {description && <Text>{description}</Text>}
        <Text style={styles.desc}>
          {strings('smart_transactions.view_transaction')}
        </Text>
      </View>
    </View>
  );
};

export default SmartTransactionStatus;
