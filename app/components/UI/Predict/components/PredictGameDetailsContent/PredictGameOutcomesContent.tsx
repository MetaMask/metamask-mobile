import React, { memo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { PredictMarketGame, PriceUpdate , PredictOutcome } from '../../types';
import PredictResolvedOutcomesSection from '../PredictResolvedOutcomesSection';
import PredictGameOutcomeCard, {
  type BuyHandler,
} from './PredictGameOutcomeCard';
import type { OutcomeCardModel } from './outcomeCardModel';

export interface PredictGameOutcomeCardItemProps {
  cardModel: OutcomeCardModel;
  onBuyPress: BuyHandler;
  game?: PredictMarketGame;
  getPrice: (tokenId: string) => PriceUpdate | undefined;
  selectedLineIndex?: number;
  onSelectedLineIndexChange?: (nextIndex: number) => void;
  twClassName?: string;
}

export const PredictGameOutcomeCardItem = memo(
  ({
    cardModel,
    onBuyPress,
    game,
    getPrice,
    selectedLineIndex,
    onSelectedLineIndexChange,
    twClassName,
  }: PredictGameOutcomeCardItemProps) => {
    const card = (
      <PredictGameOutcomeCard
        cardModel={cardModel}
        onBuyPress={onBuyPress}
        game={game}
        getPrice={getPrice}
        selectedLineIndex={selectedLineIndex}
        onSelectedLineIndexChange={onSelectedLineIndexChange}
      />
    );

    return twClassName ? <Box twClassName={twClassName}>{card}</Box> : card;
  },
);

PredictGameOutcomeCardItem.displayName = 'PredictGameOutcomeCardItem';

export interface PredictGameOutcomesContentProps {
  cardModels: OutcomeCardModel[];
  closedOutcomes: PredictOutcome[];
  showResolvedSection: boolean;
  onBuyPress: BuyHandler;
  game?: PredictMarketGame;
  getPrice: (tokenId: string) => PriceUpdate | undefined;
  isResolvedExpanded: boolean;
  onResolvedExpandedToggle: () => void;
  selectedLineIndices: Record<string, number | undefined>;
  onSelectedLineIndexChange: (cardKey: string, nextIndex: number) => void;
}

const PredictGameOutcomesContent = memo(
  ({
    cardModels,
    closedOutcomes,
    showResolvedSection,
    onBuyPress,
    game,
    getPrice,
    isResolvedExpanded,
    onResolvedExpandedToggle,
    selectedLineIndices,
    onSelectedLineIndexChange,
  }: PredictGameOutcomesContentProps) => (
    <>
      {cardModels.map((cardModel) => (
        <PredictGameOutcomeCardItem
          key={cardModel.key}
          cardModel={cardModel}
          onBuyPress={onBuyPress}
          game={game}
          getPrice={getPrice}
          selectedLineIndex={selectedLineIndices[cardModel.key]}
          onSelectedLineIndexChange={(nextIndex) =>
            onSelectedLineIndexChange(cardModel.key, nextIndex)
          }
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
  ),
);

PredictGameOutcomesContent.displayName = 'PredictGameOutcomesContent';

export default PredictGameOutcomesContent;
