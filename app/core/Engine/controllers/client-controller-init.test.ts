import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getClientControllerMessenger } from '../messengers/client-controller-messenger';
import { MessengerClientInitRequest } from '../types';
import { clientControllerInit } from './client-controller-init';
import {
  ClientController,
  ClientControllerMessenger,
} from '@metamask/client-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/client-controller');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<ClientControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getClientControllerMessenger(baseMessenger),
  };
}

describe('clientControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = clientControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ClientController);
  });

  it('passes the proper arguments to the controller', () => {
    clientControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(ClientController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
    });
  });

  it('passes persisted state to the controller', () => {
    const requestMock = getInitRequestMock();
    requestMock.persistedState = {
      ClientController: { isUiOpen: true },
    };

    clientControllerInit(requestMock);

    const controllerMock = jest.mocked(ClientController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: { isUiOpen: true },
    });
  });
});
