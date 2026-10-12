import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 153: seed AnalyticsController marketing consent from the Redux
 * marketing preference when the controller has not stored a complete decision.
 *
 * Both marketing fields together are a stored decision and stay as they are.
 * If either field is missing, both are written from the preference. A null or
 * missing preference is an undecided marketing state.
 */
export const migrationVersion = 153;

function readMarketingPreference(
  security: Record<string, unknown>,
): boolean | null | undefined {
  if (!hasProperty(security, 'dataCollectionForMarketing')) {
    return undefined;
  }

  const value = security.dataCollectionForMarketing;
  if (value === true || value === false || value === null) {
    return value;
  }

  return undefined;
}

function seedMarketingConsent(
  controllerState: Record<string, unknown>,
  preference: boolean | null | undefined,
): Record<string, unknown> {
  const hasOptedIn = hasProperty(controllerState, 'optedInToMarketing');
  const hasDecision = hasProperty(
    controllerState,
    'marketingConsentDecisionMade',
  );
  // Marketing delivery follows optedInToMarketing. Both flags are one decision,
  // so a partial slice is rewritten from the Redux preference.
  if (hasOptedIn && hasDecision) {
    return controllerState;
  }

  const decided = preference === true || preference === false;

  return {
    ...controllerState,
    optedInToMarketing: preference === true,
    marketingConsentDecisionMade: decided,
  };
}

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const { backgroundState } = state.engine;
    const existingController =
      hasProperty(backgroundState, 'AnalyticsController') &&
      isObject(backgroundState.AnalyticsController)
        ? backgroundState.AnalyticsController
        : {};
    const nextController = seedMarketingConsent(
      existingController,
      readMarketingPreference(state.security),
    );

    if (nextController === existingController) {
      return state;
    }

    return {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: {
          ...backgroundState,
          AnalyticsController: nextController,
        },
      },
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to seed AnalyticsController marketing consent: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;
