/* eslint-disable @typescript-eslint/default-param-last */

import {
  CLEAR_EVENTS,
  OnboardingActionTypes,
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

export interface OnboardingState {
  events: [ITrackingEvent][];
  completedOnboarding: boolean;
  accountType?: AccountType;
  onboardingVersion?: string;

  seedlessOnboarding?: {
    clientId: string;
    authConnection: AuthConnection;
  };

  /** Set when a wallet is created post–analytics feature; used for "days since creation". */
  walletCreatedAtForFundsTrackingMs?: number;
  /** True once we emitted the event or permanently stopped monitoring (e.g. already had balance). */
  walletFundsObtainedFlowComplete?: boolean;
}

export const initialOnboardingState: OnboardingState = {
  events: [],
  completedOnboarding: false,
};

/**
 * Reducer to keep track of user oboarding actions:
 * - send it to analytics if the user decides to optin after finishing onboarding flow
 * - update the state of the onboarding flow
 */
const onboardingReducer = (
  state = initialOnboardingState,
  action: OnboardingActionTypes,
) => {
  switch (action.type) {
    case SAVE_EVENT:
      return {
        ...state,
        events: [...state.events, action.event],
      };
    case CLEAR_EVENTS:
      return {
        ...state,
        events: [],
      };
    case SET_COMPLETED_ONBOARDING:
      return {
        ...state,
        completedOnboarding: action.completedOnboarding,
      };
    case SET_ACCOUNT_TYPE:
      return {
        ...state,
        accountType: action.accountType,
        onboardingVersion: action.onboardingVersion,
      };
    case CLEAR_ACCOUNT_TYPE:
      return {
        ...state,
        accountType: undefined,
        onboardingVersion: undefined,
        walletCreatedAtForFundsTrackingMs: undefined,
        walletFundsObtainedFlowComplete: false,
      };
    case SET_SEEDLESS_ONBOARDING:
      return {
        ...state,
        seedlessOnboarding: {
          clientId: action.clientId,
          authConnection: action.authConnection,
        },
      };
    case CLEAR_SEEDLESS_ONBOARDING:
      return {
        ...state,
        seedlessOnboarding: undefined,
      };
    case SET_WALLET_CREATED_AT_FOR_FUNDS_TRACKING:
      return {
        ...state,
        walletCreatedAtForFundsTrackingMs: action.timestampMs,
        walletFundsObtainedFlowComplete: false,
      };
    case MARK_WALLET_FUNDS_OBTAINED_FLOW_COMPLETE:
      return {
        ...state,
        walletFundsObtainedFlowComplete: true,
      };
    default:
      return state;
  }
};

export default onboardingReducer;
