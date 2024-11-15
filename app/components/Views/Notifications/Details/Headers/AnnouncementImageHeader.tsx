import React from 'react';
import { View } from 'react-native';
import { ModalHeaderAnnouncementImage } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import RemoteImage from '../../../../Base/RemoteImage';
import useStyles from '../useStyles';

type AnnouncementImageHeaderProps = ModalHeaderAnnouncementImage;

export default function AnnouncementImageHeader(
  props: AnnouncementImageHeaderProps,
) {
  const { styles } = useStyles();
  return (
    <View style={styles.headerImageContainer}>
      <RemoteImage
        source={{ uri: props.imageUrl }}
        style={styles.headerImageFull}
        placeholderStyle={styles.headerImageFullPlaceholder}
      />
    </View>
  );
}
