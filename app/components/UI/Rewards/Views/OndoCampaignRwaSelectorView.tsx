import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Hex, type CaipChainId } from '@metamask/utils';
import type { TrendingAsset } from '@metamask/assets-controllers';
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
import { parseCaip19, caipChainIdToHex } from '../utils/formatUtils';
import { RWA_NETWORKS_LIST } from '../../Trending/utils/trendingNetworksList';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../Bridge/hooks/useSwapBridgeNavigation';
import type { BridgeToken } from '../../Bridge/types';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import {
  PriceChangeOption,
  TimeOption,
  TrendingTokenNetworkBottomSheet,
  TrendingTokenPriceChangeBottomSheet,
} from '../../Trending/components/TrendingTokensBottomSheet';
import { TrendingListHeader } from '../../Trending/components/TrendingListHeader';
import FilterBar from '../../Trending/components/FilterBar/FilterBar';
import { useTokenListFilters } from '../../Trending/hooks/useTokenListFilters/useTokenListFilters';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import OndoAfterHoursSheet from '../components/Campaigns/OndoAfterHoursSheet';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectAllTokenBalances } from '../../../../selectors/tokenBalancesController';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';

// USDY (Ondo USD Yield) on Ethereum mainnet — used to preset the source token
// for open_position mode. This is the only network where USDY is supported in
// the RWA campaign feature.
const USDY_CAIP19 =
  'eip155:1/erc20:0x96f6ef951840721adbf46ac996b59e0235cb985c' as const;
