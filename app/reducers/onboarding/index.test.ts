import onboardingReducer from '.';
import {
  CLEAR_EVENTS,
  SAVE_EVENT,
  SET_COMPLETED_ONBOARDING,
  SET_ACCOUNT_TYPE,
  CLEAR_ACCOUNT_TYPE,
} from '../../actions/onboarding';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';

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
    const action = {
      type: SET_ACCOUNT_TYPE,
      accountType: 'metamask_google',
    } as const;
    const state = onboardingReducer(initialState, action);
    expect(state.accountType).toBe('metamask_google');
  });

  it('handles the CLEAR_ACCOUNT_TYPE action', () => {
    const stateWithAccountType = {
      ...initialState,
      accountType: 'metamask_google',
    };
    const action = { type: CLEAR_ACCOUNT_TYPE } as const;
    const state = onboardingReducer(stateWithAccountType, action);
    expect(state.accountType).toBeUndefined();
  });
});
