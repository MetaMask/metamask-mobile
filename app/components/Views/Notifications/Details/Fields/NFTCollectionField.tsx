import React, { useMemo } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ModalFieldNFTCollectionImage } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import RemoteImage from '../../../../Base/RemoteImage';
import useStyles from '../useStyles';

type NFTCollectionFieldProps = ModalFieldNFTCollectionImage;

function NFTCollectionField(props: NFTCollectionFieldProps) {
  const { styles } = useStyles();

  const badgeSource = useMemo(() => {
    const networkUrl = props.networkBadgeUrl;
    if (typeof networkUrl === 'string') {
      return { uri: networkUrl };
    }
    return networkUrl;
  }, [props.networkBadgeUrl]);

  return (
    <View style={styles.row}>
      {/* Collection Icon + Network Badge */}
      <BadgeWrapper
        testID={'badge-wrapper'}
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            testID={'badge-element'}
            variant={BadgeVariant.Network}
            imageSource={badgeSource}
          />
        }
        style={styles.badgeWrapper}
      >
        <RemoteImage
          source={{ uri: props.collectionImageUrl }}
          style={styles.squareLogo}
          placeholderStyle={styles.squareLogoPlaceholder}
        />
      </BadgeWrapper>

      {/* Collection Description */}
      <View style={styles.boxLeft}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('collectible.collection')}
        </Text>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {props.collectionName}
        </Text>
      </View>
    </View>
  );
}

export default NFTCollectionField;
