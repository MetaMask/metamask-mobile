import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { formatActivityListDateHeader } from '../../../util/activity-adapters';

export const ActivityListDateHeader = ({
  timestamp,
  label,
}: {
  timestamp?: number;
  label?: string;
}) => {
  const text = label ?? formatActivityListDateHeader(timestamp ?? 0);

  return (
    <Box twClassName="px-4 pt-4 pb-1">
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        fontWeight={FontWeight.Medium}
        testID="activity-list-date-header"
      >
        {text}
      </Text>
    </Box>
  );
};

export default ActivityListDateHeader;
