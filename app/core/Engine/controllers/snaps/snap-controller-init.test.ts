import {
  SnapController,
  SnapControllerMessenger,
} from '@metamask/snaps-controllers';
import { MessengerClientInitRequest } from '../../types';
import {
  getSnapControllerInitMessenger,
  getSnapControllerMessenger,
  SnapControllerInitMessenger,
} from '../../messengers/snaps';
import { snapControllerInit } from './snap-controller-init';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  KeyringControllerLockEvent,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import { store, runSaga } from '../../../../store';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/snaps-controllers');
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('.../../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
  runSaga: jest
    .fn()
    .mockReturnValue({ toPromise: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock('../../../../util/test/utils', () => ({
  isTestEnvironment: false,
}));

function getInitRequestMock(
  baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  }),
): jest.Mocked<
  MessengerClientInitRequest<
    SnapControllerMessenger,
    SnapControllerInitMessenger
  >
> {
  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getSnapControllerMessenger(baseMessenger),
    initMessenger: getSnapControllerInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('SnapControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      clientConfig: {
        type: 'mobile',
        version: '1.0.0',
      },
      getFeatureFlags: expect.any(Function),
      getMnemonicSeed: expect.any(Function),
      maxIdleTime: expect.any(Number),
      maxRequestTime: expect.any(Number),
      preinstalledSnaps: expect.any(Array),
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
