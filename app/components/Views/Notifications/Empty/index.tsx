import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { createStyles } from './styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { NotificationsViewSelectorsIDs } from '../../../../../e2e/selectors/NotificationsView.selectors';
const Empty = () => {
  const styles = createStyles();
  return (
    <View
      style={styles.wrapper}
      testID={NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_CONTAINER}
    >
      <Icon
        name={IconName.Notification}
        size={IconSize.Xl}
        color={IconColor.Default}
        style={styles.text}
      />
      <Text style={styles.text} variant={TextVariant.HeadingMD}>
        {strings('notifications.empty.title')}
      </Text>
      <Text style={styles.text} variant={TextVariant.BodyMD}>
        {strings('notifications.empty.message')}
      </Text>
    </View>
  );
};

export default Empty;
