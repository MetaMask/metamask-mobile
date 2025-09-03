import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import React from 'react';
import Icon, {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import Tooltip from '../../UI/Tooltip';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../UI/AnimatedSpinner';
import { View } from 'react-native';

export function TransactionDetailsStatusIcon({
  transactionMeta,
}: {
  transactionMeta: TransactionMeta;
}) {
  const { status } = transactionMeta;

  const iconName = getStatusIcon(status);
  const iconColour = getStatusColour(status);
  const errorMessage = getErrorMessage(transactionMeta);

  if (status === TransactionStatus.failed && errorMessage) {
    return (
      <Tooltip
        iconColor={IconColor.Error}
        tooltipTestId="status-tooltip"
        content={errorMessage}
      />
    );
  }

  if (iconName) {
    return (
      <Icon
        testID={`status-icon-${status}`}
        name={iconName}
        color={iconColour}
      />
    );
  }

  return (
    <View testID="status-spinner">
      <AnimatedSpinner size={SpinnerSize.XS} />
    </View>
  );
}

function getStatusIcon(status: TransactionStatus): IconName | undefined {
  switch (status) {
    case TransactionStatus.confirmed:
      return IconName.Check;
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return IconName.Warning;
    default:
      return undefined;
  }
}

function getStatusColour(status: TransactionStatus): IconColor {
  switch (status) {
    case TransactionStatus.confirmed:
      return IconColor.Success;
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return IconColor.Error;
    default:
      return IconColor.Warning;
  }
}

function getErrorMessage(transactionMeta: TransactionMeta): string | undefined {
  const { error } = transactionMeta;

  if (!error) return undefined;

  if (error.stack) {
    try {
      const start = error.stack.indexOf('{');
      const end = error.stack.lastIndexOf('}');
      const stackObject = JSON.parse(error.stack.substring(start, end + 1));
      const stackMessage = stackObject?.data?.message;

      if (stackMessage) {
        return stackMessage;
      }
    } catch {
      // Intentionally empty
    }
  }

  return error.message;
}
