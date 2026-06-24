import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import ListItem from '../../Base/ListItem';
import { useTheme } from '../../../util/theme';
import { formatActivityListDateHeader } from '../../../util/activity-adapters';

export const ActivityListDateHeader = ({
  timestamp,
  label,
}: {
  timestamp?: number;
  label?: string;
}) => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    dateHeader: {
      color: colors.text.alternative,
      fontSize: 14,
      marginBottom: 0,
      paddingHorizontal: 0,
      paddingTop: 16,
      paddingBottom: 4,
    },
  });

  const text = label ?? formatActivityListDateHeader(timestamp ?? 0);

  return (
    <Box twClassName="px-4">
      <ListItem.Date
        style={styles.dateHeader}
        testID="activity-list-date-header"
      >
        {text}
      </ListItem.Date>
    </Box>
  );
};

export default ActivityListDateHeader;
