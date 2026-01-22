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
import { trackEvent } from '../../utils/analytics';
import { MetaMetricsEvents } from '../../../Analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import type { AnalyticsTrackingEvent } from '@metamask/analytics-controller';

jest.mock('@metamask/profile-sync-controller/user-storage');
jest.mock('../../utils/analytics');
jest.mock('../../../../util/analytics/AnalyticsEventBuilder');

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
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AnalyticsEventBuilder
    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        name: 'mock-event',
        properties: {},
        sensitiveProperties: {},
        saveDataRecording: false,
        get isAnonymous(): boolean {
          return false;
        },
        get hasProperties(): boolean {
          return false;
        },
      } as unknown as AnalyticsTrackingEvent),
    });
  });

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
      const mockBuiltEvent = {
        name: MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
        properties: {
          profile_id: 'test-profile-id',
          feature_name: 'Contacts Sync',
          action: 'Contacts Sync Contact Updated',
        },
        sensitiveProperties: {},
        saveDataRecording: false,
        get isAnonymous(): boolean {
          return false;
        },
        get hasProperties(): boolean {
          return true;
        },
      } as unknown as AnalyticsTrackingEvent;

      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue(mockBuiltEvent),
      };
      (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
        mockBuilder,
      );

      userStorageControllerInit(requestMock);

      const controllerMock = jest.mocked(UserStorageController);
      const onContactUpdated =
        controllerMock.mock.calls[0]?.[0]?.config?.contactSyncing
          ?.onContactUpdated;

      expect(onContactUpdated).toBeDefined();
      onContactUpdated?.('test-profile-id');

      // Assert - verify AnalyticsEventBuilder was called correctly
      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
      );
      expect(mockBuilder.addProperties).toHaveBeenCalledWith({
        profile_id: 'test-profile-id',
        feature_name: 'Contacts Sync',
        action: 'Contacts Sync Contact Updated',
      });
      expect(mockBuilder.build).toHaveBeenCalled();

      // Verify trackEvent was called with the built event
      expect(trackEvent).toHaveBeenCalledWith(
        requestMock.initMessenger,
        mockBuiltEvent,
      );
    });

    it('calls trackEvent when onContactDeleted is invoked', () => {
      const requestMock = getInitRequestMock();
      const mockBuiltEvent = {
        name: MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
        properties: {
          profile_id: 'test-profile-id',
          feature_name: 'Contacts Sync',
          action: 'Contacts Sync Contact Deleted',
        },
        sensitiveProperties: {},
        saveDataRecording: false,
        get isAnonymous(): boolean {
          return false;
        },
        get hasProperties(): boolean {
          return true;
        },
      } as unknown as AnalyticsTrackingEvent;

      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue(mockBuiltEvent),
      };
      (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
        mockBuilder,
      );

      userStorageControllerInit(requestMock);

      const controllerMock = jest.mocked(UserStorageController);
      const onContactDeleted =
        controllerMock.mock.calls[0]?.[0]?.config?.contactSyncing
          ?.onContactDeleted;

      expect(onContactDeleted).toBeDefined();
      onContactDeleted?.('test-profile-id');

      // Assert - verify AnalyticsEventBuilder was called correctly
      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
      );
      expect(mockBuilder.addProperties).toHaveBeenCalledWith({
        profile_id: 'test-profile-id',
        feature_name: 'Contacts Sync',
        action: 'Contacts Sync Contact Deleted',
      });
      expect(mockBuilder.build).toHaveBeenCalled();

      // Verify trackEvent was called with the built event
      expect(trackEvent).toHaveBeenCalledWith(
        requestMock.initMessenger,
        mockBuiltEvent,
      );
    });

    it('calls trackEvent when onContactSyncErroneousSituation is invoked', () => {
      const requestMock = getInitRequestMock();
      const mockBuiltEvent = {
        name: MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
        properties: {
          profile_id: 'test-profile-id',
          feature_name: 'Contacts Sync',
          action: 'Contacts Sync Erroneous Situation',
          additional_description: 'Test error message',
        },
        sensitiveProperties: {},
        saveDataRecording: false,
        get isAnonymous(): boolean {
          return false;
        },
        get hasProperties(): boolean {
          return true;
        },
      } as unknown as AnalyticsTrackingEvent;

      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue(mockBuiltEvent),
      };
      (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
        mockBuilder,
      );

      userStorageControllerInit(requestMock);

      const controllerMock = jest.mocked(UserStorageController);
      const onContactSyncErroneousSituation =
        controllerMock.mock.calls[0]?.[0]?.config?.contactSyncing
          ?.onContactSyncErroneousSituation;

      expect(onContactSyncErroneousSituation).toBeDefined();
      onContactSyncErroneousSituation?.(
        'test-profile-id',
        'Test error message',
      );

      // Assert - verify AnalyticsEventBuilder was called correctly
      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
      );
      expect(mockBuilder.addProperties).toHaveBeenCalledWith({
        profile_id: 'test-profile-id',
        feature_name: 'Contacts Sync',
        action: 'Contacts Sync Erroneous Situation',
        additional_description: 'Test error message',
      });
      expect(mockBuilder.build).toHaveBeenCalled();

      // Verify trackEvent was called with the built event
      expect(trackEvent).toHaveBeenCalledWith(
        requestMock.initMessenger,
        mockBuiltEvent,
      );
    });
  });
});
