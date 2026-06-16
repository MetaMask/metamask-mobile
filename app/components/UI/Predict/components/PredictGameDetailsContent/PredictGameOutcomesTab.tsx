import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
  PriceQuery,
  PriceUpdate,
} from '../../types';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import type { BuyHandler } from './PredictGameOutcomeCard';
import PredictGameOutcomesContent from './PredictGameOutcomesContent';
import { usePredictGameGroupOutcomes } from './usePredictGameGroupOutcomes';
import { resolveVisibleOutcomePriceQueries } from './usePredictVisibleOutcomes';

const OutcomesContent = memo(
  ({
    group,
    onBuyPress,
    game,
    getPrice,
    isResolvedExpanded,
    onResolvedExpandedToggle,
    onVisiblePriceQueriesChange,
  }: {
    group: PredictOutcomeGroup;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    getPrice: (tokenId: string) => PriceUpdate | undefined;
    isResolvedExpanded: boolean;
    onResolvedExpandedToggle: () => void;
    onVisiblePriceQueriesChange: (queries: PriceQuery[]) => void;
  }) => {
    const { openCardModels, closedOutcomes, showResolvedSection } =
      usePredictGameGroupOutcomes({ group });
    const [selectedLineIndices, setSelectedLineIndices] = useState<
      Record<string, number | undefined>
    >({});

    useEffect(() => {
      setSelectedLineIndices({});
    }, [group.key]);

    const visibleCardKeys = useMemo(
      () => new Set(openCardModels.map((cardModel) => cardModel.key)),
      [openCardModels],
    );
    const priceQueries = useMemo(
      () =>
        resolveVisibleOutcomePriceQueries({
          cardModels: openCardModels,
          selectedLineIndices,
          visibleCardKeys,
        }),
      [openCardModels, selectedLineIndices, visibleCardKeys],
    );

    useEffect(() => {
      onVisiblePriceQueriesChange(priceQueries);
    }, [onVisiblePriceQueriesChange, priceQueries]);

    useEffect(
      () => () => onVisiblePriceQueriesChange([]),
      [onVisiblePriceQueriesChange],
    );

    const handleSelectedLineIndexChange = useCallback(
      (cardKey: string, nextIndex: number) => {
        setSelectedLineIndices((previousSelectedLineIndices) =>
          previousSelectedLineIndices[cardKey] === nextIndex
            ? previousSelectedLineIndices
            : {
                ...previousSelectedLineIndices,
                [cardKey]: nextIndex,
              },
        );
      },
      [],
    );

    return (
      <PredictGameOutcomesContent
        cardModels={openCardModels}
        closedOutcomes={closedOutcomes}
        showResolvedSection={showResolvedSection}
        onBuyPress={onBuyPress}
        game={game}
        getPrice={getPrice}
        isResolvedExpanded={isResolvedExpanded}
        onResolvedExpandedToggle={onResolvedExpandedToggle}
        selectedLineIndices={selectedLineIndices}
        onSelectedLineIndexChange={handleSelectedLineIndexChange}
      />
    );
  },
);

OutcomesContent.displayName = 'OutcomesContent';

export interface OutcomesTabProps {
  groupMap: Map<string, PredictOutcomeGroup>;
  game?: PredictMarketGame;
  activeChipKey: string;
  getPrice: (tokenId: string) => PriceUpdate | undefined;
  onVisiblePriceQueriesChange: (queries: PriceQuery[]) => void;
  onBuyPress: (outcome: PredictOutcome, token: PredictOutcomeToken) => void;
}

const PredictGameOutcomesTab = memo(
  ({
    groupMap,
    game,
    activeChipKey,
    getPrice,
    onVisiblePriceQueriesChange,
    onBuyPress,
  }: OutcomesTabProps) => {
    const selectedGroup = groupMap.get(activeChipKey);
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

    useEffect(() => {
      if (!selectedGroup) {
        onVisiblePriceQueriesChange([]);
      }
    }, [onVisiblePriceQueriesChange, selectedGroup]);

    return (
      <Box testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}>
        {selectedGroup && (
          <Box twClassName="px-4">
            <OutcomesContent
              group={selectedGroup}
              onBuyPress={onBuyPress}
              game={game}
              getPrice={getPrice}
              isResolvedExpanded={isResolvedExpanded}
              onResolvedExpandedToggle={toggleResolvedExpanded}
              onVisiblePriceQueriesChange={onVisiblePriceQueriesChange}
            />
          </Box>
        )}
      </Box>
    );
  },
);

PredictGameOutcomesTab.displayName = 'PredictGameOutcomesTab';

export default PredictGameOutcomesTab;
