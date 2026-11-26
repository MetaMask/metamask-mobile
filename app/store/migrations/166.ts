import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import { ensureValidState } from './util';

/**
 * Migration 166: carry an unsent marketing consent choice from the
 * `MarketingConsentController` preview builds into `AnalyticsController`.
 *
 * `MarketingConsentController` never shipped in a release. It held consent in
 * `AnalyticsController` and kept only the choice waiting to be written to
 * Authenticated User Storage in its own `pendingMarketingConsent`. The file is
 * not part of the persisted controller list anymore, so it is read directly.
 *
 * A pending `true` or `false` is written to the Analytics fields
 * `MarketingConsentSyncService` reads, so the service uploads the choice the
 * user already made. Consent stays decided, so no consent prompt reappears.
 * `null` means nothing was waiting and Analytics already holds the decision.
 * A pending value that disagrees with a decision already in Analytics is not
 * carried: the decision made there is newer than the preview build.
 *
 * The legacy file is left in place: the migration result is only durable once
 * the controller files are written after this runs. Removing it here would
 * lose the choice when that write fails and this migration runs again.
 */
export const migrationVersion = 166;

const LEGACY_STORAGE_KEY = 'persist:MarketingConsentController';

function report(message: string): void {
  captureException(new Error(`Migration ${migrationVersion}: ${message}`));
}

/**
 * Reads the pending consent left by a preview build.
 *
 * @param raw - The raw legacy controller state.
 * @returns The pending choice, or `null` when nothing was waiting.
 */
function readPendingConsent(raw: string): boolean | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    report(
      `Failed to parse legacy marketing consent: ${getErrorMessage(error)}`,
    );
    return null;
  }

  if (!isObject(parsed)) {
    report(`Invalid legacy marketing consent state: '${typeof parsed}'`);
    return null;
  }

  if (!hasProperty(parsed, 'pendingMarketingConsent')) {
    return null;
  }

  const pendingConsent = parsed.pendingMarketingConsent;
  if (typeof pendingConsent === 'boolean') {
    return pendingConsent;
  }

  if (pendingConsent !== null) {
    report(`Invalid pending marketing consent: '${typeof pendingConsent}'`);
  }
  return null;
}

/**
 * Writes the pending consent to the Analytics fields the sync service reads.
 *
 * Mirrors `AnalyticsController.applyRemoteMarketingConsent`: a local choice
 * still waiting to be saved wins over the pending value, and a pending value
 * that disagrees with a decision already made is ignored.
 *
 * @param state - The state to update.
 * @param pendingConsent - The choice waiting to be written to AUS.
 * @returns The updated state, or the state unchanged when it must not be
 * overridden.
 */
function carryPendingConsent(
  state: { engine: { backgroundState: Record<string, unknown> } },
  pendingConsent: boolean,
): unknown {
  const { backgroundState } = state.engine;
  const analyticsState =
    hasProperty(backgroundState, 'AnalyticsController') &&
    isObject(backgroundState.AnalyticsController)
      ? backgroundState.AnalyticsController
      : {};

  const hasUnsentLocalChoice =
    analyticsState.marketingConsentSyncPending === true;
  const madeDifferentDecision =
    analyticsState.marketingConsentDecisionMade === true &&
    analyticsState.optedInToMarketing !== pendingConsent;
  if (hasUnsentLocalChoice || madeDifferentDecision) {
    return state;
  }

  const adoptedState: Record<string, unknown> = {
    ...analyticsState,
    optedInToMarketing: pendingConsent,
    marketingConsentDecisionMade: true,
    marketingConsentSyncPending: true,
  };
  if (!pendingConsent) {
    // `AnalyticsController#optOutOfMarketing` clears the campaign cookie, so an
    // adopted opt-out clears it too.
    adoptedState.marketingCampaignCookieId = null;
  }

  return {
    ...state,
    engine: {
      ...state.engine,
      backgroundState: {
        ...backgroundState,
        AnalyticsController: adoptedState,
      },
    },
  };
}

const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  let raw: string | undefined;
  try {
    raw = await FilesystemStorage.getItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    // The choice is not carried over in this case: the consent value itself
    // already lives in `AnalyticsController`, and the legacy file is left in
    // place, so nothing else is lost.
    report(
      `Failed to read legacy marketing consent: ${getErrorMessage(error)}`,
    );
    return state;
  }

  if (!raw) {
    return state;
  }

  const pendingConsent = readPendingConsent(raw);
  if (pendingConsent === null) {
    return state;
  }

  return carryPendingConsent(state, pendingConsent);
};

export default migration;
