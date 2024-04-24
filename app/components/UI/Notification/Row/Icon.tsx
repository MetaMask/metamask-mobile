import React, { useState, useEffect } from 'react';
import { View, Image } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { isNumber } from 'lodash';
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
  const [svgSource, setSvgSource] = useState<string>('');

  useEffect(() => {
    if (imageUrl && !isNumber(imageUrl)) {
      if (imageUrl?.match('.svg')) setSvgSource(imageUrl);
    }
  }, [imageUrl]);

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

  const customStyles = () => {
    if (notificationType.includes('erc721' || 'erc1155')) {
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
      ) : svgSource ? (
        <View style={styles.assetLogo}>
          <SvgUri
            uri={
              'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg'
            }
            width={'100%'}
            height={'100%'}
          />
        </View>
      ) : (
        <RemoteImage
          source={{ uri: imageUrl }}
          style={customStyles().style}
          placeholderStyle={customStyles().placeholderStyle}
        />
      )}
    </BadgeWrapper>
  );
}

export default NotificationIcon;
