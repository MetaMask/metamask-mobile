import { SnapController } from '@metamask/snaps-controllers';
import { ControllerInitRequest } from '../../types';
import {
  getSnapControllerInitMessenger,
  getSnapControllerMessenger,
  SnapControllerInitMessenger,
  SnapControllerMessenger,
} from '../../messengers/snaps';
import { snapControllerInit } from './snap-controller-init';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  KeyringControllerLockEvent,
  KeyringControllerUnlockEvent,
  KeyringControllerGetKeyringsByTypeAction,
} from '@metamask/keyring-controller';
import { store, runSaga } from '../../../../store';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { trackEvent } from '../../utils/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import type { AnalyticsTrackingEvent } from '@metamask/analytics-controller';

jest.mock('@metamask/snaps-controllers');
jest.mock('../../utils/analytics');
jest.mock('../../../../util/analytics/AnalyticsEventBuilder');

jest.mock('.../../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
  runSaga: jest
    .fn()
    .mockReturnValue({ toPromise: jest.fn().mockResolvedValue(undefined) }),
}));

function getInitRequestMock(
  baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  }),
): jest.Mocked<
  ControllerInitRequest<SnapControllerMessenger, SnapControllerInitMessenger>
> {
  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getSnapControllerMessenger(baseMessenger),
    initMessenger: getSnapControllerInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('SnapControllerInit', () => {
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
    const { controller } = snapControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(SnapController);
  });

  it('passes the proper arguments to the controller', () => {
    snapControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(SnapController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      clientCryptography: {
        pbkdf2Sha512: expect.any(Function),
        hmacSha512: expect.any(Function),
      },
      detectSnapLocation: expect.any(Function),
      encryptor: expect.any(Object),
      environmentEndowmentPermissions: expect.any(Array),
      excludedPermissions: expect.any(Object),
      featureFlags: {
        allowLocalSnaps: false,
        disableSnapInstallation: true,
        requireAllowlist: true,
        forcePreinstalledSnaps: false,
        autoUpdatePreinstalledSnaps: true,
      },
      getFeatureFlags: expect.any(Function),
      getMnemonicSeed: expect.any(Function),
      maxIdleTime: expect.any(Number),
      maxRequestTime: expect.any(Number),
      preinstalledSnaps: expect.any(Array),
      trackEvent: expect.any(Function),
      ensureOnboardingComplete: expect.any(Function),
    });
  });

  it('calls `SnapController:setClientActive` when the client is locked', () => {
    const baseMessenger = new ExtendedMessenger<
      MockAnyNamespace,
      never,
      KeyringControllerLockEvent
    >({
      namespace: MOCK_ANY_NAMESPACE,
    });

    const request = getInitRequestMock(baseMessenger);
    const { initMessenger } = request;

    const spy = jest.spyOn(initMessenger, 'call').mockImplementation();

    snapControllerInit(request);
    baseMessenger.publish('KeyringController:lock');

    expect(spy).toHaveBeenCalledWith('SnapController:setClientActive', false);
  });

  it('calls `SnapController:setClientActive` when the client is unlocked', () => {
    const baseMessenger = new ExtendedMessenger<
      MockAnyNamespace,
      never,
      KeyringControllerUnlockEvent
    >({
      namespace: MOCK_ANY_NAMESPACE,
    });

    const request = getInitRequestMock(baseMessenger);
    const { initMessenger } = request;

    const spy = jest.spyOn(initMessenger, 'call').mockImplementation();

    snapControllerInit(request);
    baseMessenger.publish('KeyringController:unlock');

    expect(spy).toHaveBeenCalledWith('SnapController:setClientActive', true);
  });

  describe('getMnemonicSeed', () => {
    it('returns the mnemonic seed', async () => {
      const messenger = new ExtendedMessenger<
        MockAnyNamespace,
        KeyringControllerGetKeyringsByTypeAction,
        never
      >({
        namespace: MOCK_ANY_NAMESPACE,
      });

      snapControllerInit(getInitRequestMock(messenger));

      const mock = jest.mocked(SnapController);
      const getMnemonicSeed = mock.mock.calls[0][0].getMnemonicSeed;

      const seed = new Uint8Array([1, 2, 3, 4]);
      messenger.registerActionHandler(
        'KeyringController:getKeyringsByType',
        () => [
          {
            type: 'HD Key Tree',
            seed,
          },
        ],
      );

      await expect(getMnemonicSeed()).resolves.toBe(seed);
    });

    it('throws an error if the keyring is not available', async () => {
      const messenger = new ExtendedMessenger<
        MockAnyNamespace,
        KeyringControllerGetKeyringsByTypeAction,
        never
      >({
        namespace: MOCK_ANY_NAMESPACE,
      });

      snapControllerInit(getInitRequestMock(messenger));

      const controllerMock = jest.mocked(SnapController);
      const getMnemonicSeed = controllerMock.mock.calls[0][0].getMnemonicSeed;

      messenger.registerActionHandler(
        'KeyringController:getKeyringsByType',
        () => [],
      );

      await expect(getMnemonicSeed()).rejects.toThrow(
        'Primary keyring mnemonic unavailable.',
      );
    });
  });

  describe('getFeatureFlags', () => {
    it('returns the dynamic feature flags', () => {
      snapControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(SnapController);
      const getFeatureFlags = controllerMock.mock.calls[0][0].getFeatureFlags;

      // @ts-expect-error: Partial mock.
      jest.mocked(store.getState).mockReturnValue({
        settings: {
          basicFunctionalityEnabled: true,
        },
      });

      expect(getFeatureFlags()).toEqual({
        disableSnaps: false,
      });
    });
  });

  describe('trackEvent', () => {
    it('calls trackEvent utility with correct parameters', () => {
      const baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
        namespace: MOCK_ANY_NAMESPACE,
      });

      const mockInitMessenger = {
        call: jest.fn(),
        subscribe: jest.fn(),
      } as unknown as SnapControllerInitMessenger;

      const requestMock = {
        ...buildControllerInitRequestMock(baseMessenger),
        controllerMessenger: getSnapControllerMessenger(baseMessenger),
        initMessenger: mockInitMessenger,
      };

      const mockBuiltEvent = {
        name: 'test-event',
        properties: { testProperty: 'test-value' },
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

      snapControllerInit(requestMock);

      const controllerMock = jest.mocked(SnapController);
      const trackEventFn = controllerMock.mock.calls[0]?.[0]?.trackEvent;

      expect(trackEventFn).toBeDefined();
      // @ts-expect-error: Our wrapper function has a different signature than SnapController expects
      trackEventFn({
        event: 'test-event',
        properties: {
          testProperty: 'test-value',
        },
      });

      // Assert - verify AnalyticsEventBuilder was called correctly
      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        'test-event',
      );
      expect(mockBuilder.addProperties).toHaveBeenCalledWith({
        testProperty: 'test-value',
      });
      expect(mockBuilder.build).toHaveBeenCalled();

      // Verify trackEvent was called with the built event
      expect(trackEvent).toHaveBeenCalledWith(
        mockInitMessenger,
        mockBuiltEvent,
      );
    });

    it('calls trackEvent utility with empty properties when properties are not provided', () => {
      const baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
        namespace: MOCK_ANY_NAMESPACE,
      });

      const mockInitMessenger = {
        call: jest.fn(),
        subscribe: jest.fn(),
      } as unknown as SnapControllerInitMessenger;

      const requestMock = {
        ...buildControllerInitRequestMock(baseMessenger),
        controllerMessenger: getSnapControllerMessenger(baseMessenger),
        initMessenger: mockInitMessenger,
      };

      const mockBuiltEvent = {
        name: 'test-event',
        properties: {},
        sensitiveProperties: {},
        saveDataRecording: false,
        get isAnonymous(): boolean {
          return false;
        },
        get hasProperties(): boolean {
          return false;
        },
      } as unknown as AnalyticsTrackingEvent;

      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue(mockBuiltEvent),
      };
      (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
        mockBuilder,
      );

      snapControllerInit(requestMock);

      const controllerMock = jest.mocked(SnapController);
      const trackEventFn = controllerMock.mock.calls[0]?.[0]?.trackEvent;

      expect(trackEventFn).toBeDefined();
      // @ts-expect-error: Our wrapper function has a different signature than SnapController expects
      trackEventFn({
        event: 'test-event',
      });

      // Assert - verify AnalyticsEventBuilder was called correctly
      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        'test-event',
      );
      expect(mockBuilder.addProperties).toHaveBeenCalledWith({});
      expect(mockBuilder.build).toHaveBeenCalled();

      // Verify trackEvent was called with the built event
      expect(trackEvent).toHaveBeenCalledWith(
        mockInitMessenger,
        mockBuiltEvent,
      );
    });
  });

  describe('ensureOnboardingComplete', () => {
    it('returns if true onboarding has already completed', async () => {
      snapControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(SnapController);
      const ensureOnboardingComplete =
        controllerMock.mock.calls[0][0].ensureOnboardingComplete;

      jest.mocked(store.getState).mockReturnValue({
        // @ts-expect-error: Partial mock.
        onboarding: {
          completedOnboarding: true,
        },
      });

      expect(await ensureOnboardingComplete()).toBeUndefined();
    });

    it('returns a promise if onboarding is ongoing', async () => {
      snapControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(SnapController);
      const ensureOnboardingComplete =
        controllerMock.mock.calls[0][0].ensureOnboardingComplete;

      jest.mocked(store.getState).mockReturnValue({
        // @ts-expect-error: Partial mock.
        onboarding: {
          completedOnboarding: false,
        },
      });

      expect(await ensureOnboardingComplete()).toBeUndefined();
      expect(runSaga).toHaveBeenCalled();
    });
  });
});
