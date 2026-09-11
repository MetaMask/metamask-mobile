import {
  SubscriptionDelegationService,
  type SubscriptionDelegationServiceMessenger as PackageSubscriptionDelegationServiceMessenger,
} from '@metamask/subscription-controller';
import type { SubscriptionDelegationServiceMessenger } from '../messengers/subscription-delegation-service-messenger';
import type { MessengerClientInitFunction } from '../types';

/**
 * Initializes the stateless subscription delegation orchestrator.
 */
export const subscriptionDelegationServiceInit: MessengerClientInitFunction<
  SubscriptionDelegationService,
  SubscriptionDelegationServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new SubscriptionDelegationService({
    messenger:
      controllerMessenger as unknown as PackageSubscriptionDelegationServiceMessenger,
  });

  return { controller };
};
