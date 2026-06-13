import { useMemo } from 'react';
import type { PredictOutcomeGroup } from '../../types';
import {
  buildOutcomeCardModels,
  collectCardModelTokenIds,
} from './outcomeCardModel';

export {
  buildOutcomeCardModels,
  formatOutcomeCardTitle,
  getSportsMarketTypeLabel,
  resolveCardPricing,
} from './outcomeCardModel';

export const usePredictGameOutcomeRows = (group?: PredictOutcomeGroup) => {
  const cardModels = useMemo(
    () => (group ? buildOutcomeCardModels(group) : []),
    [group],
  );
  const activeGroupTokenIds = useMemo(
    () => collectCardModelTokenIds(cardModels),
    [cardModels],
  );

  return {
    activeGroupTokenIds,
    cardModels,
  };
};
