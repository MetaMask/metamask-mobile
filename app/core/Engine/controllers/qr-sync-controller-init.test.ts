import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { MessengerClientInitRequest } from '../types';
import {
  QrSyncController,
  defaultQrSyncControllerState,
} from '../../QrSync/QrSyncController';
import { QrSyncPhases } from '../../QrSync/constants';
import type {
  QrSyncControllerMessenger,
  QrSyncControllerState,
} from '../../QrSync/controller-types';
import { qrSyncControllerInit } from './qr-sync-controller-init';
import { getQrSyncControllerMessenger } from '../messengers/qr-sync-controller-messenger';
import { KeyManager } from '../../SDKConnectV2/services/key-manager';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { registerE2EQrSyncDeepLinkHandler } from '../../QrSync/e2eBridgeQrSync';

jest.mock('../../SDKConnectV2/services/key-manager', () => ({
  KeyManager: jest.fn(),
}));

const mockHasTestOverrides = jest.fn(() => false);

jest.mock('../../../util/test/utils', () => ({
  get hasTestOverrides() {
    return mockHasTestOverrides();
  },
}));

jest.mock('../../QrSync/e2eBridgeQrSync', () => ({
  registerE2EQrSyncDeepLinkHandler: jest.fn(),
}));

describe('qrSyncControllerInit', () => {
  const keyManagerClassMock = jest.mocked(KeyManager);
  const registerE2EQrSyncDeepLinkHandlerMock = jest.mocked(
    registerE2EQrSyncDeepLinkHandler,
  );
  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<QrSyncControllerMessenger>
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasTestOverrides.mockReturnValue(false);

    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

    initRequestMock = {
      ...buildMessengerClientInitRequestMock(baseControllerMessenger),
      controllerMessenger: getQrSyncControllerMessenger(
        baseControllerMessenger,
      ),
    };
  });

  it('returns a controller instance', () => {
    const result = qrSyncControllerInit(initRequestMock);

    expect(result.controller).toBeInstanceOf(QrSyncController);
  });

  it('uses default state when no persisted state is provided', () => {
    initRequestMock.persistedState = {};

    const { controller } = qrSyncControllerInit(initRequestMock);

    expect(controller.state).toStrictEqual(defaultQrSyncControllerState);
  });

  it('uses persisted state when provided', () => {
    const persistedState: QrSyncControllerState = {
      ...defaultQrSyncControllerState,
      phase: QrSyncPhases.DISPLAYING_OTP,
      otp: { otp: '123456', deadline: Date.now() + 30_000 },
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      QrSyncController: persistedState,
    };

    const { controller } = qrSyncControllerInit(initRequestMock);

    expect(controller.state).toStrictEqual(persistedState);
  });

  it('passes relay URL and key manager to the controller', () => {
    const { controller } = qrSyncControllerInit(initRequestMock);

    expect(controller).toBeInstanceOf(QrSyncController);
    expect(keyManagerClassMock).toHaveBeenCalledTimes(1);
  });

  it('exposes provisioning mutation methods on the initialized controller', () => {
    const { controller } = qrSyncControllerInit(initRequestMock);

    expect(typeof controller.importRemainingSecrets).toBe('function');
    expect(typeof controller.enrichProvisioningEntry).toBe('function');
    expect(typeof controller.markProvisioningFailed).toBe('function');
    expect(typeof controller.completeProvisioning).toBe('function');
  });

  it('registers provisioning mutation action handlers on the controller messenger', () => {
    const registerSpy = jest.spyOn(
      initRequestMock.controllerMessenger,
      'registerActionHandler',
    );

    qrSyncControllerInit(initRequestMock);

    expect(registerSpy).toHaveBeenCalledWith(
      'QrSyncController:importRemainingSecrets',
      expect.any(Function),
    );
    expect(registerSpy).toHaveBeenCalledWith(
      'QrSyncController:enrichProvisioningEntry',
      expect.any(Function),
    );
    expect(registerSpy).toHaveBeenCalledWith(
      'QrSyncController:markProvisioningFailed',
      expect.any(Function),
    );
    expect(registerSpy).toHaveBeenCalledWith(
      'QrSyncController:completeProvisioning',
      expect.any(Function),
    );
  });

  it('registers the E2E deep-link handler when test overrides are enabled', () => {
    mockHasTestOverrides.mockReturnValue(true);

    const { controller } = qrSyncControllerInit(initRequestMock);

    expect(registerE2EQrSyncDeepLinkHandlerMock).toHaveBeenCalledTimes(1);
    const resolveController =
      registerE2EQrSyncDeepLinkHandlerMock.mock.calls[0][0];
    expect(resolveController()).toBe(controller);
  });

  it('skips E2E deep-link registration when test overrides are disabled', () => {
    mockHasTestOverrides.mockReturnValue(false);

    qrSyncControllerInit(initRequestMock);

    expect(registerE2EQrSyncDeepLinkHandlerMock).not.toHaveBeenCalled();
  });
});
