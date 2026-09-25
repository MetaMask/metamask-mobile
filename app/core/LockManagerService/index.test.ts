import { LockManagerService } from '.';
import { AppState, AppStateStatus } from 'react-native';
import { lockApp, checkForDeeplink } from '../../actions/user';
import Logger from '../../util/Logger';
import ReduxService, { type ReduxStore } from '../redux';

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      setLocked: jest.fn().mockResolvedValue(true),
    },
  },
}));

const mockSetTimeout = jest.fn();
const mockClearTimeout = jest.fn();

jest.mock('react-native-background-timer', () => ({
  setTimeout: (callback: () => void, timeout: number) =>
    mockSetTimeout(callback, timeout),
  clearTimeout: (id: number) => mockClearTimeout(id),
}));

jest.mock('../SecureKeychain', () => ({
  getInstance: () => ({
    isAuthenticating: false,
  }),
}));

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('LockManagerService', () => {
  let lockManagerService: LockManagerService;
  let mockAppStateListener: (state: AppStateStatus) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.useFakeTimers();
    // Returning an id lets the service track and later clear the pending timer.
    mockSetTimeout.mockReturnValue(1);
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (_, listener) => {
        mockAppStateListener = listener;
        return { remove: jest.fn() };
      },
    );
    lockManagerService = new LockManagerService();
  });

  afterEach(() => {
    lockManagerService.stopListening();
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  describe('startListening', () => {
    it('should do nothing when app state listener is already subscribed.', async () => {
      lockManagerService.startListening();
      expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
      lockManagerService.startListening();
      expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
      expect(Logger.log).toHaveBeenCalledWith(
        'Already subscribed to app state listener.',
      );
    });

    it('should add event listener when it is not yet subscribed.', async () => {
      lockManagerService.startListening();
      expect(AppState.addEventListener).toHaveBeenCalled();
    });
  });

  describe('stopListening', () => {
    it('should remove app state listener.', async () => {
      lockManagerService.startListening();
      expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
      lockManagerService.stopListening();
      lockManagerService.startListening();
      expect(AppState.addEventListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleAppStateChange', () => {
    it('should throw an error if store is undefined.', async () => {
      lockManagerService.startListening();
      mockAppStateListener('active');
      expect(Logger.error).toHaveBeenCalledWith(
        new Error('Redux store does not exist!'),
        'LockManagerService: Error handling app state change',
      );
    });

    it('should do nothing if lockTime is -1 while going into the background', async () => {
      const mockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({ settings: { lockTime: -1 } }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);
      lockManagerService.startListening();
      mockAppStateListener('background');
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should do nothing if lockTime is 0 while going inactive.', async () => {
      const mockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({ settings: { lockTime: 0 } }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);
      lockManagerService.startListening();
      mockAppStateListener('inactive');
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should only dispatch checkForDeeplink while lockTime is 0 while going from inactive to active', async () => {
      const mockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({ settings: { lockTime: 0 } }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);
      lockManagerService.startListening();
      mockAppStateListener('inactive');
      mockAppStateListener('active');
      expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
    });

    it('should dispatch lockApp when lockTimer is 0 while going into the background', async () => {
      const mockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({ settings: { lockTime: 0 } }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);
      lockManagerService.startListening();
      mockAppStateListener('background');
      expect(await mockDispatch).toHaveBeenCalledWith(lockApp());
    });

    it('should set background timer when lockTimer is non-zero while going into the background', async () => {
      const mockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({ settings: { lockTime: 5 } }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);
      lockManagerService.startListening();
      mockAppStateListener('background');
      expect(mockSetTimeout).toHaveBeenCalled();
    });

    it('clears the pending background timer when resuming through inactive', () => {
      const mockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({ settings: { lockTime: 5 } }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);
      lockManagerService.startListening();

      // Android resumes as background -> inactive -> active, which takes the
      // ignored-transition path and must still cancel the pending lock.
      mockAppStateListener('background');
      mockAppStateListener('inactive');
      mockAppStateListener('active');

      expect(mockClearTimeout).toHaveBeenCalledWith(1);
    });

    describe('when resuming with a non-zero lockTime', () => {
      const lockTime = 30000;
      let mockDispatch: jest.Mock;

      beforeEach(() => {
        mockDispatch = jest.fn();
        jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
          getState: () => ({ settings: { lockTime } }),
          dispatch: mockDispatch,
        } as unknown as ReduxStore);
        jest.setSystemTime(0);
        lockManagerService.startListening();
      });

      it('locks immediately on resume when the lock time has elapsed', async () => {
        mockAppStateListener('background');
        jest.setSystemTime(lockTime + 10000);

        mockAppStateListener('active');
        await Promise.resolve();

        expect(mockClearTimeout).toHaveBeenCalledWith(1);
        expect(mockDispatch).toHaveBeenCalledWith(lockApp());
      });

      it('locks immediately when resuming through inactive after the lock time has elapsed', async () => {
        mockAppStateListener('background');
        jest.setSystemTime(lockTime);

        mockAppStateListener('inactive');
        mockAppStateListener('active');
        await Promise.resolve();

        expect(mockDispatch).toHaveBeenCalledWith(lockApp());
        expect(mockDispatch).not.toHaveBeenCalledWith(checkForDeeplink());
      });

      it('does not lock on resume when the lock time has not elapsed', async () => {
        mockAppStateListener('background');
        jest.setSystemTime(lockTime - 1);

        mockAppStateListener('active');
        await Promise.resolve();

        expect(mockClearTimeout).toHaveBeenCalledWith(1);
        expect(mockDispatch).not.toHaveBeenCalledWith(lockApp());
      });

      it('does not lock when an overdue timer fires after resuming early', async () => {
        mockAppStateListener('background');
        const timerCallback = mockSetTimeout.mock.calls[0][0];
        jest.setSystemTime(lockTime - 1);
        mockAppStateListener('active');

        jest.setSystemTime(lockTime + 10000);
        timerCallback();
        await Promise.resolve();

        expect(mockDispatch).not.toHaveBeenCalledWith(lockApp());
      });

      it('locks from the background timer once the lock time has elapsed', async () => {
        mockAppStateListener('background');
        const timerCallback = mockSetTimeout.mock.calls[0][0];
        jest.setSystemTime(lockTime);

        timerCallback();
        await Promise.resolve();

        expect(mockDispatch).toHaveBeenCalledWith(lockApp());
      });

      it('does not lock again on resume after the background timer already locked', async () => {
        mockAppStateListener('background');
        const timerCallback = mockSetTimeout.mock.calls[0][0];
        jest.setSystemTime(lockTime);
        timerCallback();
        await Promise.resolve();
        mockDispatch.mockClear();

        mockAppStateListener('active');
        await Promise.resolve();

        expect(mockDispatch).not.toHaveBeenCalledWith(lockApp());
      });
    });
  });
});
