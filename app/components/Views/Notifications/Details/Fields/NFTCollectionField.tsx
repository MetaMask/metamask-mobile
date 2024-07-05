import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import { DEFAULT_BADGEWRAPPER_BADGEPOSITION } from '../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
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

  return (
    <View style={styles.row}>
      {/* Collection Icon + Network Badge */}
      <BadgeWrapper
        testID={'badge-wrapper'}
        badgePosition={DEFAULT_BADGEWRAPPER_BADGEPOSITION}
        badgeElement={
          <Badge
            testID={'badge-element'}
            variant={BadgeVariant.Network}
            imageSource={{ uri: props.networkBadgeUrl }}
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
