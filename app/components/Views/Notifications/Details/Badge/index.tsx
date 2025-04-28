import React from 'react';
import { ImageSourcePropType } from 'react-native';
import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import NetworkMainAssetLogo from '../../../../UI/NetworkMainAssetLogo';

import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { NotificationDetailStyles } from '../styles';

interface NotificationBadgeProps {
  notificationType: TRIGGER_TYPES;
  styles: NotificationDetailStyles;
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
    if (
      [
        TRIGGER_TYPES.ERC1155_RECEIVED,
        TRIGGER_TYPES.ERC1155_SENT,
        TRIGGER_TYPES.ERC721_RECEIVED,
        TRIGGER_TYPES.ERC721_SENT,
      ].includes(notificationType)
    ) {
      return {
        style: styles.squareLogo,
        placeholderStyle: styles.squareLogoPlaceholder,
      };
    }
    return {
      style: styles.circleLogo,
      placeholderStyle: styles.circleLogoPlaceholder,
    };
  };

  return (
    <BadgeWrapper
      testID={'badge-wrapper'}
      badgePosition={BadgePosition.BottomRight}
      badgeElement={
        <Badge
          testID={'badge-element'}
          variant={BadgeVariant.Network}
          imageSource={badgeImageSource}
        />
      }
      style={styles.badgeWrapper}
    >
      {notificationType.toLowerCase().includes('eth') ? (
        <NetworkMainAssetLogo
          testID={'network-main-asset-badge'}
          style={styles.ethLogo}
        />
      ) : (
        <AvatarToken
          testID={'avatar-asset-badge'}
          imageSource={{ uri: imageUrl }}
          size={AvatarSize.Md}
          style={customStyles().style}
        />
      )}
    </BadgeWrapper>
  );
}

export default NotificationBadge;
