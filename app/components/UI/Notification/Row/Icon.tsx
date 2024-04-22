import React from 'react';
import { View, Image } from 'react-native';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { BOTTOM_BADGEWRAPPER_BADGEPOSITION } from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import { TRIGGER_TYPES } from '../../../../util/notifications';
import { CommonSelectorsIDs } from '../../../../../e2e/selectors/Common.selectors';
import NetworkMainAssetLogo from '../../NetworkMainAssetLogo';
import { IconName } from '../../../../component-library/components/Icons/Icon';

const metamask_fox = require('../../../../images/fox.png'); // eslint-disable-line

interface NotificationIconProps {
  notificationType: TRIGGER_TYPES;
  styles: any;
  badgeIcon: IconName;

  imageUri?: string;
}
function NotificationIcon({
  notificationType,
  styles,
  badgeIcon,

  imageUri,
}: NotificationIconProps) {
  if (notificationType === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT)
    return (
      <View style={styles.foxWrapper}>
        <Image
          source={metamask_fox}
          style={styles.fox}
          resizeMethod={'auto'}
          testID={CommonSelectorsIDs.FOX_ICON}
        />
      </View>
    );

  return (
    <BadgeWrapper
      badgePosition={BOTTOM_BADGEWRAPPER_BADGEPOSITION}
      badgeElement={
        <Badge variant={BadgeVariant.NotificationsKinds} iconName={badgeIcon} />
      }
      style={styles.badgeWrapper}
    >
      {notificationType.toLowerCase().includes('eth') ? (
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
  );
}

export default NotificationIcon;
