import type { AnalyticsExpectations } from '../../../framework';
import Assertions from '../../../framework/Assertions';
import { filterEvents } from '../helpers';

const GEO_BLOCKED_TRIGGERED = 'Geo Blocked Triggered';

/**
 * Builds a geo-restriction analytics expectation that validates
 * the 'Geo Blocked Triggered' event contains the expected attempted_action.
 */
function buildGeoBlockedExpectations(
  expectedAction: string,
): AnalyticsExpectations {
  return {
    eventNames: [GEO_BLOCKED_TRIGGERED],
    events: [
      {
        name: GEO_BLOCKED_TRIGGERED,
        requiredDefinedPropertyKeys: ['country', 'attempted_action'],
      },
    ],
    validate: async ({ events }) => {
      const geoBlockedEvents = filterEvents(events, GEO_BLOCKED_TRIGGERED);
      const attemptedActions = geoBlockedEvents.map(
        (e) => e.properties.attempted_action,
      );
      const hasExpectedAction = attemptedActions.includes(expectedAction);

      if (!hasExpectedAction) {
        throw new Error(
          `Expected ${expectedAction} in geo-blocked events. Found: ${attemptedActions.join(', ')}`,
        );
      }
    },
  };
}

/**
 * Expected MetaMetrics payloads for geo-blocked predict actions (Yes/No from feeds).
 */
export const predictGeoBlockedFeedExpectations: AnalyticsExpectations =
  buildGeoBlockedExpectations('predict_action');

/**
 * Expected MetaMetrics payloads for geo-blocked cashout action.
 */
export const predictGeoBlockedCashoutExpectations: AnalyticsExpectations =
  buildGeoBlockedExpectations('cashout');

/**
 * Expected MetaMetrics payloads for geo-blocked deposit (add funds) action.
 */
export const predictGeoBlockedDepositExpectations: AnalyticsExpectations =
  buildGeoBlockedExpectations('deposit');
