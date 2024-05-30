import React from 'react';
import { ImageSourcePropType } from 'react-native';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { BOTTOM_BADGEWRAPPER_BADGEPOSITION } from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import { TRIGGER_TYPES } from '../../../../util/notifications';
import NetworkMainAssetLogo from '../../../UI/NetworkMainAssetLogo';

import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';

interface NotificationBadgeProps {
  notificationType: TRIGGER_TYPES;
  styles: any;
  badgeImageSource?: ImageSourcePropType;
  imageUrl?: string;
}
function NotificationBadge({
  notificationType,
  styles,
  badgeImageSource,
  imageUrl,
}: NotificationBadgeProps) {
  const customStyles = () => {
    if (notificationType.toLowerCase().includes('erc721' || 'erc1155')) {
      return {
        style: styles.nftLogo,
        placeholderStyle: styles.nftPlaceholder,
      };
    }
    return {
      style: styles.assetLogo,
      placeholderStyle: styles.assetPlaceholder,
    };
  };

  return (
    <BadgeWrapper
      badgePosition={BOTTOM_BADGEWRAPPER_BADGEPOSITION}
      badgeElement={
        <Badge variant={BadgeVariant.Network} imageSource={badgeImageSource} />
      }
      style={styles.badgeWrapper}
    >
      {notificationType.toLowerCase().includes('eth') ? (
        <NetworkMainAssetLogo style={styles.ethLogo} />
      ) : (
        <AvatarToken
          variant={AvatarVariant.Token}
          imageSource={{ uri: imageUrl }}
          size={AvatarSize.Md}
          style={customStyles().style}
          placeholderStyle={customStyles().placeholderStyle}
        />
      )}
    </BadgeWrapper>
  );
}

export default NotificationBadge;
