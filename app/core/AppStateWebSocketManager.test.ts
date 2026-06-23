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
    it('initializes with WebSocket service and sets up app state listener', () => {
      const manager = new AppStateWebSocketManager(mockWebSocketService);

      expect(manager.getWebSocketService()).toBe(mockWebSocketService);
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
      new AppStateWebSocketManager(mockWebSocketService);

      await appStateChangeHandler('background');

      expect(mockWebSocketService.disconnect).toHaveBeenCalledTimes(1);
      expect(Logger.log).toHaveBeenCalledWith(
        'WebSocket disconnected due to app entering background',
      );
    });

    it('connects WebSocket when app becomes active', async () => {
      new AppStateWebSocketManager(mockWebSocketService);

      await appStateChangeHandler('active');

      expect(mockWebSocketService.connect).toHaveBeenCalledTimes(1);
      expect(Logger.log).toHaveBeenCalledWith(
        'WebSocket reconnection attempt completed (service handles feature flag check)',
      );
    });

    it('does nothing when app state is inactive', async () => {
      new AppStateWebSocketManager(mockWebSocketService);

      await appStateChangeHandler('inactive');

      expect(mockWebSocketService.disconnect).not.toHaveBeenCalled();
      expect(mockWebSocketService.connect).not.toHaveBeenCalled();
    });

    it('serialises rapid background→active→background: no concurrent calls, ends disconnected', async () => {
      // Simulate connect taking time so rapid changes can pile up.
      let resolveConnect!: () => void;
      mockWebSocketService.connect.mockReturnValue(
        new Promise<void>((res) => {
          resolveConnect = res;
        }),
      );

      new AppStateWebSocketManager(mockWebSocketService);

      // background starts disconnect (instant), then active starts connect (held)
      const bgPromise = appStateChangeHandler('background');
      await bgPromise; // disconnect resolves immediately

      const activePromise = appStateChangeHandler('active'); // connect is now in-flight

      // background arrives while connect is still pending — must not start a second disconnect
      const bg2Promise = appStateChangeHandler('background');

      // Only one connect call must be in flight; no second disconnect yet
      expect(mockWebSocketService.connect).toHaveBeenCalledTimes(1);
      expect(mockWebSocketService.disconnect).toHaveBeenCalledTimes(1);

      // Let connect finish — the pending 'background' should now trigger disconnect
      resolveConnect();
      await Promise.all([activePromise, bg2Promise]);

      expect(mockWebSocketService.disconnect).toHaveBeenCalledTimes(2);
      expect(mockWebSocketService.connect).toHaveBeenCalledTimes(1);
    });

    it('serialises rapid active→background→active: ends connected, connect called once', async () => {
      let resolveDisconnect!: () => void;
      mockWebSocketService.disconnect.mockReturnValue(
        new Promise<void>((res) => {
          resolveDisconnect = res;
        }),
      );

      new AppStateWebSocketManager(mockWebSocketService);

      const activePromise = appStateChangeHandler('active');
      await activePromise; // connect resolves immediately

      const bgPromise = appStateChangeHandler('background'); // disconnect in-flight

      // active arrives while disconnect is pending — must not start a second connect
      const active2Promise = appStateChangeHandler('active');

      expect(mockWebSocketService.disconnect).toHaveBeenCalledTimes(1);
      expect(mockWebSocketService.connect).toHaveBeenCalledTimes(1);

      resolveDisconnect();
      await Promise.all([bgPromise, active2Promise]);

      expect(mockWebSocketService.connect).toHaveBeenCalledTimes(2);
      expect(mockWebSocketService.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('removes app state listener, destroys service, and clears reference', () => {
      const mockRemove = jest.fn();
      mockAppStateListener.mockReturnValue({ remove: mockRemove });
      const manager = new AppStateWebSocketManager(mockWebSocketService);

      manager.cleanup();

      expect(mockRemove).toHaveBeenCalled();
      expect(mockWebSocketService.destroy).toHaveBeenCalled();
      expect(manager.getWebSocketService()).toBeNull();
    });

    it('does not throw when called multiple times', () => {
      const manager = new AppStateWebSocketManager(mockWebSocketService);

      expect(() => {
        manager.cleanup();
        manager.cleanup();
      }).not.toThrow();
    });
  });
});
