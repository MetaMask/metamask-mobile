import { AppState, AppStateStatus } from 'react-native';
import { BackendWebSocketService } from '@metamask/core-backend';
import { AppStateWebSocketManager } from './AppStateWebSocketManager';
import Logger from '../util/Logger';

jest.mock('../util/Logger');

describe('AppStateWebSocketManager', () => {
  let mockWebSocketService: jest.Mocked<BackendWebSocketService>;
  let mockAppStateListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock BackendWebSocketService
    mockWebSocketService = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
    } as unknown as jest.Mocked<BackendWebSocketService>;

    // Mock AppState.addEventListener
    mockAppStateListener = jest.fn().mockReturnValue({
      remove: jest.fn(),
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(mockAppStateListener);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('initializes with WebSocket service', () => {
      // Act
      const manager = new AppStateWebSocketManager(mockWebSocketService);

      // Assert
      expect(manager.getWebSocketService()).toBe(mockWebSocketService);
    });

    it('sets up app state listener on initialization', () => {
      // Act
      new AppStateWebSocketManager(mockWebSocketService);

      // Assert
      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
    });
  });

  describe('app state changes', () => {
    let appStateChangeHandler: (nextAppState: AppStateStatus) => void;

    beforeEach(() => {
      mockAppStateListener.mockImplementation((_event, handler) => {
        appStateChangeHandler = handler;
        return { remove: jest.fn() };
      });
    });

    it('disconnects WebSocket when app goes to background', async () => {
      // Arrange
      new AppStateWebSocketManager(mockWebSocketService);

      // Act
      await appStateChangeHandler('background');

      // Assert
      expect(mockWebSocketService.disconnect).toHaveBeenCalledTimes(1);
      expect(Logger.log).toHaveBeenCalledWith(
        'WebSocket disconnected due to app entering background',
      );
    });

    it('connects WebSocket when app becomes active', async () => {
      // Arrange
      new AppStateWebSocketManager(mockWebSocketService);

      // Act
      await appStateChangeHandler('active');

      // Assert
      expect(mockWebSocketService.connect).toHaveBeenCalledTimes(1);
      expect(Logger.log).toHaveBeenCalledWith(
        'WebSocket reconnection attempt completed (service handles feature flag check)',
      );
    });

    it('does nothing when app state is inactive', async () => {
      // Arrange
      new AppStateWebSocketManager(mockWebSocketService);

      // Act
      await appStateChangeHandler('inactive');

      // Assert
      expect(mockWebSocketService.disconnect).not.toHaveBeenCalled();
      expect(mockWebSocketService.connect).not.toHaveBeenCalled();
    });

    it('logs error when disconnect fails', async () => {
      // Arrange
      const error = new Error('Disconnect failed');
      mockWebSocketService.disconnect.mockRejectedValue(error);
      new AppStateWebSocketManager(mockWebSocketService);

      // Act
      await appStateChangeHandler('background');

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'Error handling WebSocket lifecycle on app state change',
      );
    });

    it('logs error when connect fails', async () => {
      // Arrange
      const error = new Error('Connect failed');
      mockWebSocketService.connect.mockRejectedValue(error);
      new AppStateWebSocketManager(mockWebSocketService);

      // Act
      await appStateChangeHandler('active');

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'Error handling WebSocket lifecycle on app state change',
      );
    });
  });

  describe('cleanup', () => {
    it('removes app state listener', () => {
      // Arrange
      const mockRemove = jest.fn();
      mockAppStateListener.mockReturnValue({ remove: mockRemove });
      const manager = new AppStateWebSocketManager(mockWebSocketService);

      // Act
      manager.cleanup();

      // Assert
      expect(mockRemove).toHaveBeenCalled();
    });

    it('destroys WebSocket service', () => {
      // Arrange
      const manager = new AppStateWebSocketManager(mockWebSocketService);

      // Act
      manager.cleanup();

      // Assert
      expect(mockWebSocketService.destroy).toHaveBeenCalled();
    });

    it('clears WebSocket service reference after cleanup', () => {
      // Arrange
      const manager = new AppStateWebSocketManager(mockWebSocketService);

      // Act
      manager.cleanup();

      // Assert
      expect(manager.getWebSocketService()).toBeNull();
    });

    it('does not throw when cleanup is called multiple times', () => {
      // Arrange
      const manager = new AppStateWebSocketManager(mockWebSocketService);

      // Act & Assert
      expect(() => {
        manager.cleanup();
        manager.cleanup();
      }).not.toThrow();
    });
  });

  describe('getWebSocketService', () => {
    it('returns the current WebSocket service', () => {
      // Arrange
      const manager = new AppStateWebSocketManager(mockWebSocketService);

      // Act
      const service = manager.getWebSocketService();

      // Assert
      expect(service).toBe(mockWebSocketService);
    });

    it('returns null after cleanup', () => {
      // Arrange
      const manager = new AppStateWebSocketManager(mockWebSocketService);
      manager.cleanup();

      // Act
      const service = manager.getWebSocketService();

      // Assert
      expect(service).toBeNull();
    });
  });
});
