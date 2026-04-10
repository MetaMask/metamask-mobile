import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getMultichainRoutingServiceInitMessenger,
  getMultichainRoutingServiceMessenger,
  MultichainRoutingServiceInitMessenger,
} from '../messengers/multichain-routing-service-messenger.ts';
import { MessengerClientInitRequest } from '../types';
import { multichainRoutingServiceInit } from './multichain-routing-service-init.ts';
import {
  MultichainRoutingService,
  MultichainRoutingServiceMessenger,
} from '@metamask/snaps-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/snaps-controllers');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<
    MultichainRoutingServiceMessenger,
    MultichainRoutingServiceInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getMultichainRoutingServiceMessenger(baseMessenger),
    initMessenger: getMultichainRoutingServiceInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('MultichainRoutingServiceInit', () => {
  it('initializes the controller', () => {
    const { messengerClient } =
      multichainRoutingServiceInit(getInitRequestMock());
    expect(messengerClient).toBeInstanceOf(MultichainRoutingService);
  });

  it('passes the proper arguments to the controller', () => {
    multichainRoutingServiceInit(getInitRequestMock());

    const controllerMock = jest.mocked(MultichainRoutingService);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      withSnapKeyring: expect.any(Function),
    });
  });
});
