import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import ListItem from '../../Base/ListItem';
import { useTheme } from '../../../util/theme';

const isSameLocalDay = (date: Date, otherDate: Date) =>
  date.getFullYear() === otherDate.getFullYear() &&
  date.getMonth() === otherDate.getMonth() &&
  date.getDate() === otherDate.getDate();

export const formatActivityListDateHeader = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameLocalDay(date, today)) {
    return strings('perps.today');
  }

  if (isSameLocalDay(date, yesterday)) {
    return strings('perps.yesterday');
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

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
