import React, { memo, useCallback, useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import PredictResolvedOutcomesSection from '../PredictResolvedOutcomesSection';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import PredictGameOutcomeCard, {
  type BuyHandler,
} from './PredictGameOutcomeCard';
import { usePredictGameGroupOutcomes } from './usePredictGameGroupOutcomes';

const OutcomesContent = memo(
  ({
    group,
    onBuyPress,
    game,
    isResolvedExpanded,
    onResolvedExpandedToggle,
  }: {
    group: PredictOutcomeGroup;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    isResolvedExpanded: boolean;
    onResolvedExpandedToggle: () => void;
  }) => {
    const {
      openCardModels,
      closedOutcomes,
      activeGroupTokenIds,
      showResolvedSection,
    } = usePredictGameGroupOutcomes({ group });
    const { getPrice } = useLiveMarketPrices(activeGroupTokenIds);

    return (
      <>
        {openCardModels.map((cardModel) => (
          <PredictGameOutcomeCard
            key={cardModel.key}
            cardModel={cardModel}
            onBuyPress={onBuyPress}
            game={game}
            getPrice={getPrice}
          />
        ))}
        {showResolvedSection && (
          <PredictResolvedOutcomesSection
            closedOutcomes={closedOutcomes}
            isExpanded={isResolvedExpanded}
            onToggle={onResolvedExpandedToggle}
          />
        )}
      </>
    );
  },
);

OutcomesContent.displayName = 'OutcomesContent';

export interface OutcomesTabProps {
  groupMap: Map<string, PredictOutcomeGroup>;
  game?: PredictMarketGame;
  activeChipKey: string;
  onBuyPress: (outcome: PredictOutcome, token: PredictOutcomeToken) => void;
}

const PredictGameOutcomesTab = memo(
  ({ groupMap, game, activeChipKey, onBuyPress }: OutcomesTabProps) => {
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

    return (
      <Box testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}>
        {selectedGroup && (
          <Box twClassName="px-4">
            <OutcomesContent
              group={selectedGroup}
              onBuyPress={onBuyPress}
              game={game}
              isResolvedExpanded={isResolvedExpanded}
              onResolvedExpandedToggle={toggleResolvedExpanded}
            />
          </Box>
        )}
      </Box>
    );
  },
);

PredictGameOutcomesTab.displayName = 'PredictGameOutcomesTab';

export default PredictGameOutcomesTab;
