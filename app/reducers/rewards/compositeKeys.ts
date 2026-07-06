export type CampaignOutcomeToastVariant = 'winner' | 'non_winner';

/**
 * Composite key for subscription-scoped campaign data in the rewards Redux slice
 * (`subscriptionId:campaignId`).
 */
export function buildSubscriptionCampaignCompositeKey(
  subscriptionId: string,
  campaignId: string,
): string {
  return `${subscriptionId}:${campaignId}`;
}

/**
 * Composite key for dismissed campaign outcome toasts in the rewards Redux slice
 * (`campaignId:subscriptionId:variant`).
 */
export function buildCampaignOutcomeToastCompositeKey(
  campaignId: string,
  subscriptionId: string,
  variant: CampaignOutcomeToastVariant,
): string {
  return `${campaignId}:${subscriptionId}:${variant}`;
}
