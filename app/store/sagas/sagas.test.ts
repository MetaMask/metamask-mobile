import { Action } from 'redux';
import { take, fork, cancel, call } from 'redux-saga/effects';
import {
  AUTH_ERROR,
  AUTH_SUCCESS,
  INTERRUPT_BIOMETRICS,
  LOGIN,
  LOCKED_APP,
  LOGOUT,
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
} from './';

import {
  signIn,
  signOut,
  enableProfileSyncing,
  disableProfileSyncing,
  enableMetamaskNotifications,
  disableMetamaskNotifications,
  setFeatureAnnouncementsEnabled,
  setSnapNotificationsEnabled,
  setParticipateInMetaMetrics,
  checkAccountsPresence,
  setMetamaskNotificationsFeatureSeen,
  fetchAndUpdateMetamaskNotifications,
  markMetamaskNotificationsAsRead,
  deleteNotifications,
} from './notifications';
import { NotificationsTypes } from '../ducks/notifications';

const mockBioStateMachineId = '123';
const mockNavigate = jest.fn();
jest.mock('../../core/NavigationService', () => ({
  navigation: {
    navigate: (screen: any, params?: any) => {
      params ? mockNavigate(screen, params) : mockNavigate(screen);
    },
  },
}));

const MOCK_ADDRESS_1 = '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A';
const MOCK_ADDRESS_2 = '0x519d2CE57898513F676a5C3b66496c3C394c9CC7';

describe('authStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should fork appLockStateMachine when logged in', async () => {
    const generator = authStateMachine();
    expect(generator.next().value).toEqual(take(LOGIN));
    expect(generator.next().value).toEqual(fork(appLockStateMachine));
  });

  it('should cancel appLockStateMachine when logged out', async () => {
    const generator = authStateMachine();
    // Logged in
    generator.next();
    // Fork appLockStateMachine
    generator.next();
    expect(generator.next().value).toEqual(take(LOGOUT));
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
      take([AUTH_SUCCESS, AUTH_ERROR, INTERRUPT_BIOMETRICS]),
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

describe('notifications', () => {
  it('should trigger signIn when action PERFORM_SIGN_IN_REQUEST is dispatched', async () => {
    const generator = signIn();
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.PERFORM_SIGN_IN_REQUEST),
    );
    expect(generator.next().value).toEqual(call(signIn));
  });

  it('should trigger signOut when action PERFORM_SIGN_OUT_REQUEST is dispatched', async () => {
    const generator = signOut();
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.PERFORM_SIGN_OUT_REQUEST),
    );
    expect(generator.next().value).toEqual(call(signOut));
  });

  it('should trigger enableProfileSyncing when action ENABLE_PROFILE_SYNCING_REQUEST is dispatched', async () => {
    const generator = enableProfileSyncing();
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.ENABLE_PROFILE_SYNCING_REQUEST),
    );
    expect(generator.next().value).toEqual(call(enableProfileSyncing));
  });

  it('should trigger disableProfileSyncing when action DISABLE_PROFILE_SYNCING_REQUEST is dispatched', async () => {
    const generator = disableProfileSyncing();
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.DISABLE_PROFILE_SYNCING_REQUEST),
    );
    expect(generator.next().value).toEqual(call(disableProfileSyncing));
  });

  it('should trigger enableMetamaskNotifications when action ENABLE_PUSH_NOTIFICATIONS_REQUEST is dispatched', async () => {
    const generator = enableMetamaskNotifications();
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.ENABLE_PUSH_NOTIFICATIONS_REQUEST),
    );
    expect(generator.next().value).toEqual(call(enableMetamaskNotifications));
  });

  it('should trigger disableMetamaskNotifications when action DISABLE_PUSH_NOTIFICATIONS_REQUEST is dispatched', async () => {
    const generator = disableMetamaskNotifications();
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.DISABLE_PUSH_NOTIFICATIONS_REQUEST),
    );
    expect(generator.next().value).toEqual(call(disableMetamaskNotifications));
  });

  it('should trigger setFeatureAnnouncementsEnabled when action SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST is dispatched', async () => {
    const generator = setFeatureAnnouncementsEnabled();
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST),
    );
    expect(generator.next().value).toEqual(
      call(setFeatureAnnouncementsEnabled),
    );
  });

  it('should trigger setSnapNotificationsEnabled when action SET_SNAP_NOTIFICATIONS_ENABLED_REQUEST is dispatched', async () => {
    const generator = setSnapNotificationsEnabled();
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.SET_SNAP_NOTIFICATIONS_ENABLED_REQUEST),
    );
    expect(generator.next().value).toEqual(call(setSnapNotificationsEnabled));
  });

  it('should trigger setParticipateInMetaMetrics when action SET_PARTICIPATE_IN_META_METRICS_REQUEST is dispatched', async () => {
    const generator = setParticipateInMetaMetrics();
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.SET_PARTICIPATE_IN_META_METRICS_REQUEST),
    );
    expect(generator.next().value).toEqual(call(setParticipateInMetaMetrics));
  });

  it('should trigger setMetamaskNotificationsFeatureSeen when action SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_REQUEST is dispatched', async () => {
    const generator = setMetamaskNotificationsFeatureSeen();
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_REQUEST),
    );
    expect(generator.next().value).toEqual(
      call(setMetamaskNotificationsFeatureSeen),
    );
  });

  it('should trigger fetchAndUpdateMetamaskNotifications when action FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_REQUEST is dispatched', async () => {
    const generator = fetchAndUpdateMetamaskNotifications();
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_REQUEST),
    );
    expect(generator.next().value).toEqual(
      call(fetchAndUpdateMetamaskNotifications),
    );
  });

  it('should trigger checkAccountsPresence when action CHECK_ACCOUNTS_PRESENCE_REQUEST is dispatched', async () => {
    const accounts = [MOCK_ADDRESS_1, MOCK_ADDRESS_2];
    const generator = checkAccountsPresence(accounts);
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.CHECK_ACCOUNTS_PRESENCE_REQUEST),
    );
    expect(generator.next().value).toEqual(
      call(() => checkAccountsPresence(accounts)),
    );
  });

  it('should trigger markMetamaskNotificationsAsRead when action MARK_METAMASK_NOTIFICATIONS_AS_READ_REQUEST is dispatched', async () => {
    const notifications = [
      {
        id: '01',
        isRead: false,
        createdAt: Date.now(),
      },
    ];

    const generator = markMetamaskNotificationsAsRead(notifications);
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.MARK_METAMASK_NOTIFICATIONS_AS_READ_REQUEST),
    );
    expect(generator.next().value).toEqual(
      call(() => markMetamaskNotificationsAsRead(notifications)),
    );
  });

  it('should trigger deleteNotifications when action DELETE_NOTIFICATION_STATUS_REQUEST is dispatched', async () => {
    const notifications = [
      {
        id: '01',
        isRead: false,
        createdAt: Date.now(),
      },
    ];
    const generator = deleteNotifications(notifications);
    expect(generator.next().value).toEqual(
      take(NotificationsTypes.DELETE_NOTIFICATION_STATUS_REQUEST),
    );
    expect(generator.next().value).toEqual(
      call(() => deleteNotifications(notifications)),
    );
  });
});
