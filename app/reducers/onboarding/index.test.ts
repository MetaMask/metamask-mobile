import onboardingReducer, { initialOnboardingState } from '.';
import {
  saveOnboardingEvent,
  clearOnboardingEvents,
  setCompletedOnboarding,
  setAccountType,
  clearAccountType,
  setPendingSocialLoginMarketingConsentBackfill,
  SET_SEEDLESS_ONBOARDING,
  CLEAR_SEEDLESS_ONBOARDING,
} from '../../actions/onboarding';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';
import { AccountType } from '../../constants/onboarding';
import { AuthConnection } from '../../core/OAuthService/OAuthInterface';

describe('onboardingReducer', () => {
  it('returns the initial state when no action is provided', () => {
    const state = onboardingReducer(undefined, { type: null } as never);
    expect(state).toEqual(initialOnboardingState);
  });

  it('saves an event with SAVE_EVENT', () => {
    const mockEvent = [{ name: 'test_event' }] as [ITrackingEvent];
    const newState = onboardingReducer(
      initialOnboardingState,
      saveOnboardingEvent(mockEvent),
    );
    expect(newState.events).toEqual([mockEvent]);
  });

  it('clears events with CLEAR_EVENTS', () => {
    const stateWithEvents = {
      ...initialOnboardingState,
      events: [[{ name: 'test_event' }] as [ITrackingEvent]],
    };
    const newState = onboardingReducer(
      stateWithEvents,
      clearOnboardingEvents(),
    );
    expect(newState.events).toEqual([]);
  });

  it('sets completedOnboarding', () => {
    const newState = onboardingReducer(
      initialOnboardingState,
      setCompletedOnboarding(true),
    );

    expect(newState).toEqual({
      ...initialOnboardingState,
      completedOnboarding: true,
    });
  });

  it('sets accountType and onboardingVersion with SET_ACCOUNT_TYPE', () => {
    const onboardingVersion = '7.0.0 (1234)';
    const newState = onboardingReducer(
      initialOnboardingState,
      setAccountType({
        accountType: AccountType.MetamaskGoogle,
        onboardingVersion,
      }),
    );

    expect(newState.accountType).toBe(AccountType.MetamaskGoogle);
    expect(newState.onboardingVersion).toBe(onboardingVersion);
  });

  it('clears accountType and onboardingVersion with CLEAR_ACCOUNT_TYPE', () => {
    const stateWithAccountType = {
      ...initialOnboardingState,
      accountType: AccountType.MetamaskGoogle,
      onboardingVersion: '7.0.0 (1234)',
    };
    const newState = onboardingReducer(
      stateWithAccountType,
      clearAccountType(),
    );

    expect(newState.accountType).toBeUndefined();
    expect(newState.onboardingVersion).toBeUndefined();
  });

  it('sets pending social login marketing consent backfill on onboarding', () => {
    const newState = onboardingReducer(
      initialOnboardingState,
      setPendingSocialLoginMarketingConsentBackfill('google'),
    );

    expect(newState).toEqual({
      ...initialOnboardingState,
      pendingSocialLoginMarketingConsentBackfill: 'google',
    });
  });

  it('clears the pending social login marketing consent backfill marker', () => {
    const stateWithMarker = {
      ...initialOnboardingState,
      pendingSocialLoginMarketingConsentBackfill: 'google',
    };
    const newState = onboardingReducer(
      stateWithMarker,
      setPendingSocialLoginMarketingConsentBackfill(null),
    );

    expect(newState.pendingSocialLoginMarketingConsentBackfill).toBeNull();
  });

  it('handles the SET_SEEDLESS_ONBOARDING action', () => {
    const action = {
      type: SET_SEEDLESS_ONBOARDING,
      clientId: 'persisted-google-client-id',
      authConnection: AuthConnection.Google,
    } as const;

    const state = onboardingReducer(initialOnboardingState, action);

    expect(state.seedlessOnboarding).toEqual({
      clientId: 'persisted-google-client-id',
      authConnection: AuthConnection.Google,
    });
  });

  it('handles the CLEAR_SEEDLESS_ONBOARDING action', () => {
    const stateWithSeedlessOnboarding = {
      ...initialOnboardingState,
      seedlessOnboarding: {
        clientId: 'persisted-google-client-id',
        authConnection: AuthConnection.Google,
      },
    };

    const action = { type: CLEAR_SEEDLESS_ONBOARDING } as const;
    const state = onboardingReducer(stateWithSeedlessOnboarding, action);

    expect(state.seedlessOnboarding).toBeUndefined();
  });
});
