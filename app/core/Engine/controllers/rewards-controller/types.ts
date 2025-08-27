import { ControllerGetStateAction } from '@metamask/base-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';

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
 * Event emitted when silent authentication succeeds or fails
 */
export interface RewardsControllerSelectedAccountAuthChangeEvent {
  type: 'RewardsController:selectedAccountAuthChange';
  payload: [
    { account: InternalAccount; subscriptionId: string | null; error: boolean },
  ];
}

/**
 * Events that can be emitted by the RewardsController
 */
export type RewardsControllerEvents =
  | {
      type: 'RewardsController:stateChange';
      payload: [RewardsControllerState, Patch[]];
    }
  | RewardsControllerSelectedAccountAuthChangeEvent;

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
export type RewardsControllerActions = ControllerGetStateAction<
  'RewardsController',
  RewardsControllerState
>;
