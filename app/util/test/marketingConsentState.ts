/**
 * AnalyticsController state holding a marketing consent decision, for test
 * Redux state (`engine.backgroundState.AnalyticsController`).
 *
 * @param consent - True or false for a decision, null for undecided.
 * @returns The AnalyticsController marketing consent fields.
 */
export const analyticsControllerWithMarketingConsent = (
  consent: boolean | null,
) => ({
  optedInToMarketing: consent === true,
  marketingConsentDecisionMade: consent !== null,
});

/**
 * Redux `engine` slice holding only a marketing consent decision.
 *
 * @param consent - True or false for a decision, null for undecided.
 * @returns An `engine` slice for test Redux state.
 */
export const engineWithMarketingConsent = (consent: boolean | null) => ({
  backgroundState: {
    AnalyticsController: analyticsControllerWithMarketingConsent(consent),
  },
});
