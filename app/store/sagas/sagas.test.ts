import { Action } from 'redux';
import { take, fork, cancel } from 'redux-saga/effects';
import {
  AUTH_ERROR,
  AUTH_SUCCESS,
  INTERUPT_BIOMETRICS,
  IN_APP,
  LOCKED_APP,
  OUT_APP,
  authError,
  authSuccess,
  interuptBiometrics,
} from '../../actions/user';
import Routes from '../../constants/navigation/Routes';
import {
  biometricsStateMachine,
  authStateMachine,
  appLockStateMachine,
  lockKeyringAndApp,
} from './';

const mockBioStateMachineId = '123';
const mockNavigate = jest.fn();
jest.mock('../../core/NavigationService', () => ({
  navigation: {
    navigate: (screen: any, params?: any) => {
      params ? mockNavigate(screen, params) : mockNavigate(screen);
    },
  },
}));

describe('authStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should fork appLockStateMachine when logged in', async () => {
    const generator = authStateMachine();
    expect(generator.next().value).toEqual(take(IN_APP));
    expect(generator.next().value).toEqual(fork(appLockStateMachine));
  });

  it('should cancel appLockStateMachine when logged out', async () => {
    const generator = authStateMachine();
    // Logged in
    generator.next();
    // Fork appLockStateMachine
    generator.next();
    expect(generator.next().value).toEqual(take(OUT_APP));
    expect(generator.next().value).toEqual(cancel());
  });
});

describe('appLockStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should fork biometricsStateMachine when app is locked', async () => {
    const generator = appLockStateMachine();
    expect(generator.next().value).toEqual(take(LOCKED_APP));
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
      take([AUTH_SUCCESS, AUTH_ERROR, INTERUPT_BIOMETRICS]),
    );
    // Dispatch interrupt biometrics
    const nextFork = generator.next(interuptBiometrics() as Action).value;
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
