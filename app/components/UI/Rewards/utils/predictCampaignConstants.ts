import type { PredictCampaign } from '../../PredictNext';

/** Maximum winners for the predict the pitch campaign. */
export const PREDICT_THE_PITCH_CAMPAIGN_MAX_WINNERS = 20;

/**
 * Predict The Pitch as Predict knows it. Predict decides the campaign's Venue
 * and opens its actions only while that Venue is active.
 */
export const PREDICT_THE_PITCH_PREDICT_CAMPAIGN: PredictCampaign =
  'predict-the-pitch';
