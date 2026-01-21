import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getUserStorageControllerMessenger,
  getUserStorageControllerInitMessenger,
} from '../../messengers/identity/user-storage-controller-messenger';
import { ControllerInitRequest } from '../../types';
import { userStorageControllerInit } from './user-storage-controller-init';
import {
  Controller as UserStorageController,
  UserStorageControllerMessenger,
} from '@metamask/profile-sync-controller/user-storage';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { trackEvent } from '../../utils/analytics-utils';
import { MetaMetricsEvents } from '../../../Analytics';

jest.mock('@metamask/profile-sync-controller/user-storage');
jest.mock('../../utils/analytics-utils');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    UserStorageControllerMessenger,
    ReturnType<typeof getUserStorageControllerInitMessenger>
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getUserStorageControllerMessenger(baseMessenger),
    initMessenger: getUserStorageControllerInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('UserStorageControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = userStorageControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(UserStorageController);
  });

  it('passes the proper arguments to the controller', () => {
    userStorageControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(UserStorageController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      nativeScryptCrypto: expect.any(Function),
      trace: expect.any(Function),
      config: {
        contactSyncing: {
          onContactUpdated: expect.any(Function),
          onContactDeleted: expect.any(Function),
          onContactSyncErroneousSituation: expect.any(Function),
        },
      },
    });
  });

  describe('trackEvent integration', () => {
    it('calls trackEvent when onContactUpdated is invoked', () => {
      const requestMock = getInitRequestMock();
      userStorageControllerInit(requestMock);

      const controllerMock = jest.mocked(UserStorageController);
      const onContactUpdated =
        controllerMock.mock.calls[0][0].config.contactSyncing.onContactUpdated;

      onContactUpdated('test-profile-id');

      expect(trackEvent).toHaveBeenCalledWith(
        requestMock.initMessenger,
        MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
        {
          profile_id: 'test-profile-id',
          feature_name: 'Contacts Sync',
          action: 'Contacts Sync Contact Updated',
        },
      );
    });

    it('calls trackEvent when onContactDeleted is invoked', () => {
      const requestMock = getInitRequestMock();
      userStorageControllerInit(requestMock);

      const controllerMock = jest.mocked(UserStorageController);
      const onContactDeleted =
        controllerMock.mock.calls[0][0].config.contactSyncing.onContactDeleted;

      onContactDeleted('test-profile-id');

      expect(trackEvent).toHaveBeenCalledWith(
        requestMock.initMessenger,
        MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
        {
          profile_id: 'test-profile-id',
          feature_name: 'Contacts Sync',
          action: 'Contacts Sync Contact Deleted',
        },
      );
    });

    it('calls trackEvent when onContactSyncErroneousSituation is invoked', () => {
      const requestMock = getInitRequestMock();
      userStorageControllerInit(requestMock);

      const controllerMock = jest.mocked(UserStorageController);
      const onContactSyncErroneousSituation =
        controllerMock.mock.calls[0][0].config.contactSyncing
          .onContactSyncErroneousSituation;

      onContactSyncErroneousSituation('test-profile-id', 'Test error message');

      expect(trackEvent).toHaveBeenCalledWith(
        requestMock.initMessenger,
        MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
        {
          profile_id: 'test-profile-id',
          feature_name: 'Contacts Sync',
          action: 'Contacts Sync Erroneous Situation',
          additional_description: 'Test error message',
        },
      );
    });
  });
});