const USDY_DECIMALS = 18;

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OndoCampaignRwaSelectorRouteParams = {
  OndoCampaignRwaSelector: {
    mode: 'swap' | 'open_position';
    srcTokenAsset?: string;
    srcTokenSymbol?: string;
    srcTokenName?: string;
    srcTokenDecimals?: number;
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
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
    campaignId,
  } = route.params;

  const filters = useTokenListFilters({
    timeOption: TimeOption.TwentyFourHours,
  });

  // Set the default network filter based on mode:
  // - swap: pre-select the source asset's chain
  // - open_position: pre-select Ethereum
  const hasSetInitialNetwork = useRef(false);
  useEffect(() => {
    if (hasSetInitialNetwork.current) return;
    hasSetInitialNetwork.current = true;

    if (mode === 'swap' && srcTokenAsset) {
      const parsed = parseCaip19(srcTokenAsset);
      if (parsed) {
        filters.handleNetworkSelect([
          `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
        ]);
        return;
      }
    }
    filters.handleNetworkSelect([RWA_NETWORKS_LIST[0].caipChainId]);
  }, [mode, srcTokenAsset, filters]);

  const [isAfterHoursSheetOpen, setIsAfterHoursSheetOpen] = useState(false);
  const [afterHoursNextOpen, setAfterHoursNextOpen] = useState<Date | null>(
    null,
  );
  const [afterHoursPendingToken, setAfterHoursPendingToken] =
    useState<BridgeToken | null>(null);

  // Uppercase the source symbol — on-chain BSC symbols use mixed case
  // (e.g. "NIOon") but the convention on this screen is always uppercase.
  const srcTokenSymbolDisplay = srcTokenSymbol?.toUpperCase();

  // Build the source BridgeToken from route params (swap mode only).
  // chainId must be hex for EVM chains so useLatestBalance can fetch the
  // on-chain balance (it skips CAIP-formatted EVM chain IDs).
  const srcBridgeToken = useMemo((): BridgeToken | undefined => {
    if (mode !== 'swap' || !srcTokenAsset || !srcTokenSymbolDisplay)
      return undefined;
    const parsed = parseCaip19(srcTokenAsset);
    if (!parsed || parsed.namespace !== 'eip155') return undefined;
    return {
      address: parsed.assetReference,
      symbol: srcTokenSymbolDisplay,
      name: srcTokenName ?? srcTokenSymbolDisplay,
      decimals: srcTokenDecimals ?? 18,
      chainId: caipChainIdToHex(
        `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
      ),
      image: getTrendingTokenImageUrl(srcTokenAsset),
    };
  }, [
    mode,
    srcTokenAsset,
    srcTokenSymbolDisplay,
    srcTokenName,
    srcTokenDecimals,
  ]);

  const srcChainHex = useMemo(() => {
    if (!srcTokenAsset) return undefined;
    const parsed = parseCaip19(srcTokenAsset);
    if (!parsed || parsed.namespace !== 'eip155') return undefined;
    return caipChainIdToHex(
      `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
    );
  }, [srcTokenAsset]);

  // In swap mode, restrict the network picker to the source asset's chain.
  // In open_position mode, show all RWA networks.
  const allowedNetworks = useMemo(() => {
    if (mode === 'swap' && srcTokenAsset) {
      const parsed = parseCaip19(srcTokenAsset);
      if (parsed) {
        const srcCaipChainId =
          `${parsed.namespace}:${parsed.chainId}` as CaipChainId;
        return RWA_NETWORKS_LIST.filter(
          (n) => n.caipChainId === srcCaipChainId,
        );
      }
    }
    return RWA_NETWORKS_LIST;
  }, [mode, srcTokenAsset]);

  const chainIds = filters.selectedNetwork;

  const { data: rwaTokens, isLoading } = useRwaTokens({
    searchQuery: filters.searchQuery || undefined,
    chainIds,
    sortTrendingTokensOptions: {
      option:
        filters.selectedPriceChangeOption ?? PriceChangeOption.PriceChange,
      direction: filters.priceChangeSortDirection,
    },
  });

  const activeGroupAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );
  const allTokenBalances = useSelector(selectAllTokenBalances);

  // In open_position mode, preset USDY as the source if the user holds a balance.
  // Uses a hardcoded CAIP-19 so the preset is independent of the search state —
  // rwaTokens is filtered by searchQuery and may not contain USDY when a user
  // searches for another token (e.g. "AAPL").
  const ondoUsdSrcToken = useMemo((): BridgeToken | undefined => {
    if (mode !== 'open_position' || !activeGroupAccounts.length)
      return undefined;
    const parsed = parseCaip19(USDY_CAIP19);
    if (!parsed || parsed.namespace !== 'eip155') return undefined;
    const chainHex = caipChainIdToHex(
      `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
    );
    const tokenHex = parsed.assetReference.toLowerCase() as Hex;
    const hasBalance = activeGroupAccounts.some((a) => {
      const bal =
        allTokenBalances?.[a.address.toLowerCase() as Hex]?.[chainHex]?.[
          tokenHex
        ];
      return bal !== undefined && !!parseInt(bal, 16);
    });
    if (!hasBalance) return undefined;
    return {
      address: parsed.assetReference,
      symbol: 'USDY',
      name: 'Ondo USD Yield',
      decimals: USDY_DECIMALS,
      chainId: `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
      image: getTrendingTokenImageUrl(USDY_CAIP19),
    };
  }, [mode, activeGroupAccounts, allTokenBalances]);

  const { isTokenTradingOpen } = useRWAToken();

  // Proactive first-token check: if the first RWA token's market is closed
  // when the list loads, immediately surface the after-hours sheet so the
  // user is informed before they tap anything.
  const hasShownAfterHoursRef = useRef(false);
  useEffect(() => {
    if (hasShownAfterHoursRef.current || !rwaTokens.length) return;
    const firstToken: BridgeToken = {
      ...rwaTokens[0],
      rwaData: rwaTokens[0].rwaData as BridgeToken['rwaData'],
    };
    if (!isTokenTradingOpen(firstToken)) {
      const rawNextOpen = firstToken.rwaData?.market?.nextOpen;
      const nextOpenDate = rawNextOpen ? new Date(String(rawNextOpen)) : null;
      setAfterHoursNextOpen(
        nextOpenDate && !isNaN(nextOpenDate.getTime()) ? nextOpenDate : null,
      );
      setAfterHoursPendingToken(firstToken);
      setIsAfterHoursSheetOpen(true);
      hasShownAfterHoursRef.current = true;
    }
  }, [rwaTokens, isTokenTradingOpen]);

  useTrackRewardsPageView({
    page_type:
      mode === 'swap' ? 'ondo_campaign_swap' : 'ondo_campaign_open_position',
    campaign_id: campaignId,
  });

  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.Rewards,
    sourcePage: 'OndoCampaignRwaSelector',
    sourceToken: srcBridgeToken,
  });

  // Deduplicate by symbol so the same stock on multiple chains appears once.
  // Use CAIP-19 assetId (not symbol) to exclude the source token in swap mode —
  // symbol comparison is fragile when casing differs between chains.
  const tokens = useMemo((): TrendingAsset[] => {
    const seen = new Set<string>();
    return rwaTokens.filter((token) => {
      if (srcTokenAsset && token.assetId === srcTokenAsset) return false;
      if (seen.has(token.symbol)) return false;
      seen.add(token.symbol);
      return true;
    });
  }, [rwaTokens, srcTokenAsset]);

  const handleAssetSelect = useCallback(
    (asset: TrendingAsset) => {
      const parsed = parseCaip19(asset.assetId);
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

      if (!isTokenTradingOpen(destToken)) {
        const rawNextOpen = destToken.rwaData?.market?.nextOpen;
        const nextOpenDate = rawNextOpen ? new Date(String(rawNextOpen)) : null;
        setAfterHoursNextOpen(
          nextOpenDate && !isNaN(nextOpenDate.getTime()) ? nextOpenDate : null,
        );
        setAfterHoursPendingToken(destToken);
        setIsAfterHoursSheetOpen(true);
        return;
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
          .addProperties({
            button_type: `ondo_campaign_swap_${asset.symbol.toLowerCase()}`,
          })
          .build(),
      );
      goToSwaps(ondoUsdSrcToken, destToken);
    },
    [
      goToSwaps,
      isTokenTradingOpen,
      trackEvent,
      createEventBuilder,
      ondoUsdSrcToken,
    ],
  );

  const swapTitle = useMemo(() => {
    if (mode !== 'swap' || !srcTokenSymbolDisplay || !srcTokenAsset)
      return undefined;
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        <Text variant={TextVariant.HeadingSm}>
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
            symbol={srcTokenSymbolDisplay}
            size={28}
          />
        </BadgeWrapper>
        <Text variant={TextVariant.HeadingSm}>{srcTokenSymbolDisplay}</Text>
      </Box>
    );
  }, [mode, srcTokenSymbolDisplay, srcTokenAsset, srcChainHex]);

  const headerTitle =
    swapTitle ?? strings('rewards.ondo_rwa_asset_selector.title_open_position');

  const renderItem = ({ item }: { item: TrendingAsset }) => (
    <View style={styles.row}>
      <TrendingTokenRowItem
        token={item}
        selectedTimeOption={filters.selectedTimeOption}
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
        style={tw.style('flex-1 bg-default')}
        edges={['left', 'right']}
      >
        <View style={tw.style('bg-default', { paddingTop: insets.top })}>
          <TrendingListHeader
            title={headerTitle}
            isSearchVisible={filters.isSearchVisible}
            searchQuery={filters.searchQuery}
            onSearchQueryChange={filters.handleSearchQueryChange}
            onBack={() => navigation.goBack()}
            onSearchToggle={filters.handleSearchToggle}
            testID="ondo-rwa-selector-header"
          />
        </View>

        {!filters.isSearchVisible ? (
          <FilterBar
            priceChangeButtonText={filters.priceChangeButtonText}
            onPriceChangePress={filters.handlePriceChangePress}
            isPriceChangeDisabled={rwaTokens.length === 0}
            networkName={filters.selectedNetworkName}
            onNetworkPress={filters.handleAllNetworksPress}
          />
        ) : null}

        <View
          style={[styles.divider, { backgroundColor: colors.border.muted }]}
        />

        {isLoading ? (
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

        <TrendingTokenNetworkBottomSheet
          isVisible={filters.showNetworkBottomSheet}
          onClose={() => filters.setShowNetworkBottomSheet(false)}
          onNetworkSelect={filters.handleNetworkSelect}
          selectedNetwork={filters.selectedNetwork}
          networks={allowedNetworks}
        />
        <TrendingTokenPriceChangeBottomSheet
          isVisible={filters.showPriceChangeBottomSheet}
          onClose={() => filters.setShowPriceChangeBottomSheet(false)}
          onPriceChangeSelect={filters.handlePriceChangeSelect}
          selectedOption={filters.selectedPriceChangeOption}
          sortDirection={filters.priceChangeSortDirection}
        />

        {isAfterHoursSheetOpen && (
          <OndoAfterHoursSheet
            onClose={() => {
              setIsAfterHoursSheetOpen(false);
              setAfterHoursNextOpen(null);
              setAfterHoursPendingToken(null);
            }}
            onConfirm={() => {
              setIsAfterHoursSheetOpen(false);
              setAfterHoursNextOpen(null);
              if (afterHoursPendingToken) {
                trackEvent(
                  createEventBuilder(
                    MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
                  )
                    .addProperties({
                      button_type: `ondo_campaign_swap_${afterHoursPendingToken.symbol.toLowerCase()}`,
                    })
                    .build(),
                );
                goToSwaps(ondoUsdSrcToken, afterHoursPendingToken);
              }
              setAfterHoursPendingToken(null);
            }}
            nextOpenAt={afterHoursNextOpen}
          />
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignRwaSelectorView;
