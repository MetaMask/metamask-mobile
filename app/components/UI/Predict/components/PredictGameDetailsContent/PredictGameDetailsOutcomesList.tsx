import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { RefreshControl } from 'react-native';
import { FlashList, type ViewToken } from '@shopify/flash-list';
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
import PredictChipList from '../PredictChipList';
import PredictMarketDetailsTabBar from '../../views/PredictMarketDetails/components/PredictMarketDetailsTabBar';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import PredictPicks from '../PredictPicks/PredictPicks';
import PredictGameOutcomeCard, {
  type BuyHandler,
  type OutcomeCardModel,
} from './PredictGameOutcomeCard';
import { usePredictGameOutcomeRows } from './usePredictGameOutcomeRows';
import { useVisibleGameOutcomePricing } from './useVisibleGameOutcomePricing';

type GameDetailsListItem =
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
    };

const areSetsEqual = (left: Set<string>, right: Set<string>) => {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
};

interface PredictGameDetailsOutcomesListProps {
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
  chips: { key: string; label: string }[];
  onChipSelect: (key: string) => void;
  activePositions: PredictPosition[];
  claimablePositions: PredictPosition[];
  listHeaderComponent?: React.ReactElement;
}

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
    const showStickyHeader = showTabBar || showChips;
    const selectedGroup = groupMap.get(activeChipKey);
    const { cardModels } = usePredictGameOutcomeRows(selectedGroup);
    const [visibleCardKeys, setVisibleCardKeys] = useState<Set<string>>(
      () => new Set(),
    );
    const cardModelKeys = useMemo(
      () => new Set(cardModels.map((cardModel) => cardModel.key)),
      [cardModels],
    );
    const currentTabKey = showTabBar ? tabs[activeTab]?.key : 'outcomes';
    const hasPositions =
      activePositions.length > 0 || claimablePositions.length > 0;
    const showDisabledPositions = !enabled && hasPositions;
    const showPositions =
      showDisabledPositions || (enabled && currentTabKey === 'positions');
    const showOutcomes =
      enabled && currentTabKey === 'outcomes' && Boolean(selectedGroup);
    const {
      getTokenPrice,
      onSelectedLineIndexChange,
      selectedLineIndices,
      viewabilityConfig,
    } = useVisibleGameOutcomePricing({
      cardModels,
      visibleCardKeys,
    });

    useEffect(() => {
      setVisibleCardKeys((prevVisibleCardKeys) => {
        if (!showOutcomes) {
          return prevVisibleCardKeys.size === 0
            ? prevVisibleCardKeys
            : new Set();
        }

        const nextVisibleCardKeys = new Set(
          [...prevVisibleCardKeys].filter((cardKey) =>
            cardModelKeys.has(cardKey),
          ),
        );

        return areSetsEqual(prevVisibleCardKeys, nextVisibleCardKeys)
          ? prevVisibleCardKeys
          : nextVisibleCardKeys;
      });
    }, [cardModelKeys, showOutcomes]);

    const listData = useMemo<GameDetailsListItem[]>(() => {
      const items: GameDetailsListItem[] = [];

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
      }

      return items;
    }, [
      cardModels,
      listHeaderComponent,
      showDisabledPositions,
      showOutcomes,
      showPositions,
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

    const onViewableItemsChanged = useCallback(
      ({
        viewableItems,
      }: {
        viewableItems: ViewToken<GameDetailsListItem>[];
      }) => {
        const nextVisibleCardKeys = new Set(
          viewableItems
            .map((viewableItem) => viewableItem.item)
            .filter(
              (
                item,
              ): item is Extract<
                GameDetailsListItem,
                { type: 'outcome-card' }
              > => item?.type === 'outcome-card',
            )
            .map((item) => item.cardModel.key),
        );

        setVisibleCardKeys((prevVisibleCardKeys) =>
          areSetsEqual(prevVisibleCardKeys, nextVisibleCardKeys)
            ? prevVisibleCardKeys
            : nextVisibleCardKeys,
        );
      },
      [],
    );

    const renderItem = useCallback(
      ({ item }: { item: GameDetailsListItem }) => {
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
                  getTokenPrice={getTokenPrice}
                  selectedLineIndex={selectedLineIndices[item.cardModel.key]}
                  onSelectedLineIndexChange={(nextIndex) =>
                    onSelectedLineIndexChange(item.cardModel.key, nextIndex)
                  }
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
        getTokenPrice,
        handleBuyPress,
        market,
        onChipSelect,
        onSelectedLineIndexChange,
        onTabPress,
        selectedLineIndices,
        showChips,
        showTabBar,
        tabs,
      ],
    );

    return (
      <Box
        testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}
        twClassName="flex-1"
      >
        <FlashList
          data={listData}
          keyExtractor={(item) => item.key}
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
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      </Box>
    );
  },
);

PredictGameDetailsOutcomesList.displayName = 'PredictGameDetailsOutcomesList';

export default PredictGameDetailsOutcomesList;
