import React, { useCallback, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
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
  iconSize?: number;
  selectedTimeOption?: TimeOption;
}
const TrendingTokenRowItem = ({
  token,
  iconSize = 44,
  selectedTimeOption = TimeOption.TwentyFourHours,
}: TrendingTokenRowItemProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const chainId = token.assetId.split('/')[0] as CaipChainId;
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );
  const [isNetworkModalVisible, setIsNetworkModalVisible] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

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
  const isNeutralChange = hasPercentageChange && pricePercentChange === 0;

  const handlePress = useCallback(() => {
    // Parse assetId to extract chainId and address
    // Format: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const [caipChainId, assetIdentifier] = token.assetId.split('/');
    // check if caipChainId is evm or non-evm
    const isEvmChain = caipChainId.startsWith('eip155:');
    const address = assetIdentifier?.split(':')[1] as Hex | undefined;

    if (!address || !isCaipChainId(caipChainId)) {
      return;
    }

    // Convert CAIP chainId to Hex format for EVM networks
    const { namespace, reference } = parseCaipChainId(caipChainId);
    const hexChainId =
      namespace === 'eip155'
        ? (`0x${Number(reference).toString(16)}` as Hex)
        : (caipChainId as Hex);

    // Check if network is already added by user
    const isNetworkAdded = Boolean(
      networkConfigurations[caipChainId as CaipChainId],
    );

    // If network is not added, show modal to add it
    if (!isNetworkAdded) {
      const popularNetwork = PopularList.find(
        (network) => network.chainId === hexChainId,
      );

      if (popularNetwork) {
        setSelectedNetwork(popularNetwork);
        setIsNetworkModalVisible(true);
        return;
      }
    }

    // Construct image URL from assetId
    const imageUrl = getTrendingTokenImageUrl(token.assetId);

    // Get 24-hour price change percentage (h24 corresponds to 1 day)
    const priceChange24h = token.priceChangePct?.h24
      ? parseFloat(token.priceChangePct.h24)
      : undefined;

    // Navigate to Asset page with token data
    navigation.navigate('Asset', {
      chainId: hexChainId,
      address: isEvmChain ? address : token.assetId,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      image: imageUrl,
      pricePercentChange1d: priceChange24h,
    });
  }, [token, navigation, networkConfigurations]);

  const closeNetworkModal = useCallback(() => {
    setIsNetworkModalVisible(false);
    setSelectedNetwork(null);
  }, []);

  const handleNetworkModalAccept = useCallback(() => {
    // Network has been added by NetworkModals' closeModal function
    // Now navigate to Asset page
    const [caipChainId, assetIdentifier] = token.assetId.split('/');
    const isEvmChain = caipChainId.startsWith('eip155:');
    const address = assetIdentifier?.split(':')[1] as Hex | undefined;

    if (address && isCaipChainId(caipChainId)) {
      const { namespace, reference } = parseCaipChainId(caipChainId);
      const hexChainId =
        namespace === 'eip155'
          ? (`0x${Number(reference).toString(16)}` as Hex)
          : (caipChainId as Hex);

      navigation.navigate('Asset', {
        chainId: hexChainId,
        address: isEvmChain ? address : token.assetId,
        symbol: token.symbol,
        name: token.name,
        image: getTrendingTokenImageUrl(token.assetId),
        decimals: token.decimals,
        pricePercentChange1d: token.priceChangePct?.h24
          ? parseFloat(token.priceChangePct.h24)
          : undefined,
      });
    }

    closeNetworkModal();
  }, [token, navigation, closeNetworkModal]);

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
              color={
                isNeutralChange
                  ? TextColor.Default
                  : isPositiveChange
                    ? TextColor.Success
                    : TextColor.Error
              }
            >
              {isNeutralChange ? '' : isPositiveChange ? '+' : '-'}
              {Math.abs(pricePercentChange).toFixed(2)}%
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </>
  );
};

export default TrendingTokenRowItem;
