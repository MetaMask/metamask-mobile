import React from 'react';
import {
  Box,
  FontWeight,
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
}

function getStatusDisplay(status: Status): StatusDisplay {
  switch (status) {
    case 'success':
      return {
        label: strings('transaction.confirmed'),
        textColor: TextColor.SuccessDefault,
      };
    case 'failed':
      return {
        label: strings('transaction.failed'),
        textColor: TextColor.ErrorDefault,
      };
    case 'cancelled':
      return {
        label: strings('transaction.canceled'),
        textColor: TextColor.ErrorDefault,
      };
    case 'pending':
    default:
      return {
        label: strings('transaction.pending'),
        textColor: TextColor.WarningDefault,
      };
  }
}

/** Renders a transaction status as a color-coded label (no icon). */
export function ActivityDetailsStatus({ status }: { status: Status }) {
  const { label, textColor } = getStatusDisplay(status);

  return (
    <Box
      twClassName="flex-row items-center gap-1"
      testID={ActivityDetailsSelectorsIDs.STATUS_PILL}
    >
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
