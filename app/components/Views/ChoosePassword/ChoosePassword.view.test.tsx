/**
 * Component View tests for analytics events in the new-wallet onboarding flow.
 *
 * Mirrors (partial): tests/smoke/wallet/analytics/new-wallet.spec.ts
 * — OptinMetrics analytics preference (opt-in / opt-out).
 *
 * Run: yarn jest -c jest.config.view.js ChoosePassword.view.test.tsx --runInBand
 */
import '../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { renderComponentViewScreen } from '../../../../tests/component-view/render';
import { createStateFixture } from '../../../../tests/component-view/stateFixture';
import type { DeepPartial } from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import { analytics } from '../../../util/analytics/analytics';
import { MetaMetricsOptInSelectorsIDs } from '../../UI/OptinMetrics/MetaMetricsOptIn.testIds';
import Routes from '../../../constants/navigation/Routes';
import OptinMetrics from '../../UI/OptinMetrics';
import { AccountType } from '../../../constants/onboarding';

// ---------------------------------------------------------------------------
// Make InteractionManager.runAfterInteractions synchronous so trackOnboarding
// fires analytics.trackEvent immediately inside the test's act/waitFor boundary.
// ---------------------------------------------------------------------------
beforeAll(() => {
  jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation(
    jest.fn().mockImplementation((callback) => {
      if (typeof callback === 'function') {
        callback();
      }
      return {
        then: (onfulfilled?: () => void) => Promise.resolve(onfulfilled?.()),
        done: (onfulfilled?: () => void, onrejected?: () => void) =>
          Promise.resolve().then(onfulfilled, onrejected),
        cancel: jest.fn(),
      };
    }),
  );
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// State builder
// ---------------------------------------------------------------------------
function buildOnboardingState(
  opts: {
    optedIn?: boolean;
  } = {},
): DeepPartial<RootState> {
  return createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalAnalyticsController({ optedIn: opts.optedIn ?? false })
    .withRemoteFeatureFlags({})
    .withOverrides({
      settings: { basicFunctionalityEnabled: true },
      user: { seedphraseBackedUp: false },
      onboarding: {
        events: [],
        accountType: AccountType.Metamask,
      },
    } as unknown as DeepPartial<RootState>)
    .build();
}

function renderOptinMetricsForNewWallet(opts: { optedIn?: boolean } = {}) {
  const state = buildOnboardingState(opts);
  return renderComponentViewScreen(
    OptinMetrics as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.OPTIN_METRICS },
    { state },
    {
      accountType: AccountType.Metamask,
      // Provide a no-op onContinue so navigation.reset doesn't crash
      onContinue: jest.fn(),
    },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describeForPlatforms('new-wallet analytics (CV)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // CV-testable: OptinMetrics fires ANALYTICS_PREFERENCE_SELECTED (opt in)
  // -----------------------------------------------------------------------
  it('OptinMetrics dispatches "Analytics Preference Selected" with is_metrics_opted_in=true when user confirms with metrics enabled', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
    try {
      const { getByTestId } = renderOptinMetricsForNewWallet({
        optedIn: false,
      });

      const continueButton = getByTestId(
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID,
      );
      fireEvent.press(continueButton);

      await waitFor(() => {
        const calledEvents = trackEventSpy.mock.calls.map((c) => c[0]);
        const preferenceEvent = calledEvents.find(
          (e) =>
            typeof e === 'object' &&
            e !== null &&
            'name' in e &&
            (e as unknown as Record<string, unknown>).name ===
              'Analytics Preference Selected',
        );
        expect(preferenceEvent).toBeDefined();
        expect(preferenceEvent).toMatchObject({
          name: 'Analytics Preference Selected',
          properties: expect.objectContaining({
            is_metrics_opted_in: true,
            location: 'onboarding_metametrics',
            updated_after_onboarding: false,
            account_type: AccountType.Metamask,
          }),
        });
      });
    } finally {
      trackEventSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // CV-testable: OptinMetrics fires ANALYTICS_PREFERENCE_SELECTED (opt out)
  // -----------------------------------------------------------------------
  it('OptinMetrics dispatches "Analytics Preference Selected" with is_metrics_opted_in=false when user unchecks the metrics checkbox', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
    try {
      const { getByTestId } = renderOptinMetricsForNewWallet({
        optedIn: false,
      });

      // The metrics checkbox starts checked; uncheck it
      // TODO: add testId OPTIN_METRICS_METRICS_CHECKBOX to the <Checkbox> in OptinMetrics
      // if it does not exist. The selector currently points to a pressable element.
      const metricsCheckbox = getByTestId(
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_METRICS_CHECKBOX,
      );
      fireEvent.press(metricsCheckbox);

      const continueButton = getByTestId(
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID,
      );
      fireEvent.press(continueButton);

      await waitFor(() => {
        const calledEvents = trackEventSpy.mock.calls.map((c) => c[0]);
        const preferenceEvent = calledEvents.find(
          (e) =>
            typeof e === 'object' &&
            e !== null &&
            'name' in e &&
            (e as unknown as Record<string, unknown>).name ===
              'Analytics Preference Selected',
        );
        expect(preferenceEvent).toBeDefined();
        expect(preferenceEvent).toMatchObject({
          name: 'Analytics Preference Selected',
          properties: expect.objectContaining({
            is_metrics_opted_in: false,
            location: 'onboarding_metametrics',
            updated_after_onboarding: false,
          }),
        });
      });
    } finally {
      trackEventSpy.mockRestore();
    }
  });
});
