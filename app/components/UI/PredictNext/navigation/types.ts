import type { PredictEntityId, PredictVenueId } from '../types';
import type { FeedScreenId } from './feedScreens';

export interface PredictNextEventParams {
  venueId: PredictVenueId;
  eventId: PredictEntityId;
  titleSnapshot: string;
}

export type PredictPortfolioTab = 'positions' | 'activity';

export interface PredictNextPortfolioParams {
  venueId: PredictVenueId;
  initialTab?: PredictPortfolioTab;
}

export interface PredictNextFeedParams {
  venueId: PredictVenueId;
  feedScreenId: FeedScreenId;
  selectedTabId?: string;
}

export interface PredictNextSearchParams {
  venueId: PredictVenueId;
}

// ParamListBase requires a type alias.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictNextStackParamList = {
  PredictNextHome: undefined;
  PredictNextFeed: PredictNextFeedParams;
  PredictNextEvent: PredictNextEventParams;
  PredictNextPortfolio: PredictNextPortfolioParams;
  PredictNextSearch: PredictNextSearchParams;
};
