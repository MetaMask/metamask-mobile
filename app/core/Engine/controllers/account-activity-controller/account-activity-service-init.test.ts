import {
  AccountActivityService,
  type AccountActivityServiceMessenger,
  type WebSocketService,
} from '@metamask/backend-platform';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { getAccountActivityServiceMessenger } from '../../messengers/account-activity-service-messenger';
import { ControllerInitRequest } from '../../types';
import { accountActivityServiceInit } from './account-activity-service-init';

jest.mock('@metamask/backend-platform');
jest.mock('../../../util/Logger');

/**
 * Build a mock WebSocketService.
 *
 * @param partialMock - A partial mock object for the WebSocketService
 * @returns A mock WebSocketService
 */
function buildWebSocketServiceMock(
  partialMock?: Partial<WebSocketService>,
): WebSocketService {
  const defaultMocks = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    getConnectionInfo: jest.fn(),
  };

  // @ts-expect-error Incomplete mock, just includes properties used by code-under-test
  return {
    ...defaultMocks,
    ...partialMock,
  };
}

function buildInitRequestMock(
  initRequestProperties: Record<string, unknown> = {},
): jest.Mocked<ControllerInitRequest<AccountActivityServiceMessenger>> {
  const baseControllerMessenger = new ExtendedControllerMessenger();
  const requestMock = {
    ...buildControllerInitRequestMock(baseControllerMessenger),
    controllerMessenger: getAccountActivityServiceMessenger(
      baseControllerMessenger,
    ),
    ...initRequestProperties,
  };

  if (!initRequestProperties.getController) {
    requestMock.getController = jest
      .fn()
      .mockReturnValue(buildWebSocketServiceMock());
  }

  return requestMock;
}

describe('Account Activity Service Init', () => {
  const accountActivityServiceClassMock = jest.mocked(AccountActivityService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns controller instance', () => {
    // Arrange
    const requestMock = buildInitRequestMock();

    // Act
    const result = accountActivityServiceInit(requestMock);

    // Assert
    expect(result.controller).toBeInstanceOf(AccountActivityService);
  });

  it('throws error if BackendWebSocketService is not found', () => {
    // Arrange
    const requestMock = buildInitRequestMock({
      getController: jest.fn().mockImplementation(() => {
        throw new Error('BackendWebSocketService not found');
      }),
    });

    // Act & Assert
    expect(() => accountActivityServiceInit(requestMock)).toThrow(
      'BackendWebSocketService not found',
    );
  });

  it('throws error if controller initialization fails', () => {
    // Arrange
    accountActivityServiceClassMock.mockImplementationOnce(() => {
      throw new Error('Controller initialization failed');
    });
    const requestMock = buildInitRequestMock();

    // Act & Assert
    expect(() => accountActivityServiceInit(requestMock)).toThrow(
      'Controller initialization failed',
    );
  });

  describe('AccountActivityService constructor options', () => {
    it('correctly sets up messenger and webSocketService', () => {
      // Arrange
      const mockWebSocketService = buildWebSocketServiceMock();
      const requestMock = buildInitRequestMock({
        getController: jest.fn().mockReturnValue(mockWebSocketService),
      });

      // Act
      accountActivityServiceInit(requestMock);

      // Assert
      const constructorOptions =
        accountActivityServiceClassMock.mock.calls[0][0];
      expect(constructorOptions.messenger).toBe(
        requestMock.controllerMessenger,
      );
      expect(constructorOptions.webSocketService).toBe(mockWebSocketService);
    });
  });

  describe('getControllers helper', () => {
    it('correctly retrieves BackendWebSocketService', () => {
      // Arrange
      const mockWebSocketService = buildWebSocketServiceMock();
      const requestMock = buildInitRequestMock({
        getController: jest.fn().mockReturnValue(mockWebSocketService),
      });

      // Act
      accountActivityServiceInit(requestMock);

      // Assert
      expect(requestMock.getController).toHaveBeenCalledWith(
        'BackendWebSocketService',
      );
    });
  });
});
