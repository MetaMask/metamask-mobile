import React, { memo, useCallback } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { FlashList } from '@shopify/flash-list';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import PredictGameOutcomeCard, {
  type BuyHandler,
} from './PredictGameOutcomeCard';
import { usePredictGameOutcomeRows } from './usePredictGameOutcomeRows';
import { useVisibleGameOutcomePricing } from './useVisibleGameOutcomePricing';

export interface OutcomesTabProps {
  groupMap: Map<string, PredictOutcomeGroup>;
  game?: PredictMarketGame;
  activeChipKey: string;
  onBuyPress: (outcome: PredictOutcome, token: PredictOutcomeToken) => void;
}

const PredictGameOutcomesTab = memo(
  ({ groupMap, game, activeChipKey, onBuyPress }: OutcomesTabProps) => {
    const selectedGroup = groupMap.get(activeChipKey);
    const { cardModels } = usePredictGameOutcomeRows(selectedGroup);
    const {
      getTokenPrice,
      onSelectedLineIndexChange,
      onViewableItemsChanged,
      selectedLineIndices,
      viewabilityConfig,
    } = useVisibleGameOutcomePricing({
      cardModels,
    });

    const renderItem = useCallback(
      ({ item }: { item: (typeof cardModels)[number] }) => (
        <PredictGameOutcomeCard
          cardModel={item}
          onBuyPress={onBuyPress as BuyHandler}
          game={game}
          getTokenPrice={getTokenPrice}
          selectedLineIndex={selectedLineIndices[item.key]}
          onSelectedLineIndexChange={(nextIndex) =>
            onSelectedLineIndexChange(item.key, nextIndex)
          }
        />
      ),
      [
        game,
        getTokenPrice,
        onSelectedLineIndexChange,
        onBuyPress,
        selectedLineIndices,
      ],
    );

    return (
      <Box testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}>
        {selectedGroup && (
          <Box twClassName="px-4">
            <FlashList
              data={cardModels}
              keyExtractor={(item) => item.key}
              renderItem={renderItem}
              scrollEnabled={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
            />
          </Box>
        )}
      </Box>
    );
  },
);

PredictGameOutcomesTab.displayName = 'PredictGameOutcomesTab';

export default PredictGameOutcomesTab;
