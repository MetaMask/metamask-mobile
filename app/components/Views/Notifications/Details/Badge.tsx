import React from 'react';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { BOTTOM_BADGEWRAPPER_BADGEPOSITION } from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import { TRIGGER_TYPES } from '../../../../util/notifications';
import NetworkMainAssetLogo from '../../../UI/NetworkMainAssetLogo';
import { IconName } from '../../../../component-library/components/Icons/Icon';

import RemoteImage from '../../../Base/RemoteImage';

interface NotificationBadgeProps {
  notificationType: TRIGGER_TYPES;
  styles: any;
  badgeIcon?: IconName;
  imageUrl?: string;
}
function NotificationBadge({
  notificationType,
  styles,
  badgeIcon,
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
        <Badge variant={BadgeVariant.NotificationsKinds} iconName={badgeIcon} />
      }
      style={styles.badgeWrapper}
    >
      {notificationType.toLowerCase().includes('eth') ? (
        <NetworkMainAssetLogo style={styles.ethLogo} />
      ) : (
        <RemoteImage
          source={{
            uri:
              imageUrl ||
              'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg',
          }}
          style={customStyles().style}
          placeholderStyle={customStyles().placeholderStyle}
        />
      )}
    </BadgeWrapper>
  );
}

export default NotificationBadge;
