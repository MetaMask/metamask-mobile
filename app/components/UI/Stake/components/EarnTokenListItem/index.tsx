import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
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
import { EarnTokenListItemProps } from './EarnTokenListItem.types';
import { getNetworkImageSource } from '../../../../../util/networks';
import styleSheet from './EarnTokenListItem.styles';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import { TokenI } from '../../../Tokens/types';

interface EarnNetworkAvatarProps {
  token: TokenI;
}

const EarnNetworkAvatar = ({ token }: EarnNetworkAvatarProps) => {
  const { styles } = useStyles(styleSheet, {});

  if (token.isNative) {
    return (
      <NetworkAssetLogo
        chainId={token.chainId ?? ''}
        style={styles.networkAvatar}
        ticker={token.ticker ?? ''}
        big={false}
        biggest={false}
        testID={`earn-token-list-item-${token.symbol}-${token.chainId}`}
      />
    );
  }

  return (
    <AvatarToken
      name={token.symbol}
      imageSource={{ uri: token.image }}
      size={AvatarSize.Md}
      style={styles.networkAvatar}
    />
  );
};

const EarnTokenListItem = ({
  token,
  primaryText,
  secondaryText,
  onPress,
}: EarnTokenListItemProps) => {
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
              // @ts-expect-error The utils/network file is still JS and this function expects a networkType that should be optional
              imageSource={getNetworkImageSource({ chainId: token.chainId })}
            />
          }
        >
          <EarnNetworkAvatar token={token} />
        </BadgeWrapper>
        <Text variant={TextVariant.BodyMDMedium}>{token.name}</Text>
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

export default EarnTokenListItem;
