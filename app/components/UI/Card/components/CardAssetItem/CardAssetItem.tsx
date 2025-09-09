import AssetElement from '../../../AssetElement';
import React, { useCallback } from 'react';
import { TokenI } from '../../../Tokens/types';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './CardAssetItem.styles';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { Hex, isCaipChainId } from '@metamask/utils';
import {
  getDefaultNetworkByChainId,
  getTestNetImageByChainId,
  isTestNet,
} from '../../../../../util/networks';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  CustomNetworkImgMapping,
  getNonEvmNetworkImageSourceByChainId,
  PopularList,
  UnpopularNetworkList,
} from '../../../../../util/networks/customNetworks';
import { CustomNetworkNativeImgMapping } from '../../../Tokens/TokenList/TokenListItem/CustomNetworkNativeImgMapping';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { View } from 'react-native';
import { CardTokenAllowance } from '../../types';
import { useAssetBalance } from '../../hooks/useAssetBalance';

interface CardAssetItemProps {
  assetKey: CardTokenAllowance;
  privacyMode: boolean;
  onPress?: (asset: TokenI) => void;
}

const CardAssetItem: React.FC<CardAssetItemProps> = ({
  assetKey,
  onPress,
  privacyMode,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const chainId = assetKey.chainId as Hex;

  const { asset, mainBalance, secondaryBalance } = useAssetBalance(assetKey);

  const networkBadgeSource = useCallback(
    (currentChainId: Hex) => {
      if (!currentChainId) {
        return null;
      }

      if (isTestNet(currentChainId))
        return getTestNetImageByChainId(currentChainId);
      const defaultNetwork = getDefaultNetworkByChainId(currentChainId) as
        | {
            imageSource: string;
          }
        | undefined;

      if (defaultNetwork) {
        return defaultNetwork.imageSource;
      }

      const unpopularNetwork = UnpopularNetworkList.find(
        (networkConfig) => networkConfig.chainId === currentChainId,
      );

      const customNetworkImg = CustomNetworkImgMapping[currentChainId];

      const popularNetwork = PopularList.find(
        (networkConfig) => networkConfig.chainId === currentChainId,
      );

      const network = unpopularNetwork || popularNetwork;
      if (network) {
        return network.rpcPrefs.imageSource;
      }
      if (isCaipChainId(chainId)) {
        return getNonEvmNetworkImageSourceByChainId(chainId);
      }
      if (customNetworkImg) {
        return customNetworkImg;
      }
    },
    [chainId],
  );

  const renderNetworkAvatar = useCallback(() => {
    if (asset?.isNative) {
      const isCustomNetwork = CustomNetworkNativeImgMapping[chainId];

      if (isCustomNetwork) {
        return (
          <AvatarToken
            name={asset.symbol}
            imageSource={CustomNetworkNativeImgMapping[chainId]}
            size={AvatarSize.Xl}
          />
        );
      }

      return (
        <NetworkAssetLogo
          chainId={chainId}
          style={styles.ethLogo}
          ticker={asset.ticker || ''}
          testID={asset.name}
          big
          biggest={false}
        />
      );
    }

    return (
      <AvatarToken
        name={asset?.symbol}
        imageSource={asset?.image ? { uri: asset.image } : undefined}
        size={AvatarSize.Xl}
      />
    );
  }, [asset, styles.ethLogo, chainId]);

  // Return null if chainId is missing
  if (!chainId || !asset) {
    return null;
  }

  return (
    <AssetElement
      onPress={onPress}
      disabled
      asset={asset}
      balance={mainBalance}
      secondaryBalance={secondaryBalance}
      privacyMode={privacyMode}
    >
      <BadgeWrapper
        style={styles.badge}
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={networkBadgeSource(chainId as Hex)}
          />
        }
      >
        {renderNetworkAvatar()}
      </BadgeWrapper>
      <View style={styles.balances}>
        <View style={styles.assetName}>
          <Text variant={TextVariant.BodyMD} numberOfLines={1}>
            {asset.name || asset.symbol}
          </Text>
        </View>
      </View>
    </AssetElement>
  );
};

export default CardAssetItem;
