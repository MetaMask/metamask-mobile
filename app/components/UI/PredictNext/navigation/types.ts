import type { PredictEntityId, PredictVenueId } from '../types';

export interface PredictNextEventDetailParams {
  venueId: PredictVenueId;
  eventId: PredictEntityId;
  title: string;
}

// ParamListBase requires a type alias.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictNextStackParamList = {
  PredictNextHome: undefined;
  PredictNextEventDetail: PredictNextEventDetailParams;
};
