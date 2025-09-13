import { AppState } from 'react-native';
import { AppStateWebSocketManager } from './AppStateWebSocketManager';
import { MobileBackendWebSocketService } from './websocket-service-init';

// Mock react-native AppState
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
}));

// Mock Logger
jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

// Mock WebSocket service
const mockWebSocketService = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  sendMessage: jest.fn(),
  getSessionId: jest.fn(),
} as unknown as MobileBackendWebSocketService;

describe('AppStateWebSocketManager', () => {
  let manager: AppStateWebSocketManager;
  let mockAddEventListener: jest.MockedFunction<typeof AppState.addEventListener>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddEventListener = AppState.addEventListener as jest.MockedFunction<typeof AppState.addEventListener>;
    
    // Mock session ID
    (mockWebSocketService.getSessionId as jest.Mock).mockReturnValue('test-session-123');
    
    // Create a new manager instance for each test
    manager = new AppStateWebSocketManager();
    manager.setWebSocketService(mockWebSocketService);
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe('initialization', () => {
    it('should start app state listener when WebSocket service is set', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should get current app state on initialization', () => {
      const status = manager.getConnectionStatus();
      expect(status.appState).toBe('active');
    });
  });

  describe('connect method', () => {
    it('should connect immediately when app is active', async () => {
      await manager.connect();
      
      expect(mockWebSocketService.connect).toHaveBeenCalled();
      const status = manager.getConnectionStatus();
      expect(status.isConnected).toBe(true);
      expect(status.shouldAutoConnect).toBe(true);
      expect(status.hasActiveSession).toBe(true);
      expect(status.sessionId).toBe('test-session-123');
    });

    it('should defer connection when app is not active', async () => {
      // Mock app being in background
      (AppState as any).currentState = 'background';
      manager = new AppStateWebSocketManager();
      manager.setWebSocketService(mockWebSocketService);

      await manager.connect();
      
      expect(mockWebSocketService.connect).not.toHaveBeenCalled();
      const status = manager.getConnectionStatus();
      expect(status.isConnected).toBe(false);
      expect(status.shouldAutoConnect).toBe(true);
      expect(status.hasActiveSession).toBe(false);
    });
  });

  describe('app state changes with session preservation', () => {
    it('should preserve session when app goes to background', async () => {
      // First connect
      await manager.connect();
      expect(mockWebSocketService.connect).toHaveBeenCalled();

      // Simulate app going to background
      const changeHandler = mockAddEventListener.mock.calls[0][1];
      await changeHandler('background');

      // Should call disconnect(false) to preserve session
      expect(mockWebSocketService.disconnect).toHaveBeenCalledWith(false);
      
      const status = manager.getConnectionStatus();
      expect(status.isConnected).toBe(false);
      expect(status.shouldAutoConnect).toBe(true);
      expect(status.hasActiveSession).toBe(true); // Session preserved
      expect(status.sessionId).toBe('test-session-123'); // Session ID preserved
    });

    it('should resume session when app returns to foreground', async () => {
      // Setup initial connection
      await manager.connect();
      jest.clearAllMocks();

      // Go to background (preserve session)
      const changeHandler = mockAddEventListener.mock.calls[0][1];
      await changeHandler('background');

      // Verify session preserved after background
      const statusAfterBackground = manager.getConnectionStatus();
      expect(statusAfterBackground.isConnected).toBe(false);
      expect(statusAfterBackground.hasActiveSession).toBe(true);
      expect(statusAfterBackground.sessionId).toBe('test-session-123');

      // Return to foreground (should resume session)
      await changeHandler('active');

      expect(mockWebSocketService.connect).toHaveBeenCalled();
      const statusAfterForeground = manager.getConnectionStatus();
      expect(statusAfterForeground.isConnected).toBe(true);
      expect(statusAfterForeground.hasActiveSession).toBe(true);
      expect(statusAfterForeground.sessionId).toBe('test-session-123');
    });

    it('should not reconnect if it was never connected before', async () => {
      const changeHandler = mockAddEventListener.mock.calls[0][1];
      
      // Go to background without ever connecting
      await changeHandler('background');
      
      // Return to foreground
      await changeHandler('active');

      expect(mockWebSocketService.connect).not.toHaveBeenCalled();
      const status = manager.getConnectionStatus();
      expect(status.shouldAutoConnect).toBe(false);
      expect(status.hasActiveSession).toBe(false);
    });

    it('should ignore inactive state changes', async () => {
      const changeHandler = mockAddEventListener.mock.calls[0][1];
      
      await changeHandler('inactive');

      expect(mockWebSocketService.disconnect).not.toHaveBeenCalled();
      expect(mockWebSocketService.connect).not.toHaveBeenCalled();
    });

    it('should handle reconnection failure gracefully while preserving session intent', async () => {
      // Setup initial connection
      await manager.connect();
      
      // Mock connection failure for reconnection attempt
      mockWebSocketService.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      const changeHandler = mockAddEventListener.mock.calls[0][1];
      
      // Go to background
      await changeHandler('background');
      
      // Return to foreground (should attempt reconnect but fail)
      await changeHandler('active');

      expect(mockWebSocketService.connect).toHaveBeenCalled();
      const status = manager.getConnectionStatus();
      expect(status.isConnected).toBe(false);
      expect(status.shouldAutoConnect).toBe(true);
      expect(status.hasActiveSession).toBe(true); // Should still preserve session for future attempts
    });
  });

  describe('manual disconnect method', () => {
    it('should clear session when manually disconnecting', async () => {
      await manager.connect();
      
      await manager.disconnect();
      
      // Should call disconnect(true) to clear session
      expect(mockWebSocketService.disconnect).toHaveBeenCalledWith(true);
      
      const status = manager.getConnectionStatus();
      expect(status.isConnected).toBe(false);
      expect(status.shouldAutoConnect).toBe(false);
      expect(status.hasActiveSession).toBe(false); // Session cleared
    });
  });

  describe('sendMessage method', () => {
    it('should send message when connected and in foreground', async () => {
      await manager.connect();
      
      const message = { event: 'test', data: {} };
      await manager.sendMessage(message);

      expect(mockWebSocketService.sendMessage).toHaveBeenCalledWith(message);
    });

    it('should throw error when app is not in foreground', async () => {
      // Mock app being in background
      (AppState as any).currentState = 'background';
      manager = new AppStateWebSocketManager();
      manager.setWebSocketService(mockWebSocketService);

      const message = { event: 'test', data: {} };
      
      await expect(manager.sendMessage(message)).rejects.toThrow(
        'Cannot send message when app is not in foreground'
      );
    });

    it('should throw error when not connected', async () => {
      const message = { event: 'test', data: {} };
      
      await expect(manager.sendMessage(message)).rejects.toThrow(
        'WebSocket not connected'
      );
    });
  });

  describe('cleanup', () => {
    it('should remove app state listener on cleanup', () => {
      const mockRemove = jest.fn();
      mockAddEventListener.mockReturnValue({ remove: mockRemove } as any);
      
      manager = new AppStateWebSocketManager();
      manager.setWebSocketService(mockWebSocketService);
      manager.cleanup();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return complete connection status including session info', async () => {
      await manager.connect();
      
      const status = manager.getConnectionStatus();
      expect(status.isConnected).toBe(true);
      expect(status.appState).toBe('active');
      expect(status.shouldAutoConnect).toBe(true);
      expect(status.hasActiveSession).toBe(true);
      expect(status.sessionId).toBe('test-session-123');
    });

    it('should handle missing getSessionId method gracefully', async () => {
      // Mock service without getSessionId method
      const serviceWithoutSessionId = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        sendMessage: jest.fn(),
      } as unknown as MobileBackendWebSocketService;
      
      manager = new AppStateWebSocketManager();
      manager.setWebSocketService(serviceWithoutSessionId);
      
      const status = manager.getConnectionStatus();
      expect(status.sessionId).toBe(null);
    });
  });
}); 