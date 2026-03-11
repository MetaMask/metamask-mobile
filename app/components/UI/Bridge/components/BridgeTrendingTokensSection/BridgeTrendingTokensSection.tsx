import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import {
  TrendingTokenNetworkBottomSheet,
  TrendingTokenPriceChangeBottomSheet,
  TrendingTokenTimeBottomSheet,
  mapTimeOptionToSortBy,
} from '../../../Trending/components/TrendingTokensBottomSheet';
import {
  ALLOWED_BRIDGE_CHAIN_IDS,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import TrendingTokensSkeleton from '../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import TrendingTokenRowItem from '../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import { useTokenListFilters } from '../../../Trending/hooks/useTokenListFilters/useTokenListFilters';
import { useTrendingRequest } from '../../../Trending/hooks/useTrendingRequest/useTrendingRequest';
import { sortTrendingTokens } from '../../../Trending/utils/sortTrendingTokens';
import { strings } from '../../../../../../locales/i18n';
import { getNetworkImageSource } from '../../../../../util/networks';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../../constants/bridge';
import type { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import type { CaipChainId } from '@metamask/utils';
import { FilterButton } from '../../../Trending/components/FilterBar/FilterBar';
import { BridgeTrendingTokensSectionTestIds } from './BridgeTrendingTokensSection.testIds';

const TOKEN_CHUNK_SIZE = 12;

type ActiveBottomSheet = 'none' | 'time' | 'network' | 'price_change';

interface BridgeTrendingTokensSectionProps {
  isNearBottom?: boolean;
}

const BridgeTrendingTokensSection = ({
  isNearBottom,
}: BridgeTrendingTokensSectionProps) => {
  const tw = useTailwind();
  const [activeBottomSheet, setActiveBottomSheet] =
    useState<ActiveBottomSheet>('none');
  const closeBottomSheet = () => setActiveBottomSheet('none');
  const [visibleTokenCount, setVisibleTokenCount] = useState(TOKEN_CHUNK_SIZE);

  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const {
    selectedTimeOption,
    setSelectedTimeOption,
    selectedNetwork,
    selectedPriceChangeOption,
    priceChangeSortDirection,
    selectedNetworkName,
    priceChangeButtonText,
    filterContext,
    handlePriceChangeSelect,
    handleNetworkSelect,
  } = useTokenListFilters();

  const sortBy = useMemo(
    () => mapTimeOptionToSortBy(selectedTimeOption),
    [selectedTimeOption],
  );

  const { results, isLoading } = useTrendingRequest({
    sortBy,
    chainIds: selectedNetwork ?? undefined,
  });

  const trendingTokens = useMemo(() => {
    if (results.length === 0 || !selectedPriceChangeOption) {
      return results;
    }
    return sortTrendingTokens(
      results,
      selectedPriceChangeOption,
      priceChangeSortDirection,
      selectedTimeOption,
    );
  }, [
    results,
    selectedPriceChangeOption,
    priceChangeSortDirection,
    selectedTimeOption,
  ]);

  useEffect(() => {
    if (isLoading) {
      setVisibleTokenCount(TOKEN_CHUNK_SIZE);
      return;
    }
    setVisibleTokenCount(Math.min(TOKEN_CHUNK_SIZE, trendingTokens.length));
  }, [isLoading, trendingTokens]);

  const hasMore = visibleTokenCount < trendingTokens.length;
  const bridgeTrendingNetworks = useMemo(
    () =>
      ALLOWED_BRIDGE_CHAIN_IDS.map((allowedChainId) => {
        const caipChainId = formatChainIdToCaip(allowedChainId) as CaipChainId;
        // Map to network configurations first because network filter dropdown does the same
        // Fallback to NETWORK_TO_SHORT_NETWORK_NAME_MAP because some bridge chains are not in network configurations
        const networkName =
          networkConfigurations[caipChainId]?.name ??
          NETWORK_TO_SHORT_NETWORK_NAME_MAP[allowedChainId] ??
          caipChainId;

        return {
          id: caipChainId,
          name: networkName,
          caipChainId,
          isSelected: false,
          imageSource: getNetworkImageSource({ chainId: allowedChainId }),
        } as ProcessedNetwork;
      }),
    [networkConfigurations],
  );

  const loadNextChunk = useCallback(() => {
    setVisibleTokenCount((currentCount) =>
      Math.min(currentCount + TOKEN_CHUNK_SIZE, trendingTokens.length),
    );
  }, [trendingTokens.length]);

  useEffect(() => {
    if (isNearBottom && activeBottomSheet === 'none' && !isLoading && hasMore) {
      loadNextChunk();
    }
  }, [isNearBottom, activeBottomSheet, isLoading, hasMore, loadNextChunk]);

  return (
    <>
      <Box
        twClassName="mt-4 px-4 pb-4"
        testID={BridgeTrendingTokensSectionTestIds.SECTION}
      >
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          twClassName="mb-3"
        >
          {strings('trending.trending_tokens')}
        </Text>
        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="gap-2 mb-3 w-full"
        >
          <FilterButton
            testID={BridgeTrendingTokensSectionTestIds.PRICE_FILTER}
            onPress={() => setActiveBottomSheet('price_change')}
            label={priceChangeButtonText}
            twClassName="flex-1"
          />
          <FilterButton
            testID={BridgeTrendingTokensSectionTestIds.NETWORK_FILTER}
            onPress={() => setActiveBottomSheet('network')}
            label={selectedNetworkName}
            twClassName="flex-1"
          />
          <FilterButton
            testID={BridgeTrendingTokensSectionTestIds.TIME_FILTER}
            onPress={() => setActiveBottomSheet('time')}
            label={selectedTimeOption}
            twClassName="w-[72px] shrink-0"
          />
        </Box>

        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <TrendingTokensSkeleton key={index} />
            ))
          : trendingTokens
              .slice(0, visibleTokenCount)
              .map((token, index) => (
                <TrendingTokenRowItem
                  key={`${token.assetId}-${index}`}
                  token={token}
                  position={index}
                  selectedTimeOption={selectedTimeOption}
                  filterContext={filterContext}
                />
              ))}
        {!isLoading && hasMore ? (
          <Pressable
            testID={BridgeTrendingTokensSectionTestIds.SHOW_MORE}
            onPress={loadNextChunk}
            style={({ pressed }) =>
              tw.style('mt-3 py-2 self-center', pressed && 'opacity-70')
            }
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.PrimaryDefault}
            >
              {strings('rewards.settings.show_more')}
            </Text>
          </Pressable>
        ) : null}
      </Box>

      <Modal
        transparent
        animationType="none"
        presentationStyle="overFullScreen"
        hardwareAccelerated
        statusBarTranslucent
        visible={activeBottomSheet !== 'none'}
        onRequestClose={closeBottomSheet}
      >
        {activeBottomSheet === 'time' && (
          <TrendingTokenTimeBottomSheet
            isVisible
            onClose={closeBottomSheet}
            onTimeSelect={(_sortBy, timeOption) =>
              setSelectedTimeOption(timeOption)
            }
            selectedTime={selectedTimeOption}
          />
        )}
        {activeBottomSheet === 'network' && (
          <TrendingTokenNetworkBottomSheet
            isVisible
            onClose={closeBottomSheet}
            onNetworkSelect={handleNetworkSelect}
            selectedNetwork={selectedNetwork}
            networks={bridgeTrendingNetworks}
          />
        )}
        {activeBottomSheet === 'price_change' && (
          <TrendingTokenPriceChangeBottomSheet
            isVisible
            onClose={closeBottomSheet}
            onPriceChangeSelect={handlePriceChangeSelect}
            selectedOption={selectedPriceChangeOption}
            sortDirection={priceChangeSortDirection}
          />
        )}
      </Modal>
    </>
  );
};

export default BridgeTrendingTokensSection;
