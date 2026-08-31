import type { PredictEntityId, PredictVenueId } from '../types';
import type { PredictEntryPoint } from '../../Predict/types/navigation';
import type { FeedScreenId } from './feedScreens';

export interface PredictNextHomeParams {
  entryPoint?: PredictEntryPoint;
}

export interface PredictNextEventDetailParams {
  venueId: PredictVenueId;
  eventId: PredictEntityId;
  title: string;
}

export interface PredictNextFeedParams {
  venueId: PredictVenueId;
  feedScreenId: FeedScreenId;
  selectedTabId?: string;
}

// ParamListBase requires a type alias.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictNextStackParamList = {
  PredictNextHome: PredictNextHomeParams | undefined;
  PredictNextFeed: PredictNextFeedParams;
  PredictNextEventDetail: PredictNextEventDetailParams;
};
