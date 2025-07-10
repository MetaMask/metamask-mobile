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
import { FlashListAssetKey } from '../../../Tokens/TokenList';
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
import Tag from '../../../../../component-library/components/Tags/Tag';
import { AllowanceState } from '../../types';
import useAssetBalance from '../../hooks/useAssetBalance';
import { mapAllowanceStateToLabel } from '../../util/mapAllowanceStateToLabel';

interface CardAssetItemProps {
  assetKey: FlashListAssetKey & {
    tag?: AllowanceState;
  };
  privacyMode: boolean;
  disabled?: boolean;
  onPress?: (asset: TokenI) => void;
}

const CardAssetItem: React.FC<CardAssetItemProps> = ({
  assetKey,
  onPress,
  disabled = false,
  privacyMode,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const chainId = assetKey.chainId as Hex;

  const { asset, mainBalance, secondaryBalance } = useAssetBalance(assetKey);

  const networkBadgeSource = useCallback(
    (currentChainId: Hex) => {
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
    if (!asset) {
      return null;
    }
    if (asset.isNative) {
      const isCustomNetwork = CustomNetworkNativeImgMapping[chainId];

      if (isCustomNetwork) {
        return (
          <AvatarToken
            name={asset.symbol}
            imageSource={CustomNetworkNativeImgMapping[chainId]}
            size={AvatarSize.Md}
          />
        );
      }

      return (
        <NetworkAssetLogo
          chainId={chainId as Hex}
          style={styles.ethLogo}
          ticker={asset.ticker || ''}
          big={false}
          biggest={false}
          testID={asset.name}
        />
      );
    }

    return (
      <AvatarToken
        name={asset.symbol}
        imageSource={{ uri: asset.image }}
        size={AvatarSize.Md}
      />
    );
  }, [asset, styles.ethLogo, chainId]);

  if (!chainId || !asset) {
    return null;
  }

  return (
    <AssetElement
      onPress={onPress}
      disabled={disabled}
      asset={asset}
      balance={mainBalance}
      secondaryBalance={secondaryBalance}
      privacyMode={privacyMode}
    >
      <BadgeWrapper
        style={styles.badge}
        badgePosition={BadgePosition.TopRight}
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
        <View style={styles.percentageChange}>
          {assetKey.tag && (
            <Tag label={mapAllowanceStateToLabel(assetKey.tag)} />
          )}
        </View>
      </View>
    </AssetElement>
  );
};

export default CardAssetItem;
