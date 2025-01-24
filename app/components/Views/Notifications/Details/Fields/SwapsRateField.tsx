import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ModalFieldSwapsRate } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';

type SwapsRateFieldProps = ModalFieldSwapsRate;

function SwapsRateField(props: SwapsRateFieldProps) {
  const { styles, theme } = useStyles();

  return (
    <View style={styles.row}>
      <Avatar
        variant={AvatarVariant.Icon}
        size={AvatarSize.Md}
        style={styles.badgeWrapper}
        name={IconName.SwapHorizontal}
        backgroundColor={theme.colors.info.muted}
        iconColor={IconColor.Info}
      />
      <View style={styles.boxLeft}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('notifications.rate')}
        </Text>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {props.rate}
        </Text>
      </View>
    </View>
  );
}

export default SwapsRateField;
