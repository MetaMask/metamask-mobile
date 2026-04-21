import {
  analyticsControllerSelectors,
  type AnalyticsControllerState,
} from '@metamask/analytics-controller';
import type { Engine as TypedEngine } from '../../core/Engine/Engine';
import { AGREED, DENIED, SENTRY_CONSENT } from '../../constants/storage';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../Logger';
import {
  discardBufferedTraces,
  flushBufferedTraces,
  updateCachedConsent,
} from '../trace';
import { setupSentry } from './utils';

/**
 * Fan out a single source of truth — `AnalyticsController.state.optedIn` —
 * to every consumer that needs to know about Sentry/metrics consent:
 * 1. The {@link SENTRY_CONSENT} AsyncStorage key, read by `setupSentry` in
 * `index.js` at the very next cold boot (before Redux rehydration).
 * 2. The live Sentry client, re-initialised via {@link setupSentry} so the
 * current session reflects the new consent without requiring a restart.
 * 3. The in-memory trace consent cache, used by `trace()` to decide whether
 * to forward spans to Sentry or buffer them.
 * 4. The buffered trace queue, flushed on opt-in and discarded on opt-out.
 *
 * The helper performs one initial sync using the controller's current state
 * (to backfill storage for users whose consent was captured before this key
 * existed) and then subscribes to `AnalyticsController:stateChange` so every
 * subsequent toggle — onboarding, settings, social login — is handled in one
 * place instead of being re-implemented at each call site.
 */
export async function subscribeSentryToAnalyticsConsent(
  engine: TypedEngine,
): Promise<void> {
  const getOptedIn = (): boolean => {
    try {
      const state = engine.context?.AnalyticsController?.state;
      return state
        ? Boolean(analyticsControllerSelectors.selectOptedIn(state))
        : false;
    } catch (error) {
      Logger.error(
        error as Error,
        'SentryConsentSync: failed to read AnalyticsController state',
      );
      return false;
    }
  };

  await applyConsent(getOptedIn());

  const onAnalyticsStateChange = (state: AnalyticsControllerState): void => {
    const optedIn = Boolean(analyticsControllerSelectors.selectOptedIn(state));
    applyConsent(optedIn).catch((error) => {
      Logger.error(
        error as Error,
        'SentryConsentSync: failed to apply consent change',
      );
    });
  };

  // The `controllerMessenger.subscribe` overloads in this codebase do not
  // narrow on the event type string, so cast via `unknown` to match the
  // existing pattern used throughout Engine.ts / EngineService.ts.
  (
    engine.controllerMessenger.subscribe as unknown as (
      eventType: 'AnalyticsController:stateChange',
      handler: (state: AnalyticsControllerState) => void,
    ) => void
  )('AnalyticsController:stateChange', onAnalyticsStateChange);
}

async function applyConsent(optedIn: boolean): Promise<void> {
  updateCachedConsent(optedIn);

  try {
    await StorageWrapper.setItem(SENTRY_CONSENT, optedIn ? AGREED : DENIED);
  } catch (error) {
    Logger.error(
      error as Error,
      'SentryConsentSync: failed to persist consent to storage',
    );
  }

  try {
    await setupSentry();
  } catch (error) {
    Logger.error(
      error as Error,
      'SentryConsentSync: failed to re-initialise Sentry',
    );
  }

  if (optedIn) {
    try {
      await flushBufferedTraces();
    } catch (error) {
      Logger.error(
        error as Error,
        'SentryConsentSync: failed to flush buffered traces',
      );
    }
  } else {
    discardBufferedTraces();
  }
}
