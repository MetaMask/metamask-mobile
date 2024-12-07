import { Action } from 'redux';
import { take, fork, cancel } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import {
  UserActionType,
  authError,
  authSuccess,
  interruptBiometrics,
} from '../../actions/user';
import Routes from '../../constants/navigation/Routes';
import {
  biometricsStateMachine,
  authStateMachine,
  appLockStateMachine,
  lockKeyringAndApp,
  startAppServices,
} from './';
import { NavigationActionType } from '../../actions/navigation';
import EngineService from '../../core/EngineService';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';

const mockBioStateMachineId = '123';

const mockNavigate = jest.fn();

jest.mock('../../core/NavigationService', () => ({
  navigation: {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate: (screen: any, params?: any) => {
      params ? mockNavigate(screen, params) : mockNavigate(screen);
    },
  },
}));

// Mock the services
jest.mock('../../core/EngineService', () => ({
  start: jest.fn(),
}));

jest.mock('../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: {
    start: jest.fn(),
  },
}));

describe('authStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should fork appLockStateMachine when logged in', async () => {
    const generator = authStateMachine();
    expect(generator.next().value).toEqual(take(UserActionType.LOGIN));
    expect(generator.next().value).toEqual(fork(appLockStateMachine));
  });

  it('should cancel appLockStateMachine when logged out', async () => {
    const generator = authStateMachine();
    // Logged in
    generator.next();
    // Fork appLockStateMachine
    generator.next();
    expect(generator.next().value).toEqual(take(UserActionType.LOGOUT));
    expect(generator.next().value).toEqual(cancel());
  });
});

describe('appLockStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should fork biometricsStateMachine when app is locked', async () => {
    const generator = appLockStateMachine();
    expect(generator.next().value).toEqual(take(UserActionType.LOCKED_APP));
    // Fork biometrics listener.
    expect(generator.next().value).toEqual(
      fork(biometricsStateMachine, mockBioStateMachineId),
    );
  });

  it('should navigate to LockScreen when app is locked', async () => {
    const generator = appLockStateMachine();
    // Lock app.
    generator.next();
    // Fork biometricsStateMachine
    generator.next();
    // Move to next step
    generator.next();
    expect(mockNavigate).toBeCalledWith(Routes.LOCK_SCREEN, {
      bioStateMachineId: mockBioStateMachineId,
    });
  });
});

describe('biometricsStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should lock app if biometrics is interrupted', async () => {
    const generator = biometricsStateMachine(mockBioStateMachineId);
    // Take next step
    expect(generator.next().value).toEqual(
      take([
        UserActionType.AUTH_SUCCESS,
        UserActionType.AUTH_ERROR,
        UserActionType.INTERRUPT_BIOMETRICS,
      ]),
    );
    // Dispatch interrupt biometrics
    const nextFork = generator.next(interruptBiometrics() as Action).value;
    expect(nextFork).toEqual(fork(lockKeyringAndApp));
  });

  it('should navigate to Wallet when authenticating without interruptions via biometrics', async () => {
    const generator = biometricsStateMachine(mockBioStateMachineId);
    // Take next step
    generator.next();
    // Dispatch interrupt biometrics
    generator.next(authSuccess(mockBioStateMachineId) as Action);
    // Move to next step
    expect(mockNavigate).toBeCalledWith(Routes.ONBOARDING.HOME_NAV);
  });

  it('should not navigate to Wallet when authentication succeeds with different bioStateMachineId', async () => {
    const generator = biometricsStateMachine(mockBioStateMachineId);
    // Take next step
    generator.next();
    // Dispatch interrupt biometrics
    generator.next(authSuccess('wrongBioStateMachineId') as Action);
    // Move to next step
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should not do anything when AUTH_ERROR is encountered', async () => {
    const generator = biometricsStateMachine(mockBioStateMachineId);
    // Take next step
    generator.next();
    // Dispatch interrupt biometrics
    generator.next(authError(mockBioStateMachineId) as Action);
    // Move to next step
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// TODO: Update all saga tests to use expectSaga (more intuitive and easier to read)
describe('startAppServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start app services', async () => {
    await expectSaga(startAppServices)
      // Dispatch both required actions
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .run();

    // Verify services are started
    expect(EngineService.start).toHaveBeenCalled();
    expect(AppStateEventProcessor.start).toHaveBeenCalled();
  });

  it('should not start app services if navigation is not ready', async () => {
    await expectSaga(startAppServices)
      // Dispatch both required actions
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .run();

    // Verify services are not started
    expect(EngineService.start).not.toHaveBeenCalled();
    expect(AppStateEventProcessor.start).not.toHaveBeenCalled();
  });

  it('should not start app services if persisted data is not loaded', async () => {
    await expectSaga(startAppServices)
      // Dispatch both required actions
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .run();

    // Verify services are not started
    expect(EngineService.start).not.toHaveBeenCalled();
    expect(AppStateEventProcessor.start).not.toHaveBeenCalled();
  });
});
