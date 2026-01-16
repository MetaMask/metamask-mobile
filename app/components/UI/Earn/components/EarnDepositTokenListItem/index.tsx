import React from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { useSelector } from 'react-redux';
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
import { selectNetworkName } from '../../../../../selectors/networkInfos';
import { useStyles } from '../../../../hooks/useStyles';
import { EarnTokenListItemProps } from './EarnDepositTokenListItem.types';
import { getNetworkImageSource } from '../../../../../util/networks';
import { EarnNetworkAvatar } from '../EarnNetworkAvatar';
import styleSheet from './EarnDepositTokenListItem.styles';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';

const EarnDepositTokenListItem = ({
  token,
  primaryText,
  secondaryText,
  onPress,
}: EarnTokenListItemProps) => {
  const { styles } = useStyles(styleSheet, {});

  const networkName = useSelector(selectNetworkName);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(token)}
      testID="earn-token-list-item"
    >
      <View style={styles.left}>
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              name={networkName}
              imageSource={getNetworkImageSource({
                chainId: token.chainId ?? '',
              })}
              isScaled={false}
              size={AvatarSize.Xs}
            />
          }
        >
          <EarnNetworkAvatar token={token} />
        </BadgeWrapper>
        <View style={styles.assetName}>
          <Text
            numberOfLines={1}
            variant={TextVariant.BodyMDMedium}
            ellipsizeMode="tail"
          >
            {token.name}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text
          variant={primaryText?.variant ?? TextVariant.BodyMDMedium}
          color={primaryText?.color}
        >
          {primaryText.value}
        </Text>
        {secondaryText?.value && (
          <Text
            variant={secondaryText?.variant ?? TextVariant.BodySMMedium}
            color={secondaryText?.color ?? TextColor.Alternative}
          >
            {secondaryText.value}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default EarnDepositTokenListItem;
