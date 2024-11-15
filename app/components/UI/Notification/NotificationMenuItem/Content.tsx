import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { NotificationMenuItem } from '../../../../util/notifications/notification-states/types/NotificationMenuItem';
import useStyles from '../List/useStyles';
import { formatMenuItemDate } from '../../../../util/notifications/methods';

type NotificationContentProps = Pick<
  NotificationMenuItem,
  'title' | 'description' | 'createdAt'
>;

function NotificationContent(props: NotificationContentProps) {
  const { styles } = useStyles();

  return (
    <View style={styles.containerFill}>
      {/* Section 1 - Title + Timestamp */}
      <View style={styles.rowInsider}>
        <Text
          color={TextColor.Alternative}
          variant={TextVariant.BodySM}
          style={styles.containerFill}
        >
          {props.title}
        </Text>
        <Text color={TextColor.Muted} variant={TextVariant.BodySM}>
          {formatMenuItemDate(new Date(props.createdAt))}
        </Text>
      </View>
      {/* Section 2 - Left Desc + Right Desc */}
      <View style={styles.rowInsider}>
        <Text style={styles.containerFill} variant={TextVariant.BodyMD}>
          {props.description.start}
        </Text>
        {props.description.end && (
          <Text variant={TextVariant.BodyMD}>{props.description.end}</Text>
        )}
      </View>
    </View>
  );
}

export default NotificationContent;
