import type { RewardsControllerMessengerActions } from '../../messengers/rewards-controller-messenger/types';

export interface LoginResponseDto {
  sessionId: string;
  subscription: SubscriptionDto;
}

export interface SubscriptionDto {
  id: string;
  referralCode: string;
  [key: string]: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsControllerState = {
  lastAuthenticatedAccount: string | null;
  lastAuthTime: number;
  subscription: SubscriptionDto | null;
};

/**
 * Events that can be emitted by the RewardsController
 */
export interface RewardsControllerEvents {
  type: 'RewardsController:stateChange';
  payload: [RewardsControllerState, Patch[]];
}

/**
 * Patch type for state changes
 */
export interface Patch {
  op: 'replace' | 'add' | 'remove';
  path: string[];
  value?: unknown;
}

/**
 * Actions that can be performed by the RewardsController
 */
export type RewardsControllerActions = RewardsControllerMessengerActions;
