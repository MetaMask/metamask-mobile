import { WebSocketService } from '@metamask/snaps-controllers';
import { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import {
  getWebSocketServiceMessenger,
  WebSocketServiceMessenger,
} from '../../messengers/snaps';
import { WebSocketServiceInit } from './websocket-service-init';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<WebSocketServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getWebSocketServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('WebSocketServiceInit', () => {
  it('initializes the controller', () => {
    const { controller } = WebSocketServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(WebSocketService);
  });
});
