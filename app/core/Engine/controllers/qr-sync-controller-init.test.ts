import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { MessengerClientInitRequest } from '../types';
import {
  QrSyncController,
  defaultQrSyncControllerState,
} from '../../QrSync/QrSyncController';
import { QrSyncPhases, RELAY_URL } from '../../QrSync/constants';
import type {
  QrSyncControllerMessenger,
  QrSyncControllerState,
} from '../../QrSync/controller-types';
import { qrSyncControllerInit } from './qr-sync-controller-init';
import { getQrSyncControllerMessenger } from '../messengers/qr-sync-controller-messenger';
import { KeyManager } from '../../SDKConnectV2/services/key-manager';
import { store } from '../../../store';
import { selectCompletedOnboarding } from '../../../selectors/onboarding';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('../../QrSync/QrSyncController', () => {
  const actual = jest.requireActual('../../QrSync/QrSyncController');
  return {
    ...actual,
    QrSyncController: jest.fn(actual.QrSyncController),
  };
});

jest.mock('../../SDKConnectV2/services/key-manager', () => ({
  KeyManager: jest.fn(),
}));

jest.mock('../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('../../../selectors/onboarding', () => ({
  selectCompletedOnboarding: jest.fn(),
}));

describe('qrSyncControllerInit', () => {
  const qrSyncControllerClassMock = jest.mocked(QrSyncController);
  const keyManagerClassMock = jest.mocked(KeyManager);
  const selectCompletedOnboardingMock = jest.mocked(selectCompletedOnboarding);
  const storeGetStateMock = jest.mocked(store.getState);
  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<QrSyncControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();

    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

    initRequestMock = {
      ...buildMessengerClientInitRequestMock(baseControllerMessenger),
      controllerMessenger: getQrSyncControllerMessenger(
        baseControllerMessenger,
      ),
    };

    selectCompletedOnboardingMock.mockReturnValue(true);
    storeGetStateMock.mockReturnValue({} as ReturnType<typeof store.getState>);
  });

  it('returns a controller instance', () => {
    const result = qrSyncControllerInit(initRequestMock);

    expect(result.controller).toBeInstanceOf(QrSyncController);
  });

  it('uses default state when no persisted state is provided', () => {
    initRequestMock.persistedState = {};

    qrSyncControllerInit(initRequestMock);

    const constructorArgs = qrSyncControllerClassMock.mock.calls[0][0];
    expect(constructorArgs.state).toStrictEqual(defaultQrSyncControllerState);
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

    qrSyncControllerInit(initRequestMock);

    const constructorArgs = qrSyncControllerClassMock.mock.calls[0][0];
    expect(constructorArgs.state).toStrictEqual(persistedState);
  });

  it('passes relay URL and key manager to the controller', () => {
    qrSyncControllerInit(initRequestMock);

    const constructorArgs = qrSyncControllerClassMock.mock.calls[0][0];
    expect(constructorArgs.relayUrl).toBe(RELAY_URL);
    expect(constructorArgs.keyManager).toBeInstanceOf(KeyManager);
    expect(keyManagerClassMock).toHaveBeenCalledTimes(1);
  });

  it('wires onboarding completion lookup to the Redux store', () => {
    selectCompletedOnboardingMock.mockReturnValue(false);

    qrSyncControllerInit(initRequestMock);

    const constructorArgs = qrSyncControllerClassMock.mock.calls[0][0];
    expect(constructorArgs.getIsOnboardingCompleted()).toBe(false);
    expect(storeGetStateMock).toHaveBeenCalledTimes(1);
    expect(selectCompletedOnboardingMock).toHaveBeenCalledWith(
      storeGetStateMock.mock.results[0].value,
    );
  });
});
