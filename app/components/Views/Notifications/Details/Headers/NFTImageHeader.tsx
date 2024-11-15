import React, { useMemo } from 'react';
import { View } from 'react-native';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import { DEFAULT_BADGEWRAPPER_BADGEPOSITION } from '../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import { ModalHeaderNFTImage } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import RemoteImage from '../../../../Base/RemoteImage';
import useStyles from '../useStyles';

type NFTImageHeaderProps = ModalHeaderNFTImage;

export default function NFTImageHeader(props: NFTImageHeaderProps) {
  const { styles } = useStyles();

  const badgeSource = useMemo(() => {
    const networkUrl = props.networkBadgeUrl;
    if (typeof networkUrl === 'string') {
      return { uri: networkUrl };
    }
    return networkUrl;
  }, [props.networkBadgeUrl]);

  return (
    <View style={styles.headerImageContainer}>
      {/* Collection Icon + Network Badge */}
      <BadgeWrapper
        badgePosition={DEFAULT_BADGEWRAPPER_BADGEPOSITION}
        badgeElement={
          <Badge
            testID={'badge-element'}
            variant={BadgeVariant.Network}
            imageSource={badgeSource}
            style={styles.customBadgePosition}
          />
        }
        style={styles.badgeWrapper}
      >
        <RemoteImage
          source={{ uri: props.nftImageUrl }}
          style={styles.squareLogoLarge}
          placeholderStyle={styles.squareLogoLargePlaceholder}
        />
      </BadgeWrapper>
    </View>
  );
}
