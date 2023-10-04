import LockManagerService from '.';
import { AppState } from 'react-native';
import configureMockStore from 'redux-mock-store';
import { interruptBiometrics, lockApp } from '../../actions/user';

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      setLocked: jest.fn().mockImplementation(() => Promise.resolve({})),
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

const initialState = {
  settings: {
    lockTime: 0,
  },
};
const mockStore = configureMockStore();
const defaultStore = mockStore(initialState);

describe('startListening', () => {
  const addEventListener = jest.spyOn(AppState, 'addEventListener');

  afterEach(() => {
    LockManagerService.stopListening();
    jest.clearAllMocks();
  });

  it('should do nothing when store is undefined.', async () => {
    LockManagerService.startListening();
    expect(addEventListener).not.toBeCalled();
  });

  it('should do nothing when app state listener is already subscribed.', async () => {
    LockManagerService.init(defaultStore);
    LockManagerService.startListening();
    expect(addEventListener).toBeCalledTimes(1);
    LockManagerService.startListening();
    expect(addEventListener).toBeCalledTimes(1);
  });

  it('should add event listener when store is defined and listener is not yet subscribed.', async () => {
    LockManagerService.init(defaultStore);
    LockManagerService.startListening();
    expect(addEventListener).toBeCalled();
  });
});

describe('stopListening', () => {
  const addEventListener = jest.spyOn(AppState, 'addEventListener');

  afterEach(() => {
    LockManagerService.stopListening();
    jest.clearAllMocks();
  });

  it('should remove app state listener.', async () => {
    LockManagerService.init(defaultStore);
    LockManagerService.startListening();
    expect(addEventListener).toBeCalledTimes(1);
    LockManagerService.stopListening();
    LockManagerService.startListening();
    expect(addEventListener).toBeCalledTimes(2);
  });
});

describe('handleAppStateChange', () => {
  const addEventListener = jest.spyOn(AppState, 'addEventListener');
  const defaultDispatch = jest.spyOn(defaultStore, 'dispatch');

  afterEach(() => {
    LockManagerService.stopListening();
    jest.clearAllMocks();
  });

  it('should do nothing if lockTime is -1 while going into the background', async () => {
    const store = mockStore({ settings: { lockTime: -1 } });
    LockManagerService.init(store);
    LockManagerService.startListening();
    const appStateTrigger = addEventListener.mock.calls[0][1];
    appStateTrigger('background');
    expect(defaultDispatch).not.toBeCalled();
  });

  it('should do nothing if lockTime is 0 while going inactive.', async () => {
    const store = mockStore({ settings: { lockTime: 0 } });
    LockManagerService.init(store);
    LockManagerService.startListening();
    const appStateTrigger = addEventListener.mock.calls[0][1];
    appStateTrigger('inactive');
    expect(defaultDispatch).not.toBeCalled();
  });

  it('should do nothing while lockTime is 0 while going from inactive to active', async () => {
    const store = mockStore({ settings: { lockTime: 0 } });
    LockManagerService.init(store);
    LockManagerService.startListening();
    const appStateTrigger = addEventListener.mock.calls[0][1];
    appStateTrigger('inactive');
    appStateTrigger('active');
    expect(defaultDispatch).not.toBeCalled();
  });

  it('should dispatch interruptBiometrics when lockTimer is undefined, lockTime is non-zero, and app state is not active', async () => {
    const store = mockStore({ settings: { lockTime: 5 } });
    const dispatch = jest.spyOn(store, 'dispatch');
    LockManagerService.init(store);
    LockManagerService.startListening();
    const appStateTrigger = addEventListener.mock.calls[0][1];
    appStateTrigger('background');
    expect(dispatch).toBeCalledWith(interruptBiometrics());
  });

  it('should dispatch lockApp when lockTimer is 0 while going into the background', async () => {
    const store = mockStore({ settings: { lockTime: 0 } });
    const dispatch = jest.spyOn(store, 'dispatch');
    LockManagerService.init(store);
    LockManagerService.startListening();
    const appStateTrigger = addEventListener.mock.calls[0][1];
    appStateTrigger('background');
    expect(await dispatch).toBeCalledWith(lockApp());
  });

  it('should set background timer when lockTimer is non-zero while going into the background', async () => {
    const store = mockStore({ settings: { lockTime: 5 } });
    LockManagerService.init(store);
    LockManagerService.startListening();
    const appStateTrigger = addEventListener.mock.calls[0][1];
    appStateTrigger('background');
    expect(mockSetTimeout).toBeCalled();
  });
});
