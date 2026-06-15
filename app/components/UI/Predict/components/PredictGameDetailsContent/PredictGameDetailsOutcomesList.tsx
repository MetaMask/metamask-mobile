import React, { memo, useCallback, useMemo, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { RefreshControl } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { PredictMarketDetailsTabKey } from '../../Predict.testIds';
import type {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
  PredictPosition,
} from '../../types';
import { useTheme } from '../../../../../util/theme';
import { usePredictLivePrices } from '../../hooks/usePredictLivePrices';
import PredictChipList, { type PredictChipItem } from '../PredictChipList';
import PredictMarketDetailsTabBar from '../../views/PredictMarketDetails/components/PredictMarketDetailsTabBar';
import PredictPicks from '../PredictPicks/PredictPicks';
import PredictGameOutcomeCard, {
  type BuyHandler,
  type OutcomeCardModel,
} from './PredictGameOutcomeCard';
import PredictResolvedOutcomesSection from '../PredictResolvedOutcomesSection';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import { usePredictGameGroupOutcomes } from './usePredictGameGroupOutcomes';
import { usePredictVisibleOutcomes } from './usePredictVisibleOutcomes';

type PredictGameDetailsListItem =
  | {
      type: 'header';
      key: string;
      element: React.ReactElement;
    }
  | {
      type: 'controls';
      key: string;
    }
  | {
      type: 'positions';
      key: string;
      showHeading: boolean;
    }
  | {
      type: 'outcome-card';
      key: string;
      cardModel: OutcomeCardModel;
    }
  | {
      type: 'resolved-outcomes';
      key: string;
      closedOutcomes: PredictOutcome[];
      collapsible: boolean;
    };

export interface PredictGameDetailsOutcomesListProps {
  market: PredictMarket;
  enabled: boolean;
  groupMap: Map<string, PredictOutcomeGroup>;
  activeChipKey: string;
  onBetPress: (token: PredictOutcomeToken) => void;
  refreshing: boolean;
  onRefresh: () => void;
  showTabBar: boolean;
  tabs: { label: string; key: PredictMarketDetailsTabKey }[];
  activeTab: number;
  onTabPress: (tabIndex: number) => void;
  showChips: boolean;
  chips: PredictChipItem[];
  onChipSelect: (key: string) => void;
  activePositions: PredictPosition[];
  claimablePositions: PredictPosition[];
  listHeaderComponent?: React.ReactElement;
}

const getVisibleCardKey = (
  item: PredictGameDetailsListItem,
): string | undefined =>
  item.type === 'outcome-card' ? item.cardModel.key : undefined;

const keyExtractor = (item: PredictGameDetailsListItem): string => item.key;

const PredictGameDetailsOutcomesList = memo(
  ({
    market,
    enabled,
    groupMap,
    activeChipKey,
    onBetPress,
    refreshing,
    onRefresh,
    showTabBar,
    tabs,
    activeTab,
    onTabPress,
    showChips,
    chips,
    onChipSelect,
    activePositions,
    claimablePositions,
    listHeaderComponent,
  }: PredictGameDetailsOutcomesListProps) => {
    const tw = useTailwind();
    const { colors } = useTheme();
    const selectedGroup = groupMap.get(activeChipKey);
    const {
      openCardModels: cardModels,
      closedOutcomes,
      showResolvedSection,
    } = usePredictGameGroupOutcomes({
      group: selectedGroup,
    });
    const [expandedByChipKey, setExpandedByChipKey] = useState<
      Record<string, boolean>
    >({});
    const isResolvedExpanded = expandedByChipKey[activeChipKey] ?? false;
    const toggleResolvedExpanded = useCallback(() => {
      setExpandedByChipKey((previousExpandedByChipKey) => ({
        ...previousExpandedByChipKey,
        [activeChipKey]: !previousExpandedByChipKey[activeChipKey],
      }));
    }, [activeChipKey]);
    const currentTabKey = showTabBar ? tabs[activeTab]?.key : 'outcomes';
    const hasPositions =
      activePositions.length > 0 || claimablePositions.length > 0;
    const showDisabledPositions = !enabled && hasPositions;
    const showPositions =
      showDisabledPositions || (enabled && currentTabKey === 'positions');
    const showOutcomes =
      enabled && currentTabKey === 'outcomes' && Boolean(selectedGroup);
    const showStickyHeader = showTabBar || showChips;
    const visibilityScopeKey = `${currentTabKey ?? 'none'}:${activeChipKey}`;

    const {
      onMomentumScrollBegin,
      onMomentumScrollEnd,
      onScroll,
      onScrollBeginDrag,
      onScrollEndDrag,
      onSelectedLineIndexChange,
      onViewableItemsChanged,
      selectedLineIndices,
      viewabilityConfig,
      visibleCardKeys,
      visiblePriceQueries,
      visibleTokenIds,
    } = usePredictVisibleOutcomes<PredictGameDetailsListItem>({
      cardModels,
      enabled: showOutcomes,
      getVisibleCardKey,
      resetKey: visibilityScopeKey,
    });
    const { getPrice, priceVersion } = usePredictLivePrices(
      visiblePriceQueries,
      {
        enabled: showOutcomes,
      },
    );

    const listData = useMemo<PredictGameDetailsListItem[]>(() => {
      const items: PredictGameDetailsListItem[] = [];

      if (listHeaderComponent) {
        items.push({
          type: 'header',
          key: 'game-details-header',
          element: listHeaderComponent,
        });
      }

      if (showStickyHeader) {
        items.push({
          type: 'controls',
          key: 'game-details-controls',
        });
      }

      if (showPositions) {
        items.push({
          type: 'positions',
          key: 'game-details-positions',
          showHeading: showDisabledPositions,
        });
      }

      if (showOutcomes) {
        cardModels.forEach((cardModel) => {
          items.push({
            type: 'outcome-card',
            key: `game-details-outcome-${cardModel.key}`,
            cardModel,
          });
        });

        if (showResolvedSection) {
          items.push({
            type: 'resolved-outcomes',
            key: 'game-details-resolved-outcomes',
            closedOutcomes,
            collapsible: true,
          });
        }
      }

      return items;
    }, [
      cardModels,
      closedOutcomes,
      listHeaderComponent,
      showDisabledPositions,
      showOutcomes,
      showPositions,
      showResolvedSection,
      showStickyHeader,
    ]);

    const stickyHeaderIndices = useMemo(() => {
      const controlsIndex = listData.findIndex(
        (item) => item.type === 'controls',
      );

      return controlsIndex === -1 ? undefined : [controlsIndex];
    }, [listData]);

    const handleBuyPress = useCallback<BuyHandler>(
      (_outcome: PredictOutcome, token: PredictOutcomeToken) => {
        onBetPress(token);
      },
      [onBetPress],
    );

    const visibleTokenIdsKey = useMemo(
      () => JSON.stringify(visibleTokenIds),
      [visibleTokenIds],
    );
    const extraData = useMemo(
      () => ({
        activeChipKey,
        activeTab,
        isResolvedExpanded,
        priceVersion,
        selectedLineIndices,
        visibleCardKeys,
        visibleTokenIdsKey,
      }),
      [
        activeChipKey,
        activeTab,
        isResolvedExpanded,
        priceVersion,
        selectedLineIndices,
        visibleCardKeys,
        visibleTokenIdsKey,
      ],
    );

    const renderItem = useCallback<ListRenderItem<PredictGameDetailsListItem>>(
      ({ item }) => {
        switch (item.type) {
          case 'header':
            return item.element;
          case 'controls':
            return (
              <Box twClassName="bg-default">
                {showTabBar && (
                  <PredictMarketDetailsTabBar
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabPress={onTabPress}
                  />
                )}
                {showChips && (
                  <PredictChipList
                    chips={chips}
                    activeChipKey={activeChipKey}
                    onChipSelect={onChipSelect}
                  />
                )}
              </Box>
            );
          case 'positions':
            return (
              <Box
                twClassName={item.showHeading ? 'px-4 py-2' : 'px-4'}
                testID={
                  item.showHeading
                    ? undefined
                    : PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.TAB_CONTENT
                }
              >
                {item.showHeading && (
                  <Text
                    variant={TextVariant.HeadingMd}
                    twClassName="font-medium pt-8"
                  >
                    {strings('predict.market_details.your_picks')}
                  </Text>
                )}
                <PredictPicks
                  market={market}
                  positions={activePositions}
                  claimablePositions={claimablePositions}
                  testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_PICK}
                />
              </Box>
            );
          case 'outcome-card':
            return (
              <Box twClassName="px-4">
                <PredictGameOutcomeCard
                  cardModel={item.cardModel}
                  onBuyPress={handleBuyPress}
                  game={market.game}
                  getPrice={getPrice}
                  selectedLineIndex={selectedLineIndices[item.cardModel.key]}
                  onSelectedLineIndexChange={(nextIndex) =>
                    onSelectedLineIndexChange(item.cardModel.key, nextIndex)
                  }
                />
              </Box>
            );
          case 'resolved-outcomes':
            return (
              <Box twClassName="px-4">
                <PredictResolvedOutcomesSection
                  closedOutcomes={item.closedOutcomes}
                  isExpanded={isResolvedExpanded}
                  onToggle={toggleResolvedExpanded}
                  collapsible={item.collapsible}
                />
              </Box>
            );
        }
      },
      [
        activeChipKey,
        activePositions,
        activeTab,
        chips,
        claimablePositions,
        getPrice,
        handleBuyPress,
        isResolvedExpanded,
        market,
        onChipSelect,
        onSelectedLineIndexChange,
        onTabPress,
        selectedLineIndices,
        showChips,
        showTabBar,
        tabs,
        toggleResolvedExpanded,
      ],
    );

    return (
      <Box
        testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}
        twClassName="flex-1"
      >
        <FlashList
          data={listData}
          extraData={extraData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('pb-4')}
          stickyHeaderIndices={stickyHeaderIndices}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.default}
              colors={[colors.primary.default]}
            />
          }
          showsVerticalScrollIndicator={false}
          onMomentumScrollBegin={onMomentumScrollBegin}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScroll={onScroll}
          onScrollBeginDrag={onScrollBeginDrag}
          onScrollEndDrag={onScrollEndDrag}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      </Box>
    );
  },
);

PredictGameDetailsOutcomesList.displayName = 'PredictGameDetailsOutcomesList';

export default PredictGameDetailsOutcomesList;
