import { AppStateServiceImplementation } from './AppStateService';
import { AppState } from 'react-native';

// Mock dependencies
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
}));

jest.mock('react-native-background-timer', () => ({
  setTimeout: jest.fn((callback, delay) => {
    const timer = global.setTimeout(callback, delay);
    return timer as unknown as number;
  }),
  clearTimeout: jest.fn((timer) => {
    global.clearTimeout(timer);
  }),
}));

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('AppStateAPI', () => {
  let api: AppStateServiceImplementation;
  let mockAddEventListener: jest.Mock;
  let mockRemove: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the singleton instance
    api = AppStateServiceImplementation.getInstance();

    // Clear any existing listeners and state
    api.removeAllListeners();
    api.cleanup();

    // Setup mock for addEventListener
    mockRemove = jest.fn();
    mockAddEventListener = AppState.addEventListener as jest.Mock;
    mockAddEventListener.mockReturnValue({
      remove: mockRemove,
    });
  });

  afterEach(() => {
    api.cleanup();
    api.removeAllListeners();
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      api.initialize();
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
      expect(api.isInitialized()).toBe(true);
    });

    it('should not initialize twice', () => {
      api.initialize();
      api.initialize();
      expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    });

    it('should cleanup properly', () => {
      // Arrange
      api.initialize();
      const localMockRemove = jest.fn();
      mockAddEventListener.mockReturnValue({ remove: localMockRemove });

      // Act
      api.cleanup();

      // Assert
      expect(api.isInitialized()).toBe(false);
    });
  });

  describe('app state monitoring', () => {
    it('should get current app state', () => {
      // Arrange - ensure state is set
      api.initialize();
      const changeHandler = mockAddEventListener.mock.calls[0][1];
      changeHandler('active');

      // Act
      const currentState = api.getCurrentAppState();

      // Assert
      expect(currentState).toBe('active');
    });

    it('should emit foreground event when app becomes active', () => {
      const handler = jest.fn();
      api.on('foreground', handler);

      api.initialize();
      const changeHandler = mockAddEventListener.mock.calls[0][1];

      // Simulate app going to background then foreground
      changeHandler('background');
      changeHandler('active');

      expect(handler).toHaveBeenCalledWith('active');
    });

    it('should emit background event when app goes to background', () => {
      const handler = jest.fn();
      api.on('background', handler);

      api.initialize();
      const changeHandler = mockAddEventListener.mock.calls[0][1];

      changeHandler('background');

      expect(handler).toHaveBeenCalledWith('background');
    });

    it('should emit change event on any state change', () => {
      const handler = jest.fn();
      api.on('change', handler);

      api.initialize();
      const changeHandler = mockAddEventListener.mock.calls[0][1];

      changeHandler('inactive');

      expect(handler).toHaveBeenCalledWith('inactive');
    });
  });

  describe('lock timer', () => {
    it('should start lock timer', () => {
      const callback = jest.fn();
      api.startLockTimer(1000, callback);

      expect(api.isLockTimerActive()).toBe(true);
    });

    it('should call callback when timer expires', (done) => {
      const callback = jest.fn(() => {
        expect(callback).toHaveBeenCalled();
        done();
      });

      api.startLockTimer(100, callback);
    });

    it('should clear lock timer', () => {
      const callback = jest.fn();
      api.startLockTimer(1000, callback);

      api.clearLockTimer();

      expect(api.isLockTimerActive()).toBe(false);
    });

    it('should return remaining time', () => {
      // Arrange
      const callback = jest.fn();

      // Act
      api.startLockTimer(5000, callback);
      const remaining = api.getLockTimerRemaining();

      // Assert
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(5000);

      // Cleanup - clear timer to not affect other tests
      api.clearLockTimer();
    });

    it('should return null when no timer active', () => {
      // Arrange - ensure no timer is active
      api.clearLockTimer();

      // Act
      const remaining = api.getLockTimerRemaining();

      // Assert
      expect(remaining).toBeNull();
    });

    it('should clear existing timer when starting new one', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      api.startLockTimer(1000, callback1);
      api.startLockTimer(2000, callback2);

      expect(api.isLockTimerActive()).toBe(true);
    });
  });

  describe('state queries', () => {
    it('should check if app is in foreground', () => {
      api.initialize();
      const changeHandler = mockAddEventListener.mock.calls[0][1];

      changeHandler('active');
      expect(api.isAppInForeground()).toBe(true);

      changeHandler('background');
      expect(api.isAppInForeground()).toBe(false);
    });

    it('should check if app is in background', () => {
      api.initialize();
      const changeHandler = mockAddEventListener.mock.calls[0][1];

      changeHandler('background');
      expect(api.isAppInBackground()).toBe(true);

      changeHandler('active');
      expect(api.isAppInBackground()).toBe(false);
    });

    it('should check if app is inactive', () => {
      api.initialize();
      const changeHandler = mockAddEventListener.mock.calls[0][1];

      changeHandler('inactive');
      expect(api.isAppInactive()).toBe(true);

      changeHandler('active');
      expect(api.isAppInactive()).toBe(false);
    });
  });

  describe('event emitter', () => {
    it('should allow registering event handlers', () => {
      const handler = jest.fn();
      api.on('background', handler);

      api.initialize();
      const changeHandler = mockAddEventListener.mock.calls[0][1];

      changeHandler('background');

      expect(handler).toHaveBeenCalled();
    });

    it('should allow removing event handlers', () => {
      const handler = jest.fn();
      api.on('background', handler);
      api.off('background', handler);

      api.initialize();
      const changeHandler = mockAddEventListener.mock.calls[0][1];

      changeHandler('background');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove all listeners on cleanup', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      api.on('background', handler1);
      api.on('foreground', handler2);

      api.initialize();
      api.cleanup();

      const changeHandler = mockAddEventListener.mock.calls[0][1];
      changeHandler('background');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });
});
