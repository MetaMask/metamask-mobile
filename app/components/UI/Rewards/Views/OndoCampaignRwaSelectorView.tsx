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
import { useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
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
import {
  parseCaip19,
  caipChainIdToHex,
  sanitizeOndoTokenName,
} from '../utils/formatUtils';
import { RWA_NETWORKS_LIST } from '../../Trending/utils/trendingNetworksList';
import { TrendingTokenNetworkBottomSheet } from '../../Trending/components/TrendingTokensBottomSheet';
import { FilterButton } from '../../Trending/components/FilterBar/FilterBar';
import { useNetworkName } from '../../Trending/hooks/useNetworkName/useNetworkName';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../Bridge/hooks/useSwapBridgeNavigation';
import type { BridgeToken } from '../../Bridge/types';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { TimeOption } from '../../Trending/components/TrendingTokensBottomSheet/TrendingTokenTimeBottomSheet';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import OndoAfterHoursSheet from '../components/Campaigns/OndoAfterHoursSheet';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectAllTokenBalances } from '../../../../selectors/tokenBalancesController';

// USDY (Ondo USD Yield) on Ethereum mainnet — used to preset the source token
// for open_position mode. This is the only network where USDY is supported in
// the RWA campaign feature.
const USDY_CAIP19 =
  'eip155:1/erc20:0x96f6ef951840721adbf46ac996b59e0235cb985c' as const;
const USDY_DECIMALS = 18;
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';

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
    campaignId,
  } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChainId, setSelectedChainId] = useState<CaipChainId>(
    RWA_NETWORKS_LIST[0].caipChainId,
  );
  const [showNetworkSheet, setShowNetworkSheet] = useState(false);
  const [isAfterHoursSheetOpen, setIsAfterHoursSheetOpen] = useState(false);
  const [afterHoursNextOpen, setAfterHoursNextOpen] = useState<Date | null>(
    null,
  );
  const [afterHoursPendingToken, setAfterHoursPendingToken] =
    useState<BridgeToken | null>(null);

  // Build the source BridgeToken from route params (swap mode only)
  const srcBridgeToken = useMemo((): BridgeToken | undefined => {
    if (mode !== 'swap' || !srcTokenAsset || !srcTokenSymbol) return undefined;
    const parsed = parseCaip19(srcTokenAsset);
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
    const parsed = parseCaip19(srcTokenAsset);
    if (!parsed || parsed.namespace !== 'eip155') return undefined;
    return caipChainIdToHex(
      `${parsed.namespace}:${parsed.chainId}` as CaipChainId,
    );
  }, [srcTokenAsset]);

  // open_position: show one chain at a time (user-selected, defaults to Ethereum).
  // swap: lock to the src asset's chain.
  const chainIds = useMemo((): CaipChainId[] => {
    if (mode === 'swap' && srcTokenAsset) {
      const parsed = parseCaip19(srcTokenAsset);
      if (parsed) {
        return [`${parsed.namespace}:${parsed.chainId}` as CaipChainId];
      }
    }
    return [selectedChainId];
  }, [mode, srcTokenAsset, selectedChainId]);

  const { data: rwaTokens, isLoading } = useRwaTokens({
    searchQuery,
    chainIds,
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
  }, [searchQuery]);

  useEffect(() => {
    setIsFiltering(false);
  }, [rwaTokens]);

  const showSkeleton = isLoading || isFiltering;

  const selectedNetworkName = useNetworkName(
    mode === 'open_position' ? [selectedChainId] : null,
  );

  const { trackEvent, createEventBuilder } = useAnalytics();
  const { isTokenTradingOpen } = useRWAToken();

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

  const title =
    mode === 'swap' && srcTokenSymbol && srcTokenAsset ? (
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
            symbol={srcTokenSymbol}
            size={28}
          />
        </BadgeWrapper>
        <Text variant={TextVariant.HeadingSm}>{srcTokenSymbol}</Text>
      </Box>
    ) : (
      strings('rewards.ondo_rwa_asset_selector.title_open_position')
    );

  const renderItem = ({ item }: { item: TrendingAsset }) => (
    <View style={styles.row}>
      <TrendingTokenRowItem
        token={{ ...item, name: sanitizeOndoTokenName(item.name) }}
        selectedTimeOption={TimeOption.TwentyFourHours}
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
              <TouchableOpacity
                testID="clear-search-button"
                onPress={() => setSearchQuery('')}
              >
                <Icon
                  name={IconName.Close}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Network filter — only in open_position mode */}
        {mode === 'open_position' && (
          <View style={tw.style('px-4 pb-2')}>
            <FilterButton
              testID="network-filter-button"
              label={selectedNetworkName}
              onPress={() => setShowNetworkSheet(true)}
            />
          </View>
        )}

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
        <TrendingTokenNetworkBottomSheet
          isVisible={mode === 'open_position' && showNetworkSheet}
          onClose={() => setShowNetworkSheet(false)}
          onNetworkSelect={(chainIds) => {
            if (chainIds?.[0]) setSelectedChainId(chainIds[0]);
            setShowNetworkSheet(false);
          }}
          selectedNetwork={[selectedChainId]}
          networks={RWA_NETWORKS_LIST}
          hideAllNetworks
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
