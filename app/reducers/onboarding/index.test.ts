import onboardingReducer, { initialOnboardingState } from '.';
import {
  CLEAR_EVENTS,
  CLEAR_ONBOARDING,
  SAVE_EVENT,
  SET_COMPLETED_ONBOARDING,
  SET_ACCOUNT_TYPE,
  CLEAR_ACCOUNT_TYPE,
  SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL,
  SET_SEEDLESS_ONBOARDING,
  CLEAR_SEEDLESS_ONBOARDING,
} from '../../actions/onboarding';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';
import { AccountType } from '../../constants/onboarding';
import { AuthConnection } from '../../core/OAuthService/OAuthInterface';

describe('onboardingReducer', () => {
  const initialState = {
    events: [],
    completedOnboarding: false,
    pendingSocialLoginMarketingConsentBackfill: null as string | null,
    iosGoogleWarningSheetLastDismissedAt: null as number | null,
  };

  it('returns the initial state when no action is provided', () => {
    const state = onboardingReducer(undefined, { type: null } as never);
    expect(state).toEqual(initialOnboardingState);
  });

  it('handles the SAVE_EVENT action', () => {
    const mockEvent = [{ name: 'test_event' }] as [ITrackingEvent];
    const action = { type: SAVE_EVENT, event: mockEvent } as const;
    const state = onboardingReducer(initialState, action);
    expect(state.events).toEqual([mockEvent]);
  });

  it('handles the CLEAR_EVENTS action', () => {
    const stateWithEvents = {
      ...initialState,
      events: [[{ name: 'test_event' }] as [ITrackingEvent]],
    };
    const action = { type: CLEAR_EVENTS } as const;
    const state = onboardingReducer(stateWithEvents, action);
    expect(state.events).toEqual([]);
  });

  it('handle the SET_COMPLETED_ONBOARDING action', () => {
    const action = {
      type: SET_COMPLETED_ONBOARDING,
      completedOnboarding: true,
    } as const;
    const state = onboardingReducer(initialState, action);
    expect(state.completedOnboarding).toBe(true);
  });

  it('handles the SET_ACCOUNT_TYPE action', () => {
    const onboardingVersion = '7.0.0 (1234)';

    const action = {
      type: SET_ACCOUNT_TYPE,
      accountType: AccountType.MetamaskGoogle,
      onboardingVersion,
    } as const;

    const state = onboardingReducer(initialState, action);

    expect(state.accountType).toBe(AccountType.MetamaskGoogle);
    expect(state.onboardingVersion).toBe(onboardingVersion);
  });

  it('handles the CLEAR_ACCOUNT_TYPE action', () => {
    const onboardingVersion = '7.0.0 (1234)';

    const stateWithAccountType = {
      ...initialState,
      accountType: AccountType.MetamaskGoogle,
      onboardingVersion,
    };

    const action = { type: CLEAR_ACCOUNT_TYPE } as const;
    const state = onboardingReducer(stateWithAccountType, action);

    expect(state.accountType).toBeUndefined();
    expect(state.onboardingVersion).toBeUndefined();
  });

  it('handles the SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL action', () => {
    const action = {
      type: SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL,
      authConnection: 'google',
    } as const;
    const state = onboardingReducer(initialState, action);
    expect(state.pendingSocialLoginMarketingConsentBackfill).toBe('google');
  });

  it('handles clearing pending social login marketing consent backfill', () => {
    const stateWithMarker = {
      ...initialState,
      pendingSocialLoginMarketingConsentBackfill: 'google',
    };
    const action = {
      type: SET_PENDING_SOCIAL_LOGIN_MARKETING_CONSENT_BACKFILL,
      authConnection: null,
    } as const;
    const state = onboardingReducer(stateWithMarker, action);
    expect(state.pendingSocialLoginMarketingConsentBackfill).toBeNull();
  });

  it('handles the SET_SEEDLESS_ONBOARDING action', () => {
    const action = {
      type: SET_SEEDLESS_ONBOARDING,
      clientId: 'persisted-google-client-id',
      authConnection: AuthConnection.Google,
    } as const;

    const state = onboardingReducer(initialState, action);

    expect(state.seedlessOnboarding).toEqual({
      clientId: 'persisted-google-client-id',
      authConnection: AuthConnection.Google,
    });
  });

  it('handles the CLEAR_SEEDLESS_ONBOARDING action', () => {
    const stateWithSeedlessOnboarding = {
      ...initialState,
      seedlessOnboarding: {
        clientId: 'persisted-google-client-id',
        authConnection: AuthConnection.Google,
      },
    };

    const action = { type: CLEAR_SEEDLESS_ONBOARDING } as const;
    const state = onboardingReducer(stateWithSeedlessOnboarding, action);

    expect(state.seedlessOnboarding).toBeUndefined();
  });

  it('handles the CLEAR_ONBOARDING action', () => {
    const dirtyState = {
      ...initialState,
      events: [[{ name: 'evt' }] as [ITrackingEvent]],
      completedOnboarding: true,
      accountType: AccountType.MetamaskGoogle,
      onboardingVersion: '1.0.0',
      seedlessOnboarding: {
        clientId: 'c',
        authConnection: AuthConnection.Google,
      },
      iosGoogleWarningSheetLastDismissedAt: 99 as number | null,
    };

    const action = { type: CLEAR_ONBOARDING } as const;
    const state = onboardingReducer(dirtyState, action);

    expect(state).toEqual(initialOnboardingState);
  });
});
