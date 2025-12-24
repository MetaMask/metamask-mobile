import React, { useCallback, useMemo, useState } from 'react';
import { ImageSourcePropType, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './TrendingTokenRowItem.styles';
import { TrendingAsset } from '@metamask/assets-controllers';
import TrendingTokenLogo from '../TrendingTokenLogo';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import {
  parseCaipChainId,
  CaipChainId,
  Hex,
  isCaipChainId,
} from '@metamask/utils';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../../constants/bridge';
import {
  getDefaultNetworkByChainId,
  getTestNetImageByChainId,
  isTestNet,
} from '../../../../../util/networks';
import {
  CustomNetworkImgMapping,
  PopularList,
  UnpopularNetworkList,
  getNonEvmNetworkImageSourceByChainId,
} from '../../../../../util/networks/customNetworks';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { formatMarketStats } from './utils';
import { formatPrice } from '../../../Predict/utils/format';
import { TimeOption } from '../TrendingTokensBottomSheet';
import NetworkModals from '../../../NetworkModal';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import type { Network } from '../../../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import { getTrendingTokenImageUrl } from '../../utils/getTrendingTokenImageUrl';

/**
 * Extracts CAIP chain ID from asset ID
 */
const getCaipChainIdFromAssetId = (assetId: string): CaipChainId =>
  assetId.split('/')[0] as CaipChainId;

/**
 * Converts CAIP chain ID to hex chain ID
 */
const caipChainIdToHex = (caipChainId: CaipChainId): Hex => {
  const { namespace, reference } = parseCaipChainId(caipChainId);
  return namespace === 'eip155'
    ? (`0x${Number(reference).toString(16)}` as Hex)
    : (caipChainId as Hex);
};

/**
 * Gets network badge image source for a given CAIP chain ID
 */
const getNetworkBadgeSource = (
  caipChainId: CaipChainId,
): ImageSourcePropType | undefined => {
  const hexChainId = caipChainIdToHex(caipChainId);

  if (isTestNet(hexChainId)) {
    return getTestNetImageByChainId(hexChainId);
  }

  const defaultNetwork = getDefaultNetworkByChainId(hexChainId) as
    | { imageSource: ImageSourcePropType }
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
  if (isCaipChainId(caipChainId)) {
    return getNonEvmNetworkImageSourceByChainId(caipChainId);
  }
  if (customNetworkImg) {
    return customNetworkImg as ImageSourcePropType;
  }

  return undefined;
};

/**
 * Gets the text color for price percentage change
 */
const getPriceChangeColor = (priceChange: number): TextColor => {
  if (priceChange === 0) return TextColor.Default;
  return priceChange > 0 ? TextColor.Success : TextColor.Error;
};

/**
 * Maps TimeOption to the corresponding priceChangePct field key
 */
export const getPriceChangeFieldKey = (
  timeOption: TimeOption,
): 'h24' | 'h6' | 'h1' | 'm5' => {
  switch (timeOption) {
    case TimeOption.TwentyFourHours:
      return 'h24';
    case TimeOption.SixHours:
      return 'h6';
    case TimeOption.OneHour:
      return 'h1';
    case TimeOption.FiveMinutes:
      return 'm5';
    default:
      return 'h24';
  }
};

interface TrendingTokenRowItemProps {
  token: TrendingAsset;
  selectedTimeOption?: TimeOption;
}

/**
 * Converts a TrendingAsset to Asset navigation params
 */
const getAssetNavigationParams = (token: TrendingAsset) => {
  const [caipChainId, assetIdentifier] = token.assetId.split('/');
  if (!isCaipChainId(caipChainId)) return null;

  const isEvmChain = caipChainId.startsWith('eip155:');
  const isNativeToken = assetIdentifier?.startsWith('slip44:');
  const address = (
    isNativeToken ? NATIVE_SWAPS_TOKEN_ADDRESS : assetIdentifier?.split(':')[1]
  ) as Hex | undefined;

  const hexChainId = caipChainIdToHex(caipChainId);

  return {
    chainId: hexChainId,
    address: isEvmChain ? address : token.assetId,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    image: getTrendingTokenImageUrl(token.assetId),
    pricePercentChange1d: token.priceChangePct?.h24
      ? parseFloat(token.priceChangePct.h24)
      : undefined,
    isNative: isNativeToken,
    isETH: isNativeToken && hexChainId === '0x1',
  };
};

const TrendingTokenRowItem = ({
  token,
  selectedTimeOption = TimeOption.TwentyFourHours,
}: TrendingTokenRowItemProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );
  const [isNetworkModalVisible, setIsNetworkModalVisible] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

  // Memoize derived values
  const caipChainId = useMemo(
    () => getCaipChainIdFromAssetId(token.assetId),
    [token.assetId],
  );

  const assetParams = useMemo(() => getAssetNavigationParams(token), [token]);

  const networkBadgeImageSource = useMemo(
    () => getNetworkBadgeSource(caipChainId),
    [caipChainId],
  );

  // Parse price change percentage from API (comes as string like "-3.44" or "+0.456")
  // Use the correct field based on selected time option
  const priceChangeFieldKey = getPriceChangeFieldKey(selectedTimeOption);
  const pricePercentChangeString = token.priceChangePct?.[priceChangeFieldKey];
  const pricePercentChange = pricePercentChangeString
    ? parseFloat(pricePercentChangeString)
    : undefined;

  // Determine the color for percentage change
  // Handle 0 as neutral (not positive or negative)
  const hasPercentageChange =
    pricePercentChange !== undefined && !isNaN(pricePercentChange);
  const isPositiveChange = hasPercentageChange && pricePercentChange > 0;

  const handlePress = useCallback(() => {
    if (!assetParams) return;

    const isNetworkAdded = Boolean(networkConfigurations[caipChainId]);

    if (!isNetworkAdded) {
      const popularNetwork = PopularList.find(
        (network) => network.chainId === assetParams.chainId,
      );

      if (popularNetwork) {
        setSelectedNetwork(popularNetwork);
        setIsNetworkModalVisible(true);
        return;
      }
    }

    navigation.navigate('Asset', assetParams);
  }, [assetParams, caipChainId, navigation, networkConfigurations]);

  const closeNetworkModal = useCallback(() => {
    setIsNetworkModalVisible(false);
    setSelectedNetwork(null);
  }, []);

  const handleNetworkModalAccept = useCallback(() => {
    if (assetParams) {
      navigation.navigate('Asset', assetParams);
    }
    closeNetworkModal();
  }, [assetParams, navigation, closeNetworkModal]);

  return (
    <>
      {isNetworkModalVisible && selectedNetwork && (
        <NetworkModals
          showPopularNetworkModal
          isVisible={isNetworkModalVisible}
          onClose={closeNetworkModal}
          networkConfiguration={{
            chainId: selectedNetwork.chainId,
            nickname: selectedNetwork.nickname,
            ticker: selectedNetwork.ticker,
            rpcUrl: selectedNetwork.rpcUrl,
            failoverRpcUrls: selectedNetwork.failoverRpcUrls,
            formattedRpcUrl: selectedNetwork.rpcUrl,
            rpcPrefs: {
              blockExplorerUrl: selectedNetwork.rpcPrefs.blockExplorerUrl,
              imageUrl: selectedNetwork.rpcPrefs.imageUrl,
            },
          }}
          allowNetworkSwitch={false}
          skipEnableNetwork
          onAccept={handleNetworkModalAccept}
        />
      )}
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        testID={`trending-token-row-item-${token.assetId}`}
      >
        <View>
          <BadgeWrapper
            style={styles.badge}
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              <Badge
                size={AvatarSize.Xs}
                variant={BadgeVariant.Network}
                imageSource={networkBadgeImageSource}
                isScaled={false}
              />
            }
          >
            <TrendingTokenLogo
              assetId={token.assetId}
              symbol={token.symbol}
              size={40}
              recyclingKey={token.assetId}
            />
          </BadgeWrapper>
        </View>
        <View style={styles.leftContainer}>
          <View style={styles.tokenHeaderRow}>
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Default}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {token.name}
            </Text>
          </View>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {formatMarketStats(
              token.marketCap ?? 0,
              token.aggregatedUsdVolume ?? 0,
            )}
          </Text>
        </View>
        <View style={styles.rightContainer}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {formatPrice(token.price, {
              minimumDecimals: 2,
              maximumDecimals: 4,
            })}
          </Text>
          {hasPercentageChange && (
            <Text
              variant={TextVariant.BodySM}
              color={getPriceChangeColor(pricePercentChange)}
            >
              {pricePercentChange === 0 ? '' : isPositiveChange ? '+' : '-'}
              {Math.abs(pricePercentChange).toFixed(2)}%
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </>
  );
};

export default TrendingTokenRowItem;
