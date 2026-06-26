/**
 * Component View tests for OptinMetrics analytics in onboarding flows.
 *
 * Mirrors (partial):
 * - tests/smoke/wallet/analytics/new-wallet.spec.ts
 * - tests/smoke/wallet/analytics/import-wallet.spec.ts
 * — OptinMetrics analytics preference (opt-in / opt-out).
 *
 * Run: yarn jest -c jest.config.view.js OptinMetrics.view.test.tsx --runInBand
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
import { MetaMetricsOptInSelectorsIDs } from './MetaMetricsOptIn.testIds';
import Routes from '../../../constants/navigation/Routes';
import OptinMetrics from './index';
import { AccountType } from '../../../constants/onboarding';

const ANALYTICS_PREFERENCE_SELECTED = 'Analytics Preference Selected';

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

function buildOnboardingState(
  accountType: AccountType,
  opts: { optedIn?: boolean } = {},
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
        accountType,
      },
    } as unknown as DeepPartial<RootState>)
    .build();
}

function renderOptinMetrics(
  accountType: AccountType,
  opts: { optedIn?: boolean } = {},
) {
  const state = buildOnboardingState(accountType, opts);
  return renderComponentViewScreen(
    OptinMetrics as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.OPTIN_METRICS },
    { state },
    {
      accountType,
      onContinue: jest.fn(),
    },
  );
}

function findAnalyticsPreferenceEvent(
  trackEventSpy: jest.SpyInstance,
): Record<string, unknown> | undefined {
  const calledEvents = trackEventSpy.mock.calls.map((c) => c[0]);
  return calledEvents.find(
    (e) =>
      typeof e === 'object' &&
      e !== null &&
      'name' in e &&
      (e as Record<string, unknown>).name === ANALYTICS_PREFERENCE_SELECTED,
  ) as Record<string, unknown> | undefined;
}

describeForPlatforms('OptinMetrics new-wallet analytics (CV)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches "Analytics Preference Selected" with is_metrics_opted_in=true when user confirms with metrics enabled', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
    try {
      const { getByTestId } = renderOptinMetrics(AccountType.Metamask, {
        optedIn: false,
      });

      fireEvent.press(
        getByTestId(
          MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID,
        ),
      );

      await waitFor(() => {
        const preferenceEvent = findAnalyticsPreferenceEvent(trackEventSpy);
        expect(preferenceEvent).toBeDefined();
        expect(preferenceEvent).toMatchObject({
          name: ANALYTICS_PREFERENCE_SELECTED,
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

  it('dispatches "Analytics Preference Selected" with is_metrics_opted_in=false when user unchecks the metrics checkbox', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
    try {
      const { getByTestId } = renderOptinMetrics(AccountType.Metamask, {
        optedIn: false,
      });

      fireEvent.press(
        getByTestId(
          MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_METRICS_CHECKBOX,
        ),
      );
      fireEvent.press(
        getByTestId(
          MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID,
        ),
      );

      await waitFor(() => {
        const preferenceEvent = findAnalyticsPreferenceEvent(trackEventSpy);
        expect(preferenceEvent).toBeDefined();
        expect(preferenceEvent).toMatchObject({
          name: ANALYTICS_PREFERENCE_SELECTED,
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

describeForPlatforms('OptinMetrics import-wallet analytics (CV)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches "Analytics Preference Selected" with is_metrics_opted_in=true when imported user confirms with metrics enabled', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
    try {
      const { getByTestId } = renderOptinMetrics(AccountType.Imported, {
        optedIn: false,
      });

      fireEvent.press(
        getByTestId(
          MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID,
        ),
      );

      await waitFor(() => {
        const preferenceEvent = findAnalyticsPreferenceEvent(trackEventSpy);
        expect(preferenceEvent).toBeDefined();
        expect(preferenceEvent).toMatchObject({
          name: ANALYTICS_PREFERENCE_SELECTED,
          properties: expect.objectContaining({
            is_metrics_opted_in: true,
            location: 'onboarding_metametrics',
            updated_after_onboarding: false,
            account_type: AccountType.Imported,
          }),
        });
      });
    } finally {
      trackEventSpy.mockRestore();
    }
  });

  it('dispatches "Analytics Preference Selected" with is_metrics_opted_in=false when imported user unchecks the metrics checkbox', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
    try {
      const { getByTestId } = renderOptinMetrics(AccountType.Imported, {
        optedIn: false,
      });

      fireEvent.press(
        getByTestId(
          MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_METRICS_CHECKBOX,
        ),
      );
      fireEvent.press(
        getByTestId(
          MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID,
        ),
      );

      await waitFor(() => {
        const preferenceEvent = findAnalyticsPreferenceEvent(trackEventSpy);
        expect(preferenceEvent).toBeDefined();
        expect(preferenceEvent).toMatchObject({
          name: ANALYTICS_PREFERENCE_SELECTED,
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
