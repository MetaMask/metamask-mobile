import { PredictOutcome } from '..';

export const sortMarketOutcomesByVolume = (outcomes: PredictOutcome[]) =>
  outcomes.sort((a, b) => b.volume - a.volume);
