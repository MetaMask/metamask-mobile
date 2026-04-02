import onboardingReducer from '.';
import {
  CLEAR_EVENTS,
  SAVE_EVENT,
  SET_COMPLETED_ONBOARDING,
  SET_ACCOUNT_TYPE,
  CLEAR_ACCOUNT_TYPE,
  SET_SEEDLESS_ONBOARDING,
  CLEAR_SEEDLESS_ONBOARDING,
  SET_WALLET_CREATED_AT_FOR_FUNDS_TRACKING,
  MARK_WALLET_FUNDS_OBTAINED_FLOW_COMPLETE,
} from '../../actions/onboarding';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';
import { AccountType } from '../../constants/onboarding';
import { AuthConnection } from '../../core/OAuthService/OAuthInterface';

describe('onboardingReducer', () => {
  const initialState = {
    events: [],
    completedOnboarding: false,
  };

  it('returns the initial state when no action is provided', () => {
    const state = onboardingReducer(undefined, { type: null } as never);
    expect(state).toEqual(initialState);
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
      walletCreatedAtForFundsTrackingMs: 99,
      walletFundsObtainedFlowComplete: true,
    };

    const action = { type: CLEAR_ACCOUNT_TYPE } as const;
    const state = onboardingReducer(stateWithAccountType, action);

    expect(state.accountType).toBeUndefined();
    expect(state.onboardingVersion).toBeUndefined();
    expect(state.walletCreatedAtForFundsTrackingMs).toBeUndefined();
    expect(state.walletFundsObtainedFlowComplete).toBe(false);
  });

  it('handles SET_WALLET_CREATED_AT_FOR_FUNDS_TRACKING', () => {
    const action = {
      type: SET_WALLET_CREATED_AT_FOR_FUNDS_TRACKING,
      timestampMs: 555,
    } as const;
    const state = onboardingReducer(
      { ...initialState, walletFundsObtainedFlowComplete: true },
      action,
    );
    expect(state.walletCreatedAtForFundsTrackingMs).toBe(555);
    expect(state.walletFundsObtainedFlowComplete).toBe(false);
  });

  it('handles MARK_WALLET_FUNDS_OBTAINED_FLOW_COMPLETE', () => {
    const action = { type: MARK_WALLET_FUNDS_OBTAINED_FLOW_COMPLETE } as const;
    const state = onboardingReducer(initialState, action);
    expect(state.walletFundsObtainedFlowComplete).toBe(true);
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
});
