import { LockManagerService } from '.';
import { AppState, AppStateStatus } from 'react-native';
import {
  interruptBiometrics,
  lockApp,
  checkForDeeplink,
} from '../../actions/user';
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

jest.mock('react-native-background-timer', () => ({
  setTimeout: () => mockSetTimeout(),
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

    it('should dispatch interruptBiometrics when lockTimer is undefined, lockTime is non-zero, and app state is not active', async () => {
      const mockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({ settings: { lockTime: 5 } }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);
      lockManagerService.startListening();
      mockAppStateListener('background');
      expect(mockDispatch).toHaveBeenCalledWith(interruptBiometrics());
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
  });
});
