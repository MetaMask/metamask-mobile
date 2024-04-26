import React from 'react';
import { View, Image } from 'react-native';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { BOTTOM_BADGEWRAPPER_BADGEPOSITION } from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import { TRIGGER_TYPES } from '../../../../util/notifications';
import { CommonSelectorsIDs } from '../../../../../e2e/selectors/Common.selectors';
import NetworkMainAssetLogo from '../../NetworkMainAssetLogo';
import { IconName } from '../../../../component-library/components/Icons/Icon';

import RemoteImage from '../../../../components/Base/RemoteImage';
/* eslint-disable import/no-commonjs */
const metamask_fox = require('../../../../images/fox.png'); // eslint-disable-line
interface NotificationIconProps {
  notificationType: TRIGGER_TYPES;
  styles: any;
  badgeIcon?: IconName;
  imageUrl?: string;
}
function NotificationIcon({
  notificationType,
  styles,
  badgeIcon,
  imageUrl,
}: NotificationIconProps) {
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

  if (notificationType === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT) {
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
  }

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

export default NotificationIcon;
