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
import { parseCaip19, caipChainIdToHex } from '../utils/formatUtils';
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
  } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
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

  // In swap mode, filter to same chain as src asset
  const chainIds = useMemo((): CaipChainId[] | undefined => {
    if (mode !== 'swap' || !srcTokenAsset) return undefined;
    const parsed = parseCaip19(srcTokenAsset);
    if (!parsed) return undefined;
    return [`${parsed.namespace}:${parsed.chainId}` as CaipChainId];
  }, [mode, srcTokenAsset]);

  const { data: rwaTokens, isLoading } = useRwaTokens({
    searchQuery,
    chainIds,
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
  }, [searchQuery]);

  useEffect(() => {
    setIsFiltering(false);
  }, [rwaTokens]);

  const showSkeleton = isLoading || isFiltering;

  const { isTokenTradingOpen } = useRWAToken();

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

      goToSwaps(undefined, destToken);
    },
    [goToSwaps, isTokenTradingOpen],
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
        token={item}
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
                goToSwaps(undefined, afterHoursPendingToken);
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
