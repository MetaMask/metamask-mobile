import React from 'react';
import { ImageSourcePropType } from 'react-native';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { BOTTOM_BADGEWRAPPER_BADGEPOSITION } from '../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import { TRIGGER_TYPES } from '../../../../../util/notifications';
import NetworkMainAssetLogo from '../../../../UI/NetworkMainAssetLogo';

import {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';

interface NotificationBadgeProps {
  notificationType: TRIGGER_TYPES;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
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
      testID={'badge-wrapper'}
      badgePosition={BOTTOM_BADGEWRAPPER_BADGEPOSITION}
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
