import React from 'react';
import { View } from 'react-native';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import { BOTTOM_BADGEWRAPPER_BADGEPOSITION } from '../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ModalFieldAsset } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import RemoteImage from '../../../../Base/RemoteImage';
import useStyles from '../useStyles';

type AssetFieldProps = ModalFieldAsset;

function AssetField(props: AssetFieldProps) {
  const { styles } = useStyles();

  return (
    <View style={styles.row}>
      {/* Token Logo + Network Badge */}
      <BadgeWrapper
        testID={'badge-wrapper'}
        badgePosition={BOTTOM_BADGEWRAPPER_BADGEPOSITION}
        badgeElement={
          <Badge
            testID={'badge-element'}
            variant={BadgeVariant.Network}
            imageSource={{ uri: props.tokenNetworkUrl }}
          />
        }
        style={styles.badgeWrapper}
      >
        <RemoteImage
          source={{ uri: props.tokenIconUrl }}
          style={styles.circleLogo}
          placeholderStyle={styles.circleLogoPlaceholder}
        />
      </BadgeWrapper>

      {/* Token Label + Description */}
      <View style={styles.boxLeft}>
        <Text variant={TextVariant.BodyLGMedium}>{props.label}</Text>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {props.description}
        </Text>
      </View>

      {/* Token Amount + USD Amount */}
      <View style={styles.rightSection}>
        <Text variant={TextVariant.BodyLGMedium}>{props.amount}</Text>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {props.usdAmount}
        </Text>
      </View>
    </View>
  );
}

export default AssetField;
