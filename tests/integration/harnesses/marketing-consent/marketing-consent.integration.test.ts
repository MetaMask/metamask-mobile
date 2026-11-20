/**
 * Integration test — marketing consent.
 *
 * Exercises the real client consent chain with only the network boundaries
 * mocked: the Redux security preference and the real `marketingAttribution`
 * saga, the real `AnalyticsController` consent state machine and its
 * `identify` / `trackEvent` consent gating, the social-login consent backfill
 * saga, and the seedless auth-server marketing opt-in sync via the real
 * `OAuthService`.
 */

import {
  analyticsControllerSelectors,
  type AnalyticsControllerState,
} from '@metamask/analytics-controller';

import { setDataCollectionForMarketing } from '../../../../app/actions/security';
import { logIn } from '../../../../app/actions/user';
import { setPendingSocialLoginMarketingConsentBackfill } from '../../../../app/actions/onboarding';
import { saveAttribution } from '../../../../app/core/redux/slices/attribution';
import { AuthConnection } from '../../../../app/core/OAuthService/OAuthInterface';
import { MetaMetricsEvents } from '../../../../app/core/Analytics';
import { AnalyticsEventBuilder } from '../../../../app/util/analytics/AnalyticsEventBuilder';
import { UserProfileProperty } from '../../../../app/util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import {
  buildMarketingConsentHarness,
  AUTH_SERVER_MARKETING_OPT_IN_URL,
  HARNESS_ANALYTICS_ID,
  HARNESS_SEEDLESS_ACCESS_TOKEN,
  type MarketingConsentHarness,
} from './marketing-consent';

