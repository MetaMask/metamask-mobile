import { SubscriptionDelegationService } from '@metamask/subscription-controller';
import {
  getSubscriptionDelegationServiceMessenger,
  type SubscriptionDelegationServiceMessenger,
} from '../messengers/subscription-delegation-service-messenger';
import {
  getRootExtendedMessenger,
  type MessengerClientInitRequest,
} from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { subscriptionDelegationServiceInit } from './subscription-delegation-service-init';

jest.mock('@metamask/subscription-controller', () => ({
  SubscriptionDelegationService: jest.fn(),
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<SubscriptionDelegationServiceMessenger>
> {
  const rootMessenger = getRootExtendedMessenger();

  return {
    ...buildMessengerClientInitRequestMock(rootMessenger),
    controllerMessenger:
      getSubscriptionDelegationServiceMessenger(rootMessenger),
  };
}

describe('subscriptionDelegationServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('instantiates SubscriptionDelegationService with its messenger', () => {
    const request = getInitRequestMock();

    const { controller } = subscriptionDelegationServiceInit(request);

    expect(SubscriptionDelegationService).toHaveBeenCalledWith({
      messenger: request.controllerMessenger,
    });
    expect(controller).toBeInstanceOf(SubscriptionDelegationService);
  });
});
