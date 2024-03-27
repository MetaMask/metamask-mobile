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
import NotificationTypes from '../../../../util/notifications';
import { Notification } from '../types';
import { createStyles } from './styles';
import { NotificationActionBadgeSource, formatDate } from '../utils';
import { formatAddress } from '../../../../util/address';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../component-library/components/Icons/Icon';
const metamask_fox = require('../../../../images/fox.png'); // eslint-disable-line

interface NotificationRowProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
}

const Row = ({ notification, onPress }: NotificationRowProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const handleOnPress = () => {
    onPress?.(notification);
  };

  return (
    <TouchableOpacity onPress={handleOnPress} style={styles.wrapper}>
      <View style={styles.itemWrapper}>
        {notification.type !== NotificationTypes.FCM ? (
          <BadgeWrapper
            badgePosition={BOTTOM_BADGEWRAPPER_BADGEPOSITION}
            badgeElement={
              <Badge
                variant={BadgeVariant.NotificationsActions}
                iconName={NotificationActionBadgeSource(
                  notification.actionsType,
                )}
              />
            }
            style={styles.badgeWrapper}
          >
            {notification?.data?.transaction?.asset?.isETH ? (
              <NetworkMainAssetLogo style={styles.ethLogo} />
            ) : (
              <AvatarToken
                name={notification?.data?.transaction?.asset?.symbol}
                imageSource={{
                  uri: notification?.data?.transaction?.asset?.logo,
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
              {notification.data?.transaction
                ? formatAddress(notification.data?.transaction.from, 'short')
                : notification.title}
            </Text>
            <Text color={TextColor.Muted} variant={TextVariant.BodySM}>
              {formatDate(notification.timestamp).toString()}
            </Text>
          </View>
          <View style={styles.rowInsider}>
            <Text style={styles.textBox} variant={TextVariant.BodyMD}>
              {notification.data?.transaction
                ? notification.data?.transaction?.asset?.name
                : notification.message}
            </Text>
            <Text variant={TextVariant.BodyMD}>
              {notification.data?.transaction?.value}
            </Text>
          </View>
        </View>
      </View>
      {notification?.cta && (
        <Button
          variant={ButtonVariants.Secondary}
          label={notification.cta.label}
          onPress={notification.cta.onPress}
          style={styles.button}
          endIconName={IconName.Arrow2Right}
        />
      )}
    </TouchableOpacity>
  );
};

export default Row;
