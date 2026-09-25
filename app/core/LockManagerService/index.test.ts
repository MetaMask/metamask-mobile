import { LockManagerService } from '.';
import { AppState, AppStateStatus } from 'react-native';
import { lockApp, checkForDeeplink } from '../../actions/user';
import Logger from '../../util/Logger';
import ReduxService, { type ReduxStore } from '../redux';
import Engine from '../Engine';

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      setLocked: jest.fn().mockResolvedValue(true),
      isUnlocked: jest.fn().mockReturnValue(true),
    },
  },
}));

const mockSetTimeout = jest.fn();
const mockClearTimeout = jest.fn();

jest.mock('react-native-background-timer', () => ({
  setTimeout: (callback: () => void) => mockSetTimeout(callback),
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
    (Engine.context.KeyringController.isUnlocked as jest.Mock).mockReturnValue(
      true,
    );
    (Engine.context.KeyringController.setLocked as jest.Mock).mockResolvedValue(
      true,
    );
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
      await mockAppStateListener('inactive');
      await mockAppStateListener('active');
      expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
    });

    it('should dispatch lockApp when lockTimer is 0 while going into the background', async () => {
      const mockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({ settings: { lockTime: 0 } }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);
      lockManagerService.startListening();
      await mockAppStateListener('background');
      await Promise.resolve();
      expect(mockDispatch).toHaveBeenCalledWith(lockApp());
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

    it('clears the pending background timer when resuming through inactive', async () => {
      const mockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({ settings: { lockTime: 5 } }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);
      lockManagerService.startListening();

      // Android resumes as background -> inactive -> active, which takes the
      // ignored-transition path and must still cancel the pending lock.
      await mockAppStateListener('background');
      await mockAppStateListener('inactive');
      await mockAppStateListener('active');

      expect(mockClearTimeout).toHaveBeenCalledWith(1);
    });

    it('parses a pending deeplink after resume cancels auto-lock before it fires', async () => {
      const mockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({ settings: { lockTime: 5 } }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);
      lockManagerService.startListening();

      await mockAppStateListener('background');
      await mockAppStateListener('inactive');
      await mockAppStateListener('active');

      expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
      expect(mockDispatch).not.toHaveBeenCalledWith(lockApp());
    });

    it('does not parse a deeplink on resume when auto-lock already locked the wallet', async () => {
      const mockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({ settings: { lockTime: 5 } }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);
      lockManagerService.startListening();

      await mockAppStateListener('background');
      const scheduledLock = mockSetTimeout.mock.calls[0][0] as () => void;
      scheduledLock();
      await Promise.resolve();
      (
        Engine.context.KeyringController.isUnlocked as jest.Mock
      ).mockReturnValue(false);

      await mockAppStateListener('inactive');
      await mockAppStateListener('active');

      expect(mockDispatch).toHaveBeenCalledWith(lockApp());
      expect(mockDispatch).not.toHaveBeenCalledWith(checkForDeeplink());
    });

    it('waits for an in-flight auto-lock before deciding whether to parse a deeplink', async () => {
      let releaseLock: () => void = () => undefined;
      (
        Engine.context.KeyringController.setLocked as jest.Mock
      ).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            releaseLock = resolve;
          }),
      );
      const mockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({ settings: { lockTime: 5 } }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);
      lockManagerService.startListening();

      await mockAppStateListener('background');
      const scheduledLock = mockSetTimeout.mock.calls[0][0] as () => void;
      scheduledLock();

      expect(lockManagerService.isAutoLockPending()).toBe(true);

      const resume = mockAppStateListener('inactive').then(() =>
        mockAppStateListener('active'),
      );
      await Promise.resolve();

      expect(mockDispatch).not.toHaveBeenCalledWith(checkForDeeplink());
      expect(mockDispatch).not.toHaveBeenCalledWith(lockApp());

      (
        Engine.context.KeyringController.isUnlocked as jest.Mock
      ).mockReturnValue(false);
      releaseLock();
      await resume;

      expect(mockDispatch).toHaveBeenCalledWith(lockApp());
      expect(mockDispatch).not.toHaveBeenCalledWith(checkForDeeplink());
    });
  });
});
