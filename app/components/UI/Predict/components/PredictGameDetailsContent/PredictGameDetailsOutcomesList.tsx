import React, { memo, useCallback, useMemo, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { RefreshControl } from 'react-native';
import type { PredictMarketDetailsTabKey } from '../../Predict.testIds';
import type {
  PredictMarket,
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
  PredictPosition,
} from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { useTheme } from '../../../../../util/theme';
import PredictChipList from '../PredictChipList';
import PredictPicks from '../PredictPicks/PredictPicks';
import PredictMarketDetailsTabBar from '../../views/PredictMarketDetails/components/PredictMarketDetailsTabBar';
import PredictGameOutcomeCard, {
  type BuyHandler,
  type OutcomeCardModel,
} from './PredictGameOutcomeCard';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import { usePredictGameOutcomeRows } from './usePredictGameOutcomeRows';

interface StickyHeaderItem {
  kind: 'sticky-header';
  key: 'sticky-header';
}

interface PositionsItem {
  kind: 'positions';
  key: 'positions';
}

type DetailsListItem = StickyHeaderItem | PositionsItem | OutcomeCardModel;

const STICKY_HEADER_ITEM: StickyHeaderItem = {
  kind: 'sticky-header',
  key: 'sticky-header',
};

const POSITIONS_ITEM: PositionsItem = {
  kind: 'positions',
  key: 'positions',
};

const ESTIMATED_CARD_HEIGHT = 116;

interface PredictGameDetailsOutcomesListProps {
  market: PredictMarket;
  game: PredictMarketGame;
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
  chips: { key: string; label: string }[];
  onChipSelect: (key: string) => void;
  activePositions: PredictPosition[];
  claimablePositions: PredictPosition[];
  listHeaderComponent?: React.ReactElement;
}

const PredictGameDetailsOutcomesList = memo(
  ({
    market,
    game,
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
    const { cardModels, activeGroupTokenIds } =
      usePredictGameOutcomeRows(selectedGroup);
    const { getPrice } = useLiveMarketPrices(activeGroupTokenIds);
    const showStickyHeader = showTabBar || showChips;
    const currentTabKey = showTabBar ? tabs[activeTab]?.key : 'outcomes';
    const [selectedLineIndices, setSelectedLineIndices] = useState<
      Record<string, number>
    >({});

    const handleBuyPress = useCallback<BuyHandler>(
      (_outcome: PredictOutcome, token: PredictOutcomeToken) => {
        onBetPress(token);
      },
      [onBetPress],
    );

    const handleSelectedLineIndexChange = useCallback(
      (selectionKey: string, selectedIndex: number) => {
        setSelectedLineIndices((prev) =>
          prev[selectionKey] === selectedIndex
            ? prev
            : {
                ...prev,
                [selectionKey]: selectedIndex,
              },
        );
      },
      [],
    );

    const contentItems = useMemo<DetailsListItem[]>(
      () => (currentTabKey === 'positions' ? [POSITIONS_ITEM] : cardModels),
      [cardModels, currentTabKey],
    );

    const data = useMemo<DetailsListItem[]>(
      () =>
        showStickyHeader
          ? [STICKY_HEADER_ITEM, ...contentItems]
          : [...contentItems],
      [showStickyHeader, contentItems],
    );

    const renderItem = useCallback(
      ({ item }: { item: DetailsListItem }) => {
        if ('kind' in item && item.kind === 'sticky-header') {
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
        }

        if ('kind' in item && item.kind === 'positions') {
          return (
            <Box
              twClassName="px-4"
              testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.TAB_CONTENT}
            >
              <PredictPicks
                market={market}
                positions={activePositions}
                claimablePositions={claimablePositions}
                testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_PICK}
              />
            </Box>
          );
        }

        const selectionKey = `${activeChipKey}:${item.key}`;

        return (
          <Box twClassName="px-4">
            <PredictGameOutcomeCard
              cardModel={item}
              onBuyPress={handleBuyPress}
              game={game}
              getPrice={getPrice}
              selectedLineIndex={selectedLineIndices[selectionKey]}
              onSelectedLineIndexChange={(selectedIndex) =>
                handleSelectedLineIndexChange(selectionKey, selectedIndex)
              }
            />
          </Box>
        );
      },
      [
        showTabBar,
        tabs,
        activeTab,
        onTabPress,
        showChips,
        chips,
        activeChipKey,
        onChipSelect,
        market,
        activePositions,
        claimablePositions,
        handleBuyPress,
        selectedLineIndices,
        handleSelectedLineIndexChange,
        game,
        getPrice,
      ],
    );

    const keyExtractor = useCallback((item: DetailsListItem) => item.key, []);

    return (
      <Box
        testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}
        twClassName="flex-1"
      >
        <FlashList
          data={data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeaderComponent}
          stickyHeaderIndices={showStickyHeader ? [0] : undefined}
          contentContainerStyle={tw.style('pb-4')}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.default}
              colors={[colors.primary.default]}
            />
          }
        />
      </Box>
    );
  },
);

PredictGameDetailsOutcomesList.displayName = 'PredictGameDetailsOutcomesList';

export default PredictGameDetailsOutcomesList;
