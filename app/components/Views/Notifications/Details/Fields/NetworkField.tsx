import React, { useMemo } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ModalFieldNetwork } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';

function NetworkField(props: ModalFieldNetwork) {
  const { iconUrl, name } = props;
  const { styles } = useStyles();

  const iconSource = useMemo(() => {
    const networkUrl = iconUrl;
    if (typeof networkUrl === 'string') {
      return { uri: networkUrl };
    }
    return networkUrl;
  }, [iconUrl]);

  if (!iconUrl) {
    return null;
  }

  return (
    <View style={styles.row}>
      <Avatar
        variant={AvatarVariant.Network}
        size={AvatarSize.Md}
        style={styles.badgeWrapper}
        imageSource={iconSource}
      />

      <View style={styles.boxLeft}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('asset_details.network')}
        </Text>

        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {name}
        </Text>
      </View>
    </View>
  );
}

export default NetworkField;
