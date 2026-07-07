import type { AnalyticsExpectations } from '../../../framework';

const GEO_BLOCKED_TRIGGERED = 'Geo Blocked Triggered';
const GEO_BLOCKED_ATTEMPTED_ACTIONS = [
  'predict_action',
  'cashout',
  'deposit',
] as const;

export const geoBlockedCombinedExpectations: AnalyticsExpectations = {
  eventNames: [GEO_BLOCKED_TRIGGERED],
  validate: async ({ events }) => {
    if (events.length < GEO_BLOCKED_ATTEMPTED_ACTIONS.length) {
      throw new Error(
        `Expected at least ${GEO_BLOCKED_ATTEMPTED_ACTIONS.length} ${GEO_BLOCKED_TRIGGERED} events, got ${events.length}`,
      );
    }

    const attemptedActions = new Set(
      events
        .map((event) => event.properties?.attempted_action)
        .filter((value): value is string => typeof value === 'string'),
    );

    for (const event of events) {
      if (!event.properties?.country) {
        throw new Error(
          `${GEO_BLOCKED_TRIGGERED} analytics is missing required "country" property`,
        );
      }
    }

    for (const expectedAction of GEO_BLOCKED_ATTEMPTED_ACTIONS) {
      if (!attemptedActions.has(expectedAction)) {
        throw new Error(
          `Missing ${GEO_BLOCKED_TRIGGERED} analytics for attempted_action="${expectedAction}"`,
        );
      }
    }
  },
};
