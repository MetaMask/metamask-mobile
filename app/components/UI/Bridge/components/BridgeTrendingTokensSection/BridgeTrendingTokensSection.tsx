import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
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
import { strings } from '../../../../../../locales/i18n';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';
import { useBridgeTrendingTokens } from '../../hooks/useBridgeTrendingTokens/useBridgeTrendingTokens';

const TOKEN_CHUNK_SIZE = 12;
const LOAD_THROTTLE_MS = 200;

type ActiveBottomSheet = 'none' | 'time' | 'network' | 'price_change';

export interface BridgeTrendingTokensSectionRef {
  loadNextChunkIfAvailable: () => void;
}

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
      selectedNetworkName,
      priceChangeButtonText,
      filterContext,
      trendingTokens,
      isLoading,
      handlePriceChangeSelect,
      handleNetworkSelect,
      handleTimeSelect,
    } = useBridgeTrendingTokens({
      networkConfigurations,
    });

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

    const lastLoadTriggeredRef = useRef(0);

    const loadNextChunkIfAvailable = useCallback(() => {
      if (activeBottomSheet !== 'none' || isLoading || !hasMore) {
        return;
      }

      const now = Date.now();
      if (now - lastLoadTriggeredRef.current < LOAD_THROTTLE_MS) {
        return;
      }
      lastLoadTriggeredRef.current = now;

      loadNextChunk();
    }, [activeBottomSheet, hasMore, isLoading, loadNextChunk]);

    useImperativeHandle(
      ref,
      () => ({
        loadNextChunkIfAvailable,
      }),
      [loadNextChunkIfAvailable],
    );

    const closeBottomSheet = useCallback(() => {
      setActiveBottomSheet('none');
    }, []);

    const openBottomSheet = useCallback((type: ActiveBottomSheet) => {
      setActiveBottomSheet(type);
    }, []);

    const visibleTrendingTokens = useMemo(
      () => trendingTokens.slice(0, visibleTokenCount),
      [trendingTokens, visibleTokenCount],
    );

    const filterButtons = [
      {
        testID: BridgeViewSelectorsIDs.TRENDING_PRICE_FILTER,
        onPress: () => openBottomSheet('price_change'),
        text: priceChangeButtonText,
        extraClass: 'flex-1',
      },
      {
        testID: BridgeViewSelectorsIDs.TRENDING_NETWORK_FILTER,
        onPress: () => openBottomSheet('network'),
        text: selectedNetworkName,
        extraClass: 'flex-1',
      },
      {
        testID: BridgeViewSelectorsIDs.TRENDING_TIME_FILTER,
        onPress: () => openBottomSheet('time'),
        text: selectedTimeOption,
        extraClass: 'w-[72px] shrink-0',
      },
    ];

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
            {filterButtons.map(({ testID, onPress, text, extraClass }) => (
              <Pressable
                key={testID}
                testID={testID}
                onPress={onPress}
                style={({ pressed }) =>
                  tw.style(
                    'py-2 px-3 items-center justify-center rounded-lg bg-background-muted',
                    extraClass,
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
            ))}
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
              onPress={loadNextChunkIfAvailable}
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
          onRequestClose={closeBottomSheet}
        >
          {activeBottomSheet === 'time' && (
            <TrendingTokenTimeBottomSheet
              isVisible
              onClose={closeBottomSheet}
              onTimeSelect={handleTimeSelect}
              selectedTime={selectedTimeOption}
            />
          )}
          {activeBottomSheet === 'network' && (
            <TrendingTokenNetworkBottomSheet
              isVisible
              onClose={closeBottomSheet}
              onNetworkSelect={handleNetworkSelect}
              selectedNetwork={selectedNetwork}
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
  },
);

BridgeTrendingTokensSection.displayName = 'BridgeTrendingTokensSection';

export default BridgeTrendingTokensSection;
