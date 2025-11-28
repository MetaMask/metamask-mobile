import AssetElement from '../../../AssetElement';
import React, { useMemo } from 'react';
import { TokenI } from '../../../Tokens/types';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './CardAssetItem.styles';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { Hex } from '@metamask/utils';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';

interface CardAssetItemProps {
  asset: TokenI | undefined;
  privacyMode: boolean;
  onPress?: (asset: TokenI) => void;
  balanceFormatted?: string;
}

const CardAssetItem: React.FC<CardAssetItemProps> = ({
  asset,
  onPress,
  privacyMode,
  balanceFormatted,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const chainId = asset?.chainId as Hex;
  const networkBadgeSource = useMemo(
    () => (chainId ? NetworkBadgeSource(chainId) : null),
    [chainId],
  );

  // Return null if chainId or asset is missing
  if (!chainId || !asset) {
    return null;
  }

  return (
    <AssetElement
      onPress={onPress}
      disabled
      asset={asset}
      balance={asset.balanceFiat}
      secondaryBalance={balanceFormatted ?? `${asset.balance} ${asset.symbol}`}
      privacyMode={privacyMode}
    >
      <BadgeWrapper
        style={styles.badge}
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          networkBadgeSource ? (
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkBadgeSource}
            />
          ) : null
        }
      >
        <AssetLogo asset={asset} />
      </BadgeWrapper>
      <View style={styles.balances}>
        <View style={styles.assetName}>
          <Text variant={TextVariant.BodyMDMedium} numberOfLines={1}>
            {asset.name || asset.symbol}
          </Text>
        </View>
      </View>
    </AssetElement>
  );
};

export default CardAssetItem;
