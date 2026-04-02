import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Hex, type CaipChainId } from '@metamask/utils';
import type { TrendingAsset } from '@metamask/assets-controllers';
import FilterBar, {
  FilterButton,
} from '../../Trending/components/FilterBar/FilterBar';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import TrendingTokenLogo from '../../Trending/components/TrendingTokenLogo';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import { NetworkBadgeSource } from '../../AssetOverview/Balance/Balance';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useRwaTokens } from '../../Trending/hooks/useRwaTokens/useRwaTokens';
import TrendingTokenRowItem from '../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import { getTrendingTokenImageUrl } from '../../Trending/utils/getTrendingTokenImageUrl';
import { parseCAIP19AssetId } from '../../Ramp/Aggregator/utils/parseCaip19AssetId';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../Bridge/hooks/useSwapBridgeNavigation';
import type { BridgeToken } from '../../Bridge/types';
import { TrendingTokenPriceChangeBottomSheet ,
  PriceChangeOption,
  SortDirection,
} from '../../Trending/components/TrendingTokensBottomSheet/TrendingTokenPriceChangeBottomSheet';
import {
  TrendingTokenTimeBottomSheet,
  TimeOption,
} from '../../Trending/components/TrendingTokensBottomSheet/TrendingTokenTimeBottomSheet';
import { getDefaultNetworkByChainId } from '../../../../util/networks';
import { caipChainIdToHex } from '../../../../util/caip';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OndoCampaignRwaSelectorRouteParams = {
  OndoCampaignRwaSelector: {
    mode: 'swap' | 'open_position';
    srcTokenAsset?: string;
    srcTokenSymbol?: string;
    srcTokenName?: string;
    srcTokenDecimals?: number;
    srcTokenUnits?: string;
    campaignId: string;
  };
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});

