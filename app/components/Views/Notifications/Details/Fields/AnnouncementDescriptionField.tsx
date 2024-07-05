import React, { useState } from 'react';
import { View } from 'react-native';
import Html from 'react-native-render-html';
import { ModalFieldAnnouncementDescription } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';

type AnnouncementDescriptionFieldProps = ModalFieldAnnouncementDescription;

function AnnouncementDescriptionField(
  props: AnnouncementDescriptionFieldProps,
) {
  const { styles } = useStyles();

  const [width, setWidth] = useState(0);

  return (
    <View
      style={styles.row}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Html source={{ html: props.description }} contentWidth={width} />
    </View>
  );
}

export default AnnouncementDescriptionField;
