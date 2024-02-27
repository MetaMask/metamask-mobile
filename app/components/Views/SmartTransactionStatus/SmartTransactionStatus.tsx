import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ProgressBar from './ProgressBar';
import { useTheme } from '../../../util/theme';

interface Props {
  requestState: {
    smartTransaction: {
      status: string;
      creationTime: number;
      transactionHash?: string;
    };
  };
}

const STX_STATUS_DEADLINE_SEC = 160; // TODO: Use a value from backend instead.

export const showRemainingTimeInMinAndSec = (
  remainingTimeInSec: number,
): string => {
  if (!Number.isInteger(remainingTimeInSec)) {
    return '0:00';
  }
  const minutes = Math.floor(remainingTimeInSec / 60);
  const seconds = remainingTimeInSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SmartTransactionStatus = ({
  requestState: {
    smartTransaction: { status, creationTime },
  },
}: Props) => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    wrapper: {
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
      color: colors.text.alternative,
    },
  });

  const [timeLeftForPendingStxInSec, setTimeLeftForPendingStxInSec] = useState(
    STX_STATUS_DEADLINE_SEC,
  );

  // TODO
  const savings = '$123.45';

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (status === 'pending') {
      const calculateRemainingTime = () => {
        const secondsAfterStxSubmission = Math.round(
          (Date.now() - creationTime) / 1000,
        );
        if (secondsAfterStxSubmission > STX_STATUS_DEADLINE_SEC) {
          setTimeLeftForPendingStxInSec(0);
          clearInterval(intervalId);
          return;
        }
        setTimeLeftForPendingStxInSec(
          STX_STATUS_DEADLINE_SEC - secondsAfterStxSubmission,
        );
      };
      intervalId = setInterval(calculateRemainingTime, 1000);
      calculateRemainingTime();
    }

    return () => clearInterval(intervalId);
  }, [creationTime, status]);

  let icon;
  let iconColor;
  let header;
  let description;

  if (status === 'pending') {
    icon = IconName.Clock;
    iconColor = IconColor.Primary;
    header = strings('smart_transactions.status_submitting');
    description = strings('smart_transactions.estimated_completion', {
      timeLeft: showRemainingTimeInMinAndSec(timeLeftForPendingStxInSec),
    });
  } else if (status === 'success') {
    icon = IconName.CheckCircle;
    iconColor = IconColor.Success;
    header = strings('smart_transactions.status_success');
    description = undefined;
  } else if (status === 'cancelled') {
    icon = IconName.WarningTriangle;
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

  const percentComplete =
    (1 - timeLeftForPendingStxInSec / STX_STATUS_DEADLINE_SEC) * 100;

  return (
    <View style={styles.wrapper}>
      <Icon name={icon} color={iconColor} size={IconSize.Xl} />
      <Text style={styles.header}>{header}</Text>
      {status === 'pending' && (
        <ProgressBar percentComplete={percentComplete} />
      )}
      {description && <Text style={styles.desc}>{description}</Text>}
      <Text style={styles.desc}>
        {strings('smart_transactions.view_transaction')}
      </Text>
    </View>
  );
};

export default SmartTransactionStatus;