const OndoCampaignRwaSelectorView: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<OndoCampaignRwaSelectorRouteParams, 'OndoCampaignRwaSelector'>
    >();
  const {
    mode,
    srcTokenAsset,
    srcTokenSymbol,
    srcTokenName,
    srcTokenDecimals,
    srcTokenUnits = '1',
  } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const [showPriceChangeSheet, setShowPriceChangeSheet] = useState(false);
  const [selectedPriceChangeOption, setSelectedPriceChangeOption] =
    useState<PriceChangeOption>(PriceChangeOption.PriceChange);
  const [priceChangeSortDirection, setPriceChangeSortDirection] =
    useState<SortDirection>(SortDirection.Descending);
  const [showTimeSheet, setShowTimeSheet] = useState(false);
  const [selectedTimeOption, setSelectedTimeOption] = useState<TimeOption>(
    TimeOption.TwentyFourHours,
  );

  // Build the source BridgeToken from route params (swap mode only)
  const srcBridgeToken = useMemo((): BridgeToken | undefined => {
    if (mode !== 'swap' || !srcTokenAsset || !srcTokenSymbol) return undefined;
    const parsed = parseCAIP19AssetId(srcTokenAsset);
    if (!parsed) return undefined;
    return {
      address: parsed.assetReference,
      symbol: srcTokenSymbol,
      name: srcTokenName ?? srcTokenSymbol,
      decimals: srcTokenDecimals ?? 18,
      chainId: `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
      image: getTrendingTokenImageUrl(srcTokenAsset),
    };
  }, [mode, srcTokenAsset, srcTokenSymbol, srcTokenName, srcTokenDecimals]);

  const srcChainHex = useMemo(() => {
    if (!srcTokenAsset) return undefined;
    const parsed = parseCAIP19AssetId(srcTokenAsset);
    if (!parsed || parsed.namespace !== 'eip155') return undefined;
    return caipChainIdToHex(
      `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
    );
  }, [srcTokenAsset]);

  // In swap mode, filter to same chain as src asset
  const chainIds = useMemo((): CaipChainId[] | undefined => {
    if (mode !== 'swap' || !srcTokenAsset) return undefined;
    const parsed = parseCAIP19AssetId(srcTokenAsset);
    if (!parsed) return undefined;
    return [`${parsed.namespace}:${parsed.chainId}` as CaipChainId];
  }, [mode, srcTokenAsset]);

  // Network name shown in the fixed network filter chip
  const networkName = useMemo(() => {
    if (!chainIds?.[0]) return strings('trending.all_networks');
    const hexId = caipChainIdToHex(chainIds[0]);
    const network = getDefaultNetworkByChainId(hexId) as
      | { name: string }
      | undefined;
    if (network?.name) return network.name;
    return chainIds[0];
  }, [chainIds]);

  // Price change filter button label
  const priceChangeButtonText = useMemo(() => {
    switch (selectedPriceChangeOption) {
      case PriceChangeOption.Volume:
        return strings('trending.volume');
      case PriceChangeOption.MarketCap:
        return strings('trending.market_cap');
      default:
        return strings('trending.price_change');
    }
  }, [selectedPriceChangeOption]);

  const { data: rwaTokens, isLoading } = useRwaTokens({
    searchQuery,
    chainIds,
    sortTrendingTokensOptions: {
      option: selectedPriceChangeOption,
      direction: priceChangeSortDirection,
    },
  });

  // Show skeleton while client-side filters are being applied.
  // useRwaTokens applies search/sort synchronously but via useStableReference,
  // which delays opts by one render cycle — so rwaTokens lags behind the inputs
  // by exactly one render. isFiltering bridges that gap.
  const [isFiltering, setIsFiltering] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setIsFiltering(true);
  }, [
    searchQuery,
    selectedPriceChangeOption,
    priceChangeSortDirection,
    selectedTimeOption,
  ]);

  useEffect(() => {
    setIsFiltering(false);
  }, [rwaTokens]);

  const showSkeleton = isLoading || isFiltering;

  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.Rewards,
    sourcePage: 'OndoCampaignRwaSelector',
    sourceToken: srcBridgeToken,
  });

  // Deduplicate by symbol so the same stock on multiple chains appears once.
  const tokens = useMemo((): TrendingAsset[] => {
    const seen = new Set<string>();
    return rwaTokens.filter((token) => {
      if (srcTokenSymbol && token.symbol === srcTokenSymbol) return false;
      if (seen.has(token.symbol)) return false;
      seen.add(token.symbol);
      return true;
    });
  }, [rwaTokens, srcTokenSymbol]);

  const handleAssetSelect = useCallback(
    (asset: TrendingAsset) => {
      const parsed = parseCAIP19AssetId(asset.assetId);
      if (!parsed) return;
      const destToken: BridgeToken = {
        address: parsed.assetReference,
        symbol: asset.symbol,
        name: asset.name,
        decimals: asset.decimals,
        chainId: `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
        image: getTrendingTokenImageUrl(asset.assetId),
        rwaData: asset.rwaData as BridgeToken['rwaData'],
      };

      goToSwaps(undefined, destToken, undefined, undefined, srcTokenUnits);
    },
    [goToSwaps, srcTokenUnits],
  );

  const title =
    mode === 'swap' && srcTokenSymbol && srcTokenAsset ? (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
          {strings('rewards.ondo_rwa_asset_selector.title_swap_prefix')}
        </Text>
        <BadgeWrapper
          position={BadgeWrapperPosition.BottomRight}
          badge={
            srcChainHex ? (
              <Badge
                variant={BadgeVariant.Network}
                size={AvatarSize.Xs}
                isScaled={false}
                imageSource={NetworkBadgeSource(srcChainHex as Hex)}
              />
            ) : null
          }
        >
          <TrendingTokenLogo
            assetId={srcTokenAsset}
            symbol={srcTokenSymbol}
            size={28}
          />
        </BadgeWrapper>
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
          {srcTokenSymbol}
        </Text>
      </Box>
    ) : (
      strings('rewards.ondo_rwa_asset_selector.title_open_position')
    );

  const renderItem = ({ item }: { item: TrendingAsset }) => (
    <View style={styles.row}>
      <TrendingTokenRowItem
        token={item}
        selectedTimeOption={selectedTimeOption}
        onPress={handleAssetSelect}
      />
    </View>
  );

  const renderSkeleton = () => (
    <Box twClassName="px-4 pt-4 gap-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} style={tw.style('h-14 rounded-xl')} />
      ))}
    </Box>
  );

  const renderEmpty = () => (
    <Box twClassName="px-4 pt-8" alignItems={BoxAlignItems.Center}>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('rewards.ondo_rwa_asset_selector.no_results')}
      </Text>
    </Box>
  );

  return (
    <ErrorBoundary navigation={navigation} view="OndoCampaignRwaSelectorView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
      >
        <HeaderCompactStandard
          title={title}
          onBack={() => navigation.goBack()}
          includesTopInset
        />

        {/* Sticky search bar */}
        <View style={tw.style('px-4 py-2 bg-default')}>
          <View
            style={tw.style(
              'flex-row items-center bg-muted rounded-xl px-3 py-2 gap-2',
            )}
          >
            <Icon
              name={IconName.Search}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
            <TextInput
              style={tw.style('flex-1 text-default body-md')}
              placeholder={strings(
                'rewards.ondo_rwa_asset_selector.search_placeholder',
              )}
              placeholderTextColor={colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon
                  name={IconName.Close}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={tw`px-4 py-3`}>
          <FilterBar
            priceChangeButtonText={priceChangeButtonText}
            onPriceChangePress={() => setShowPriceChangeSheet(true)}
            networkName={networkName}
            onNetworkPress={() => undefined}
            extraFilters={
              <FilterButton
                testID="rwa-time-filter"
                label={selectedTimeOption}
                onPress={() => setShowTimeSheet(true)}
              />
            }
          />
        </View>

        <View
          style={[styles.divider, { backgroundColor: colors.border.muted }]}
        />

        {showSkeleton ? (
          renderSkeleton()
        ) : (
          <FlatList<TrendingAsset>
            data={tokens}
            keyExtractor={(item) => item.assetId}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw.style('pt-2 pb-4')}
            ListEmptyComponent={renderEmpty}
          />
        )}
      </SafeAreaView>

      <TrendingTokenPriceChangeBottomSheet
        isVisible={showPriceChangeSheet}
        onClose={() => setShowPriceChangeSheet(false)}
        selectedOption={selectedPriceChangeOption}
        sortDirection={priceChangeSortDirection}
        onPriceChangeSelect={(option, direction) => {
          setSelectedPriceChangeOption(option);
          setPriceChangeSortDirection(direction);
          setShowPriceChangeSheet(false);
        }}
      />

      <TrendingTokenTimeBottomSheet
        isVisible={showTimeSheet}
        onClose={() => setShowTimeSheet(false)}
        selectedTime={selectedTimeOption}
        onTimeSelect={(_sortBy, timeOption) => {
          setSelectedTimeOption(timeOption);
          setShowTimeSheet(false);
        }}
      />
    </ErrorBoundary>
  );
};

export default OndoCampaignRwaSelectorView;