const hasMarketingConsentTrait = {
  [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
};

function controllerConsent(harness: MarketingConsentHarness) {
  const state = harness.analyticsController.state;
  return {
    optedInToMarketing:
      analyticsControllerSelectors.selectOptedInToMarketing(state),
    decisionMade:
      analyticsControllerSelectors.selectMarketingConsentDecisionMade(state),
    optedIn: analyticsControllerSelectors.selectOptedIn(state),
  };
}

async function waitForControllerConsent(
  harness: MarketingConsentHarness,
  expected: { optedInToMarketing?: boolean; decisionMade?: boolean },
) {
  await harness.waitFor(() => {
    const consent = controllerConsent(harness);
    return (
      (expected.optedInToMarketing === undefined ||
        consent.optedInToMarketing === expected.optedInToMarketing) &&
      (expected.decisionMade === undefined ||
        consent.decisionMade === expected.decisionMade)
    );
  });
}

describe('Marketing consent — integration', () => {
  describe('consent persistence (security slice ↔ AnalyticsController)', () => {
    it('persists a marketing opt-in on both surfaces through the production saga wiring', async () => {
      // Arrange
      const harness = await buildMarketingConsentHarness();

      // Act
      harness.store.dispatch(setDataCollectionForMarketing(true));

      // Assert
      await waitForControllerConsent(harness, {
        optedInToMarketing: true,
        decisionMade: true,
      });
      expect(controllerConsent(harness)).toEqual({
        optedInToMarketing: true,
        decisionMade: true,
        optedIn: false,
      });
      expect(harness.store.getState().security.dataCollectionForMarketing).toBe(
        true,
      );
      expect(
        (
          harness.store.getState().engine.backgroundState
            .AnalyticsController as AnalyticsControllerState
        ).optedInToMarketing,
      ).toBe(true);
    });

    it('persists a marketing opt-out on both surfaces and clears attribution', async () => {
      // Arrange
      const harness = await buildMarketingConsentHarness();
      harness.store.dispatch(
        saveAttribution({ utm_source: 'test-campaign', utm_medium: 'cpc' }),
      );
      harness.store.dispatch(setDataCollectionForMarketing(true));
      await waitForControllerConsent(harness, { optedInToMarketing: true });
      expect(harness.store.getState().attribution.attribution).not.toBeNull();

      // Act
      harness.store.dispatch(setDataCollectionForMarketing(false));
      await waitForControllerConsent(harness, {
        optedInToMarketing: false,
        decisionMade: true,
      });

      // Assert
      expect(controllerConsent(harness)).toEqual({
        optedInToMarketing: false,
        decisionMade: true,
        optedIn: false,
      });
      expect(harness.store.getState().security.dataCollectionForMarketing).toBe(
        false,
      );
      expect(harness.store.getState().attribution.attribution).toBeNull();
    });
  });

  describe('has_marketing_consent trait — the AND rule', () => {
    it('suppresses the consent trait while MetaMetrics is opted out and delivers it once MetaMetrics is on', async () => {
      // Arrange
      const harness = await buildMarketingConsentHarness();
      harness.store.dispatch(setDataCollectionForMarketing(true));
      await waitForControllerConsent(harness, { optedInToMarketing: true });

      // Act — consent granted, MetaMetrics still opted out
      harness.analytics.identify(hasMarketingConsentTrait);
      // The consent op queued behind the identify settles the FIFO queue,
      // so its completion proves the identify was processed and dropped.
      await harness.analytics.resetMarketingConsentDecision();

      // Assert — the trait never reached the platform adapter
      expect(harness.mocks.platformAdapter.identify).not.toHaveBeenCalled();

      // Act — opt into MetaMetrics and repeat the identify
      await harness.analytics.optIn();
      harness.analytics.identify(hasMarketingConsentTrait);
      await harness.waitFor(
        () => harness.mocks.platformAdapter.identify.mock.calls.length > 0,
      );

      // Assert — the trait flows with the analytics identity and consent context
      const [userId, traits, context] =
        harness.mocks.platformAdapter.identify.mock.calls[0];
      expect(userId).toBe(HARNESS_ANALYTICS_ID);
      expect(traits).toEqual(hasMarketingConsentTrait);
      expect(context).toEqual(
        expect.objectContaining({
          consent: expect.objectContaining({
            categoryPreferences: expect.objectContaining({ product: true }),
          }),
        }),
      );
    });
  });

  describe('social-login consent backfill saga', () => {
    it('skips the consent identify while MetaMetrics is opted out and still clears the pending backfill', async () => {
      // Arrange
      const harness = await buildMarketingConsentHarness();
      // The preference is recorded without a controller copy so the backfill
      // saga runs against MetaMetrics still opted out.
      harness.store.dispatch(
        setDataCollectionForMarketing(true, { skipControllerSync: true }),
      );
      harness.store.dispatch(
        setPendingSocialLoginMarketingConsentBackfill(AuthConnection.Google),
      );

      // Act
      harness.startBackfillSaga();
      harness.store.dispatch(logIn());

      // Assert — the backfill settles, the controller copy re-runs (queued
      // behind anything the saga queued), and no consent payload was emitted
      await harness.waitFor(() =>
        analyticsControllerSelectors.selectMarketingConsentDecisionMade(
          harness.analyticsController.state,
        ),
      );
      expect(
        harness.store.getState().onboarding
          .pendingSocialLoginMarketingConsentBackfill,
      ).toBeNull();
      expect(harness.mocks.platformAdapter.identify).not.toHaveBeenCalled();
      expect(harness.mocks.platformAdapter.track).not.toHaveBeenCalled();
    });

    it('backfills the consent trait and preference event through the real chain while MetaMetrics is on', async () => {
      // Arrange
      const harness = await buildMarketingConsentHarness();
      await harness.analytics.optIn();
      harness.store.dispatch(
        setDataCollectionForMarketing(true, { skipControllerSync: true }),
      );
      harness.store.dispatch(
        setPendingSocialLoginMarketingConsentBackfill(AuthConnection.Google),
      );

      // Act
      harness.startBackfillSaga();
      harness.store.dispatch(logIn());

      // Assert
      await harness.waitFor(
        () => harness.mocks.platformAdapter.identify.mock.calls.length > 0,
      );
      expect(harness.mocks.platformAdapter.identify).toHaveBeenCalledWith(
        HARNESS_ANALYTICS_ID,
        hasMarketingConsentTrait,
        expect.anything(),
      );
      const trackCalls = harness.mocks.platformAdapter.track.mock.calls;
      const preferenceEvent = trackCalls.find(
        ([eventName]) =>
          eventName ===
          MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
      );
      expect(preferenceEvent?.[1]).toEqual(
        expect.objectContaining({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
          is_metrics_opted_in: true,
          location: 'saga_backfill_marketing_consent',
          account_type: 'metamask_google',
        }),
      );
      await harness.waitFor(
        () =>
          harness.store.getState().onboarding
            .pendingSocialLoginMarketingConsentBackfill === null,
      );
    });
  });

  describe('remote consent sync (seedless auth server)', () => {
    it('writes the opt-in decision to the auth server with the seedless access token', async () => {
      // Arrange
      const harness = await buildMarketingConsentHarness();

      // Act
      await harness.oauthService.updateMarketingOptInStatus(true);

      // Assert
      expect(harness.mocks.getAccessToken).toHaveBeenCalledTimes(1);
      const calls = harness.marketingOptInCalls();
      expect(calls).toHaveLength(1);
      const remoteCall = calls[0];
      expect(remoteCall.url).toBe(AUTH_SERVER_MARKETING_OPT_IN_URL);
      expect(remoteCall.method).toBe('POST');
      expect(remoteCall.headers).toEqual(
        expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HARNESS_SEEDLESS_ACCESS_TOKEN}`,
        }),
      );
      expect(JSON.parse(remoteCall.body)).toEqual({ opt_in_status: true });
    });

    it('keeps local consent intact when the auth-server write fails (8.18.1 desync scenario)', async () => {
      // Arrange
      const harness = await buildMarketingConsentHarness();
      harness.store.dispatch(setDataCollectionForMarketing(false));
      await waitForControllerConsent(harness, {
        optedInToMarketing: false,
        decisionMade: true,
      });
      harness.setAuthServerResponse({ postStatus: 500 });

      // Act — the remote opt-out write fails; production callers catch this
      await expect(
        harness.oauthService.updateMarketingOptInStatus(false),
      ).rejects.toThrow('Failed to update marketing opt-in status: 500');

      // Assert — local state must not diverge from the local decision
      expect(controllerConsent(harness)).toEqual({
        optedInToMarketing: false,
        decisionMade: true,
        optedIn: false,
      });
      expect(harness.store.getState().security.dataCollectionForMarketing).toBe(
        false,
      );

      // The auth server still holds the stale pre-failure preference; the
      // local decision stays authoritative and is not overwritten by it.
      harness.setAuthServerResponse({ getJson: { is_opt_in: true } });
      const remoteRead = await harness.oauthService.getMarketingOptInStatus();
      expect(remoteRead).toEqual({ is_opt_in: true });
      expect(controllerConsent(harness).optedInToMarketing).toBe(false);
      expect(harness.store.getState().security.dataCollectionForMarketing).toBe(
        false,
      );
    });
  });

  describe('restart rehydration', () => {
    it('rehydrates consent from persisted state and still applies the AND rule', async () => {
      // Arrange — previous session: marketing consent + MetaMetrics opted in
      const previousSession = await buildMarketingConsentHarness();
      previousSession.store.dispatch(setDataCollectionForMarketing(true));
      await previousSession.analytics.optIn();
      await waitForControllerConsent(previousSession, {
        optedInToMarketing: true,
      });
      const persistedControllerState: Partial<AnalyticsControllerState> =
        previousSession.analyticsController.state;
      const persistedSecurityState = previousSession.store.getState().security;

      // Act — restart with the persisted slices
      const harness = await buildMarketingConsentHarness({
        persistedControllerState,
        persistedSecurityState,
      });

      // Assert — both surfaces rehydrate the consent decision
      expect(controllerConsent(harness)).toEqual({
        optedInToMarketing: true,
        decisionMade: true,
        optedIn: true,
      });
      expect(harness.store.getState().security.dataCollectionForMarketing).toBe(
        true,
      );

      // The rehydrated consent still drives delivery under the AND rule
      harness.analytics.identify(hasMarketingConsentTrait);
      await harness.waitFor(
        () => harness.mocks.platformAdapter.identify.mock.calls.length > 0,
      );
      const [, traits] = harness.mocks.platformAdapter.identify.mock.calls[0];
      expect(traits).toEqual(hasMarketingConsentTrait);
    });
  });
});
