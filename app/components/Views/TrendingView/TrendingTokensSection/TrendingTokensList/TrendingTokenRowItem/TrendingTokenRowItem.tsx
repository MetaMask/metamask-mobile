import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './TrendingTokenRowItem.styles';
import { TrendingAsset } from '@metamask/assets-controllers';
import TrendingTokenLogo from '../../TrendingTokenLogo';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import {
  parseCaipChainId,
  CaipChainId,
  Hex,
  isCaipChainId,
} from '@metamask/utils';
import {
  getDefaultNetworkByChainId,
  getTestNetImageByChainId,
  isTestNet,
} from '../../../../../../util/networks';
import {
  CustomNetworkImgMapping,
  PopularList,
  UnpopularNetworkList,
  getNonEvmNetworkImageSourceByChainId,
} from '../../../../../../util/networks/customNetworks';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import { formatMarketStats } from './utils';
import { formatPrice } from '../../../../../UI/Predict/utils/format';

interface TrendingTokenRowItemProps {
  token: TrendingAsset;
  onPress: () => void;
  iconSize?: number;
}
const TrendingTokenRowItem = ({
  token,
  onPress,
  iconSize = 44,
}: TrendingTokenRowItemProps) => {
  const { styles } = useStyles(styleSheet, {});
  const chainId = token.assetId.split('/')[0] as CaipChainId;

  const networkBadgeSource = useCallback((currentChainId: CaipChainId) => {
    const { reference } = parseCaipChainId(currentChainId);
    const hexChainId = `0x${Number(reference).toString(16)}` as Hex;

    if (isTestNet(hexChainId)) {
      return getTestNetImageByChainId(hexChainId);
    }

    const defaultNetwork = getDefaultNetworkByChainId(hexChainId) as
      | {
          imageSource: string;
        }
      | undefined;

    if (defaultNetwork) {
      return defaultNetwork.imageSource;
    }

    const unpopularNetwork = UnpopularNetworkList.find(
      (networkConfig) => networkConfig.chainId === hexChainId,
    );

    const customNetworkImg = CustomNetworkImgMapping[hexChainId];

    const popularNetwork = PopularList.find(
      (networkConfig) => networkConfig.chainId === hexChainId,
    );

    const network = unpopularNetwork || popularNetwork;
    if (network) {
      return network.rpcPrefs.imageSource;
    }
    if (isCaipChainId(currentChainId)) {
      return getNonEvmNetworkImageSourceByChainId(currentChainId);
    }
    if (customNetworkImg) {
      return customNetworkImg;
    }
  }, []);

  // TODO: Get pricePercentChange1d from token or trending hook
  const pricePercentChange1d: number | undefined = 3.44; // This should come from the trending hook

  // Determine the color for percentage change
  // Handle 0 as neutral (not positive or negative)
  const hasPercentageChange =
    pricePercentChange1d !== undefined && pricePercentChange1d !== null;
  const isPositiveChange =
    hasPercentageChange && (pricePercentChange1d as number) > 0;
  const isNeutralChange =
    hasPercentageChange && (pricePercentChange1d as number) === 0;

  const handlePress = () => {
    // TODO: Implement token press logic
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      testID={`trending-token-row-item-${token.assetId}`}
    >
      <View accessibilityRole="none" accessible={false}>
        <BadgeWrapper
          style={styles.badge}
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              size={AvatarSize.Xs}
              variant={BadgeVariant.Network}
              imageSource={networkBadgeSource(chainId)}
              isScaled={false}
            />
          }
        >
          <TrendingTokenLogo
            assetId={token.assetId}
            symbol={token.symbol}
            size={iconSize}
            recyclingKey={token.assetId}
          />
        </BadgeWrapper>
      </View>
      <View accessibilityRole="none" accessible={false} style={styles.leftContainer}>
        <View accessibilityRole="none" accessible={false} style={styles.tokenHeaderRow}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {token.name}
          </Text>
          {/* TODO: Display verified icon conditionally based on API response */}
          <Icon
            name={IconName.VerifiedFilled}
            size={IconSize.Sm}
            color={TextColor.Alternative}
          />
        </View>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {formatMarketStats(token.marketCap, token.aggregatedUsdVolume)}
        </Text>
      </View>
      <View accessibilityRole="none" accessible={false} style={styles.rightContainer}>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          {formatPrice(token.price, {
            minimumDecimals: 2,
            maximumDecimals: 2,
          })}
        </Text>
        {hasPercentageChange && (
          <Text
            variant={TextVariant.BodySM}
            color={
              isNeutralChange
                ? TextColor.Default
                : isPositiveChange
                  ? TextColor.Success
                  : TextColor.Error
            }
          >
            {isNeutralChange ? '' : isPositiveChange ? '+' : '-'}
            {Math.abs(pricePercentChange1d as number)}%
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default TrendingTokenRowItem;
