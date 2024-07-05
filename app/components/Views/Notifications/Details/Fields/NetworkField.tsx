import React from 'react';
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

type NetworkFieldProps = ModalFieldNetwork;

function NetworkField(props: NetworkFieldProps) {
  const { iconUrl, name } = props;
  const { styles } = useStyles();

  return (
    <View style={styles.row}>
      <Avatar
        variant={AvatarVariant.Network}
        size={AvatarSize.Md}
        style={styles.badgeWrapper}
        imageSource={{ uri: iconUrl }}
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
