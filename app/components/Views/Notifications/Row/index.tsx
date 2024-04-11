/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { BOTTOM_BADGEWRAPPER_BADGEPOSITION } from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import { CommonSelectorsIDs } from '../../../../../e2e/selectors/Common.selectors';
import NetworkMainAssetLogo from '../../../../components/UI/NetworkMainAssetLogo';
import { Notification, TRIGGER_TYPES } from '../../../../util/notifications';
import { createStyles } from './styles';
import { getRowDetails } from '../utils';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../component-library/components/Icons/Icon';
const metamask_fox = require('../../../../images/fox.png'); // eslint-disable-line

interface NotificationRowProps {
  notification: Notification;
  navigation: any;
  onPress: (notification: Notification) => void;
}
//TODO: make usage of notification.isRead

const Row = ({ notification, navigation, onPress }: NotificationRowProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const handleOnPress = () => {
    onPress?.(notification);
  };

  const handleCTAPress = () => {
    let url = '';

    notification.type === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT &&
    notification.data?.action?.actionUrl
      ? (url = notification.data.action.actionUrl)
      : (url = notification.data.link.linkUrl);

    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url,
      },
    });
  };

  const { avatarBadge, createdAt, imageUri, asset, title, value } =
    getRowDetails(notification)?.row || {};

  return (
    <TouchableOpacity onPress={handleOnPress} style={styles.wrapper}>
      <View style={styles.itemWrapper}>
        {notification.type !== TRIGGER_TYPES.FEATURES_ANNOUNCEMENT ? (
          <BadgeWrapper
            badgePosition={BOTTOM_BADGEWRAPPER_BADGEPOSITION}
            badgeElement={
              <Badge
                variant={BadgeVariant.NotificationsActions}
                iconName={avatarBadge}
              />
            }
            style={styles.badgeWrapper}
          >
            {notification.type.includes('eth') ? (
              <NetworkMainAssetLogo style={styles.ethLogo} />
            ) : (
              <AvatarToken
                imageSource={{
                  uri: imageUri,
                }}
                size={AvatarSize.Md}
              />
            )}
          </BadgeWrapper>
        ) : (
          <View style={styles.foxWrapper}>
            <Image
              source={metamask_fox}
              style={styles.fox}
              resizeMethod={'auto'}
              testID={CommonSelectorsIDs.FOX_ICON}
            />
          </View>
        )}
        <View style={styles.rowContainer}>
          <View style={styles.rowInsider}>
            <Text color={TextColor.Muted} variant={TextVariant.BodySM}>
              {title}
            </Text>
            <Text color={TextColor.Muted} variant={TextVariant.BodySM}>
              {createdAt?.toString()}
            </Text>
          </View>
          <View style={styles.rowInsider}>
            <Text style={styles.textBox} variant={TextVariant.BodyMD}>
              {asset?.name || asset?.symbol}
            </Text>
            <Text variant={TextVariant.BodyMD}>{value}</Text>
          </View>
        </View>
      </View>
      {notification.type === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT && (
        <Button
          variant={ButtonVariants.Secondary}
          label={
            (notification.data?.link as { linkText?: string })?.linkText ||
            (notification.data?.action as { actionText?: string })?.actionText
          }
          onPress={handleCTAPress}
          style={styles.button}
          endIconName={IconName.Arrow2Right}
        />
      )}
    </TouchableOpacity>
  );
};

export default Row;
