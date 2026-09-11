import type {
  AuthenticatedUserStorageServiceCreateDelegationAction,
  AuthenticatedUserStorageServiceListDelegationsAction,
} from '@metamask/authenticated-user-storage';
import type {
  ChompApiServiceCreateIntentsAction,
  ChompApiServiceGetIntentsByAddressAction,
  ChompApiServiceVerifyDelegationAction,
} from '@metamask/chomp-api-service';
import type { DelegationControllerSignDelegationAction } from '@metamask/delegation-controller';
import { Messenger } from '@metamask/messenger';
import type { MoneyAccountBalanceServiceFetchBalanceWithFallbackAction } from '@metamask/money-account-balance-service';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import type {
  SubscriptionControllerGetPricingAction,
  SubscriptionDelegationServiceActions,
} from '@metamask/subscription-controller';
import type { RootMessenger } from '../types';

type AllowedActions =
  | AuthenticatedUserStorageServiceCreateDelegationAction
  | AuthenticatedUserStorageServiceListDelegationsAction
  | ChompApiServiceCreateIntentsAction
  | ChompApiServiceGetIntentsByAddressAction
  | ChompApiServiceVerifyDelegationAction
  | DelegationControllerSignDelegationAction
  | MoneyAccountBalanceServiceFetchBalanceWithFallbackAction
  | RemoteFeatureFlagControllerGetStateAction
  | SubscriptionControllerGetPricingAction;

export type SubscriptionDelegationServiceMessenger = Messenger<
  'SubscriptionDelegationService',
  SubscriptionDelegationServiceActions | AllowedActions,
  never
>;

/**
 * Creates the restricted messenger used by SubscriptionDelegationService.
 *
 * @param rootMessenger - Mobile's root controller messenger.
 * @returns A messenger restricted to subscription delegation actions.
 */
export function getSubscriptionDelegationServiceMessenger(
  rootMessenger: RootMessenger,
): SubscriptionDelegationServiceMessenger {
  const serviceMessenger: SubscriptionDelegationServiceMessenger =
    new Messenger({
      namespace: 'SubscriptionDelegationService',
      parent: rootMessenger,
    });

  rootMessenger.delegate({
    messenger: serviceMessenger,
    actions: [
      'AuthenticatedUserStorageService:listDelegations',
      'AuthenticatedUserStorageService:createDelegation',
      'ChompApiService:verifyDelegation',
      'ChompApiService:createIntents',
      'ChompApiService:getIntentsByAddress',
      'DelegationController:signDelegation',
      'MoneyAccountBalanceService:fetchBalanceWithFallback',
      'RemoteFeatureFlagController:getState',
      'SubscriptionController:getPricing',
    ],
  });

  return serviceMessenger;
}
