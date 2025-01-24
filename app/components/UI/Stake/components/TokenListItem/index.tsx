import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { selectNetworkName } from '../../../../../selectors/networkInfos';
import { useStyles } from '../../../../hooks/useStyles';
import { TokenListItemProps } from './TokenListItem.types';
import { getNetworkImageSource } from '../../../../../util/networks';
import styleSheet from './TokenListItem.styles';

const TokenListItem = ({
  token,
  primaryText,
  secondaryText,
  onPress,
}: TokenListItemProps) => {
  const { styles } = useStyles(styleSheet, {});

  const networkName = useSelector(selectNetworkName);

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(token)}>
      <View style={styles.left}>
        <BadgeWrapper
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              name={networkName}
              // @ts-expect-error The utils/network file is still JS and this function expects a networkType, and should be optional
              imageSource={getNetworkImageSource({ chainId: token.chainId })}
            />
          }
        >
          <AvatarToken
            name={token.symbol}
            imageSource={{ uri: token.image }}
            size={AvatarSize.Md}
          />
        </BadgeWrapper>
        <Text variant={TextVariant.BodyMDMedium}>{token.name}</Text>
      </View>
      <View style={styles.right}>
        {primaryText.value && (
          <Text
            variant={primaryText?.variant ?? TextVariant.BodyMDMedium}
            color={primaryText?.color}
          >
            {primaryText.value}
          </Text>
        )}
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

export default TokenListItem;
