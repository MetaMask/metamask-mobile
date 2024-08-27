import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { styles } from './styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
const Empty = ({ testID }: { testID?: string }) => (
  <View style={styles.wrapper} testID={testID}>
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

export default Empty;
