import type { PredictEvent } from '../../types';

const FOOTBALL_SPORT_ID = 'american-football';

/** NFL and college football Games. */
export const isFootballEvent = (event: PredictEvent): boolean =>
  event.sports?.sport.id === FOOTBALL_SPORT_ID;
