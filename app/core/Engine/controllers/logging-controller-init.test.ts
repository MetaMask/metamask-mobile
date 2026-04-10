import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getLoggingControllerMessenger } from '../messengers/logging-controller-messenger';
import { MessengerClientInitRequest } from '../types';
import { loggingControllerInit } from './logging-controller-init';
import {
  LoggingController,
  LoggingControllerMessenger,
} from '@metamask/logging-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/logging-controller');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<LoggingControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getLoggingControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('LoggingControllerInit', () => {
  it('initializes the controller', () => {
    const { messengerClient } = loggingControllerInit(getInitRequestMock());
    expect(messengerClient).toBeInstanceOf(LoggingController);
  });

  it('passes the proper arguments to the controller', () => {
    loggingControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(LoggingController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
    });
  });
});
