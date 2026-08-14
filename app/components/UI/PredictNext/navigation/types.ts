import type { PredictEntityId, PredictVenueId } from '../types';
import type { PredictEntryPoint } from '../../Predict/types/navigation';

export interface PredictNextHomeParams {
  entryPoint?: PredictEntryPoint;
}

export interface PredictNextEventDetailParams {
  venueId: PredictVenueId;
  eventId: PredictEntityId;
  title: string;
}

// ParamListBase requires a type alias.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictNextStackParamList = {
  PredictNextHome: PredictNextHomeParams | undefined;
  PredictNextEventDetail: PredictNextEventDetailParams;
};
