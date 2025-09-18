import {
  WebSocketService,
  type WebSocketServiceMessenger,
} from '@metamask/backend-platform';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { getBackendWebSocketServiceMessenger } from '../../messengers/backend-websocket-service-messenger';
import { ControllerInitRequest } from '../../types';
import { backendWebSocketServiceInit } from './backend-websocket-service-init';

jest.mock('@metamask/backend-platform');
jest.mock('../../../util/Logger');

function buildInitRequestMock(): jest.Mocked<
  ControllerInitRequest<WebSocketServiceMessenger>
> {
  const baseControllerMessenger = new ExtendedControllerMessenger();
  const requestMock = {
    ...buildControllerInitRequestMock(baseControllerMessenger),
    controllerMessenger: getBackendWebSocketServiceMessenger(
      baseControllerMessenger,
    ),
  };

  return requestMock;
}

describe('Backend WebSocket Service Init', () => {
  const webSocketServiceClassMock = jest.mocked(WebSocketService);
  const mockController = {
    connect: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    webSocketServiceClassMock.mockImplementation(
      () => mockController as WebSocketService,
    );
    mockController.connect.mockResolvedValue(undefined);
  });

  it('returns controller instance', () => {
    // Arrange
    const requestMock = buildInitRequestMock();

    // Act
    const result = backendWebSocketServiceInit(requestMock);

    // Assert
    expect(result.controller).toBeInstanceOf(WebSocketService);
  });

  it('throws error if controller initialization fails', () => {
    // Arrange
    webSocketServiceClassMock.mockImplementationOnce(() => {
      throw new Error('Controller initialization failed');
    });
    const requestMock = buildInitRequestMock();

    // Act & Assert
    expect(() => backendWebSocketServiceInit(requestMock)).toThrow(
      'Controller initialization failed',
    );
  });

  describe('WebSocket Service constructor options', () => {
    it('correctly sets up messenger and mobile-optimized configuration', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      backendWebSocketServiceInit(requestMock);

      // Assert
      const constructorOptions = webSocketServiceClassMock.mock.calls[0][0];
      expect(constructorOptions.messenger).toBe(
        requestMock.controllerMessenger,
      );
      expect(constructorOptions.timeout).toBe(15000);
      expect(constructorOptions.reconnectDelay).toBe(1000);
      expect(constructorOptions.maxReconnectDelay).toBe(30000);
      expect(constructorOptions.requestTimeout).toBe(20000);
    });

    it('uses default WebSocket URL when environment variable is not set', () => {
      // Arrange
      delete process.env.METAMASK_BACKEND_WEBSOCKET_URL;
      const requestMock = buildInitRequestMock();

      // Act
      backendWebSocketServiceInit(requestMock);

      // Assert
      const constructorOptions = webSocketServiceClassMock.mock.calls[0][0];
      expect(constructorOptions.url).toBe(
        'wss://gateway.dev-api.cx.metamask.io/v1',
      );
    });

    it('uses environment WebSocket URL when set', () => {
      // Arrange
      process.env.METAMASK_BACKEND_WEBSOCKET_URL =
        'wss://custom.example.com/ws';
      const requestMock = buildInitRequestMock();

      // Act
      backendWebSocketServiceInit(requestMock);

      // Assert
      const constructorOptions = webSocketServiceClassMock.mock.calls[0][0];
      expect(constructorOptions.url).toBe('wss://custom.example.com/ws');
    });
  });

  describe('explicit connect behavior', () => {
    it('calls connect() after service creation', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      backendWebSocketServiceInit(requestMock);

      // Assert
      expect(mockController.connect).toHaveBeenCalledTimes(1);
    });

    it('handles connect() failures gracefully', () => {
      // Arrange
      const connectError = new Error('Connection failed');
      mockController.connect.mockRejectedValueOnce(connectError);
      const requestMock = buildInitRequestMock();

      // Act & Assert - should not throw despite connection failure
      expect(() => backendWebSocketServiceInit(requestMock)).not.toThrow();
      expect(mockController.connect).toHaveBeenCalledTimes(1);
    });
  });
});
