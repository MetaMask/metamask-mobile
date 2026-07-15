import {
  MOCK_ANY_NAMESPACE,
  Messenger,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import type { MessengerClientInitRequest } from '../../types';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { StellarAssetsController } from './stellar-assets-controller';
import {
  getStellarAssetsControllerInitMessenger,
  getStellarAssetsControllerMessenger,
  type StellarAssetsControllerInitMessenger,
  type StellarAssetsControllerMessenger,
} from '../../messengers/stellar-assets-controller-messenger/stellar-assets-controller-messenger';
import { stellarAssetsControllerInit } from './stellar-assets-controller-init';

jest.mock('./stellar-assets-controller');

function buildInitRequestMock(
  remoteFeatureFlags?: Record<string, unknown>,
): jest.Mocked<
  MessengerClientInitRequest<
    StellarAssetsControllerMessenger,
    StellarAssetsControllerInitMessenger
  >
> {
  const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const initMessenger = getStellarAssetsControllerInitMessenger(
    new Messenger({ namespace: MOCK_ANY_NAMESPACE }),
  );

  initMessenger.call = jest.fn().mockImplementation((action: string) => {
    if (action === 'RemoteFeatureFlagController:getState') {
      return { remoteFeatureFlags: remoteFeatureFlags ?? {} };
    }
    throw new Error(`Unexpected action: ${action}`);
  });

  return {
    ...buildMessengerClientInitRequestMock(baseControllerMessenger),
    controllerMessenger: getStellarAssetsControllerMessenger(
      baseControllerMessenger,
    ),
    initMessenger,
    persistedState: {
      StellarAssetsController: { accountAssets: {} },
    },
  };
}

describe('stellarAssetsControllerInit', () => {
  const stellarAssetsControllerClassMock = jest.mocked(StellarAssetsController);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns controller instance', () => {
    const requestMock = buildInitRequestMock();
    expect(stellarAssetsControllerInit(requestMock).controller).toBeInstanceOf(
      StellarAssetsController,
    );
  });

  it('initializes with messenger, state, and isEnabled', () => {
    const requestMock = buildInitRequestMock();
    stellarAssetsControllerInit(requestMock);

    expect(stellarAssetsControllerClassMock).toHaveBeenCalledWith({
      messenger: requestMock.controllerMessenger,
      state: requestMock.persistedState.StellarAssetsController,
      isEnabled: expect.any(Function),
    });
  });

  describe('isEnabled', () => {
    it('enables when stellarAccounts and stellarAssetEnrichment flags are enabled', () => {
      const requestMock = buildInitRequestMock({
        stellarAccounts: { enabled: true, minimumVersion: '0.0.0' },
        stellarAssetEnrichment: { enabled: true, minimumVersion: '0.0.0' },
      });

      stellarAssetsControllerInit(requestMock);

      const constructorCall = stellarAssetsControllerClassMock.mock.calls[0][0];
      const isEnabled = constructorCall.isEnabled as () => boolean;

      expect(isEnabled()).toBe(true);
    });

    it('disables when stellarAccounts feature flag is disabled', () => {
      const requestMock = buildInitRequestMock({
        stellarAccounts: { enabled: false, minimumVersion: '0.0.0' },
        stellarAssetEnrichment: { enabled: true, minimumVersion: '0.0.0' },
      });

      stellarAssetsControllerInit(requestMock);

      const constructorCall = stellarAssetsControllerClassMock.mock.calls[0][0];
      const isEnabled = constructorCall.isEnabled as () => boolean;

      expect(isEnabled()).toBe(false);
    });

    it('disables when stellarAssetEnrichment feature flag is disabled', () => {
      const requestMock = buildInitRequestMock({
        stellarAccounts: { enabled: true, minimumVersion: '0.0.0' },
        stellarAssetEnrichment: { enabled: false, minimumVersion: '0.0.0' },
      });

      stellarAssetsControllerInit(requestMock);

      const constructorCall = stellarAssetsControllerClassMock.mock.calls[0][0];
      const isEnabled = constructorCall.isEnabled as () => boolean;

      expect(isEnabled()).toBe(false);
    });
  });
});
