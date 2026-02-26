import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Modal, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Icon,
  IconName,
  IconColor,
  IconSize,
} from '@metamask/design-system-react-native';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import {
  TrendingTokenNetworkBottomSheet,
  TrendingTokenPriceChangeBottomSheet,
  TrendingTokenTimeBottomSheet,
} from '../../../Trending/components/TrendingTokensBottomSheet';
import TrendingTokensSkeleton from '../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import TrendingTokenRowItem from '../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import { useTrendingFilters } from '../../../Trending/hooks/useTrendingFilters/useTrendingFilters';
import { useTrendingRequest } from '../../../Trending/hooks/useTrendingRequest/useTrendingRequest';
import { sortTrendingTokens } from '../../../Trending/utils/sortTrendingTokens';
import { strings } from '../../../../../../locales/i18n';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';

const TOKEN_CHUNK_SIZE = 12;

type ActiveBottomSheet = 'none' | 'time' | 'network' | 'price_change';

export interface BridgeTrendingTokensSectionRef {
  loadNextChunkIfAvailable: () => void;
}

const FilterButton = ({
  testID,
  onPress,
  text,
  twClassName: btnClass,
}: {
  testID: string;
  onPress: () => void;
  text: string;
  twClassName?: string;
}) => {
  const tw = useTailwind();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          'py-2 px-3 items-center justify-center rounded-lg bg-background-muted',
          btnClass,
          pressed && 'opacity-20',
        )
      }
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={1}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {text}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          color={IconColor.IconAlternative}
          size={IconSize.Xs}
        />
      </Box>
    </Pressable>
  );
};

const BridgeTrendingTokensSection = forwardRef<BridgeTrendingTokensSectionRef>(
  (_props, ref) => {
    const tw = useTailwind();
    const [activeBottomSheet, setActiveBottomSheet] =
      useState<ActiveBottomSheet>('none');
    const [visibleTokenCount, setVisibleTokenCount] =
      useState(TOKEN_CHUNK_SIZE);

    const networkConfigurations = useSelector(
      selectNetworkConfigurationsByCaipChainId,
    );

    const {
      selectedTimeOption,
      selectedNetwork,
      selectedPriceChangeOption,
      priceChangeSortDirection,
      sortBy,
      selectedNetworkName,
      priceChangeButtonText,
      filterContext,
      handlePriceChangeSelect,
      handleNetworkSelect,
      handleTimeSelect,
    } = useTrendingFilters({ networkConfigurations });

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

    const loadNextChunk = useCallback(() => {
      setVisibleTokenCount((currentCount) =>
        Math.min(currentCount + TOKEN_CHUNK_SIZE, trendingTokens.length),
      );
    }, [trendingTokens.length]);

    useImperativeHandle(
      ref,
      () => ({
        loadNextChunkIfAvailable: () => {
          if (activeBottomSheet !== 'none' || isLoading || !hasMore) return;
          loadNextChunk();
        },
      }),
      [activeBottomSheet, isLoading, hasMore, loadNextChunk],
    );

    const visibleTrendingTokens = useMemo(
      () => trendingTokens.slice(0, visibleTokenCount),
      [trendingTokens, visibleTokenCount],
    );

    return (
      <>
        <Box
          twClassName="mt-4 px-4 pb-4"
          testID={BridgeViewSelectorsIDs.TRENDING_TOKENS_SECTION}
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
              testID={BridgeViewSelectorsIDs.TRENDING_PRICE_FILTER}
              onPress={() => setActiveBottomSheet('price_change')}
              text={priceChangeButtonText}
              twClassName="flex-1"
            />
            <FilterButton
              testID={BridgeViewSelectorsIDs.TRENDING_NETWORK_FILTER}
              onPress={() => setActiveBottomSheet('network')}
              text={selectedNetworkName}
              twClassName="flex-1"
            />
            <FilterButton
              testID={BridgeViewSelectorsIDs.TRENDING_TIME_FILTER}
              onPress={() => setActiveBottomSheet('time')}
              text={selectedTimeOption}
              twClassName="w-[72px] shrink-0"
            />
          </Box>

          {isLoading ? (
            <Box>
              {Array.from({ length: 6 }).map((_, index) => (
                <TrendingTokensSkeleton key={index} />
              ))}
            </Box>
          ) : (
            <Box>
              {visibleTrendingTokens.map((token, index) => (
                <TrendingTokenRowItem
                  key={`${token.assetId}-${index}`}
                  token={token}
                  position={index}
                  selectedTimeOption={selectedTimeOption}
                  filterContext={filterContext}
                />
              ))}
            </Box>
          )}
          {!isLoading && hasMore ? (
            <Pressable
              testID={BridgeViewSelectorsIDs.TRENDING_SHOW_MORE}
              onPress={loadNextChunk}
              style={({ pressed }) =>
                tw.style('mt-3 py-2 self-center', pressed && 'opacity-20')
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
          onRequestClose={() => setActiveBottomSheet('none')}
        >
          {activeBottomSheet === 'time' && (
            <TrendingTokenTimeBottomSheet
              isVisible
              onClose={() => setActiveBottomSheet('none')}
              onTimeSelect={handleTimeSelect}
              selectedTime={selectedTimeOption}
            />
          )}
          {activeBottomSheet === 'network' && (
            <TrendingTokenNetworkBottomSheet
              isVisible
              onClose={() => setActiveBottomSheet('none')}
              onNetworkSelect={handleNetworkSelect}
              selectedNetwork={selectedNetwork}
            />
          )}
          {activeBottomSheet === 'price_change' && (
            <TrendingTokenPriceChangeBottomSheet
              isVisible
              onClose={() => setActiveBottomSheet('none')}
              onPriceChangeSelect={handlePriceChangeSelect}
              selectedOption={selectedPriceChangeOption}
              sortDirection={priceChangeSortDirection}
            />
          )}
        </Modal>
      </>
    );
  },
);

BridgeTrendingTokensSection.displayName = 'BridgeTrendingTokensSection';

export default BridgeTrendingTokensSection;
