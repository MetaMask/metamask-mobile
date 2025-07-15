import AssetElement from '../../../AssetElement';
import React, { useCallback, useMemo } from 'react';
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
import { mapAllowanceStateToLabel } from '../../util/mapAllowanceStateToLabel';
import { useTheme } from '../../../../../util/theme';

interface CardAssetItemProps {
  assetKey: CardTokenAllowance;
  privacyMode: boolean;
  shouldShowAllowance?: boolean;
  disabled?: boolean;
  onPress?: (asset: TokenI) => void;
}

const CardAssetItem: React.FC<CardAssetItemProps> = ({
  assetKey,
  onPress,
  disabled = false,
  shouldShowAllowance = true,
  privacyMode,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const chainId = assetKey.chainId as Hex;
  const theme = useTheme();

  const { asset, mainBalance, secondaryBalance } = useAssetBalance(assetKey);

  // Fallback asset mapping
  // If asset is not found, we create a default TokenI object with minimal properties
  // This is to ensure that the component can render without crashing
  // and to provide a consistent structure for the asset data.
  const mappedAsset = useMemo(
    () =>
      asset ??
      ({
        address: assetKey.address,
        aggregators: [],
        decimals: assetKey.decimals,
        image: '',
        name: assetKey.name,
        symbol: assetKey.symbol,
        balance: '0',
        balanceFiat: '0',
        logo: '',
        isETH: false,
      } as TokenI),
    [asset, assetKey],
  );
  const mappedMainBalance = useMemo(() => mainBalance ?? '0', [mainBalance]);
  const mappedSecondaryBalance = useMemo(
    () => secondaryBalance ?? '0',
    [secondaryBalance],
  );

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
    if (mappedAsset.isNative) {
      const isCustomNetwork = CustomNetworkNativeImgMapping[chainId];

      if (isCustomNetwork) {
        return (
          <AvatarToken
            name={mappedAsset.symbol}
            imageSource={CustomNetworkNativeImgMapping[chainId]}
            size={AvatarSize.Xl}
          />
        );
      }

      return (
        <NetworkAssetLogo
          chainId={chainId as Hex}
          style={styles.ethLogo}
          ticker={mappedAsset.ticker || ''}
          big
          biggest
          testID={mappedAsset.name}
        />
      );
    }

    return (
      <AvatarToken
        name={mappedAsset.symbol}
        imageSource={mappedAsset.image ? { uri: mappedAsset.image } : undefined}
        size={AvatarSize.Xl}
      />
    );
  }, [mappedAsset, styles.ethLogo, chainId]);

  // Return null if chainId is missing
  if (!chainId) {
    return null;
  }

  return (
    <AssetElement
      onPress={onPress}
      disabled={disabled}
      asset={mappedAsset}
      balance={mappedMainBalance}
      secondaryBalance={mappedSecondaryBalance}
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
            {mappedAsset.name || mappedAsset.symbol}
          </Text>
        </View>
        <View style={styles.allowanceStatusContainer}>
          {assetKey.allowanceState && shouldShowAllowance && (
            <Text
              variant={TextVariant.BodyMD}
              color={theme.colors.text.alternative}
              numberOfLines={1}
            >
              {mapAllowanceStateToLabel(assetKey.allowanceState)}
            </Text>
          )}
        </View>
      </View>
    </AssetElement>
  );
};

export default CardAssetItem;
