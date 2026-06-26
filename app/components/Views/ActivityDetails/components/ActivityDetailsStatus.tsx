import React from 'react';
import {
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { Status } from '../../../../util/activity-adapters';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

interface StatusDisplay {
  label: string;
  textColor: TextColor;
  iconColor: IconColor;
  iconName: IconName;
}

function getStatusDisplay(status: Status): StatusDisplay {
  switch (status) {
    case 'success':
      return {
        label: strings('transaction.confirmed'),
        textColor: TextColor.SuccessDefault,
        iconColor: IconColor.SuccessDefault,
        iconName: IconName.Confirmation,
      };
    case 'failed':
      return {
        label: strings('transaction.failed'),
        textColor: TextColor.ErrorDefault,
        iconColor: IconColor.ErrorDefault,
        iconName: IconName.CircleX,
      };
    case 'cancelled':
      return {
        label: strings('transaction.cancelled'),
        textColor: TextColor.ErrorDefault,
        iconColor: IconColor.ErrorDefault,
        iconName: IconName.Close,
      };
    case 'pending':
    default:
      return {
        label: strings('transaction.pending'),
        textColor: TextColor.WarningDefault,
        iconColor: IconColor.WarningDefault,
        iconName: IconName.Clock,
      };
  }
}

/** Renders a transaction status with a matching icon and color. */
export function ActivityDetailsStatus({ status }: { status: Status }) {
  const { label, textColor, iconColor, iconName } = getStatusDisplay(status);

  return (
    <Box
      twClassName="flex-row items-center gap-1"
      testID={ActivityDetailsSelectorsIDs.STATUS_PILL}
    >
      <Icon name={iconName} size={IconSize.Sm} color={iconColor} />
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={textColor}
      >
        {label}
      </Text>
    </Box>
  );
}
