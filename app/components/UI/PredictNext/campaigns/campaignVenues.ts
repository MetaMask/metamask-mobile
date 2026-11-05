/**
 * The Venue each Rewards campaign runs on. Predict owns this table, so a
 * campaign's caller names the campaign and never a Venue. A campaign's
 * identifiers belong to its Venue: Predict opens them only while that Venue is
 * the Active Venue, and never on another one.
 *
 * Every campaign runs on Polymarket today. A campaign on another Venue needs
 * `createPredictCampaignEventRef` to mint for that Venue first, so the table
 * accepts Polymarket only until it does.
 */
const PREDICT_CAMPAIGN_VENUES = {
  'predict-the-pitch': 'polymarket',
} as const satisfies Record<string, 'polymarket'>;

/** A Rewards campaign that opens Predict. */
export type PredictCampaign = keyof typeof PREDICT_CAMPAIGN_VENUES;

/** The Venue a campaign runs on. */
export type PredictCampaignVenue =
  (typeof PREDICT_CAMPAIGN_VENUES)[PredictCampaign];

/** Internal to Predict: callers never read a campaign's Venue. */
export const getPredictCampaignVenue = (
  campaign: PredictCampaign,
): PredictCampaignVenue => PREDICT_CAMPAIGN_VENUES[campaign];
