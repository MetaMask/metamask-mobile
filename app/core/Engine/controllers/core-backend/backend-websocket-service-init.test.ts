import { BackendWebSocketService } from '@metamask/core-backend';
import Logger from '../../../../util/Logger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { backendWebSocketServiceInit } from './backend-websocket-service-init';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { BackendWebSocketServiceInitMessenger } from '../../messengers/core-backend';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('../../../../util/Logger');
jest.mock('@metamask/core-backend');
jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
}));

describe('backendWebSocketServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrangeMocks = () => {
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const initRequestMock = buildControllerInitRequestMock(
      baseControllerMessenger,
    );

    const mockInitMessenger = {
      call: jest.fn(),
    } as unknown as BackendWebSocketServiceInitMessenger;

    return {
      ...initRequestMock,
      initMessenger: mockInitMessenger,
    };
  };

  it('initializes BackendWebSocketService with correct configuration', () => {
    const mocks = arrangeMocks();

    const result = backendWebSocketServiceInit(mocks);

    expect(BackendWebSocketService).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'wss://gateway.api.cx.metamask.io/v1',
      }),
    );
    expect(result.controller).toBeDefined();
    expect(Logger.log).toHaveBeenCalledWith(
      'Initializing BackendWebSocketService',
    );
    expect(Logger.log).toHaveBeenCalledWith(
      'BackendWebSocketService initialized',
    );
  });

  describe('isEnabled callback', () => {
    const getIsEnabledCallback = () => {
      const { isEnabled } = (BackendWebSocketService as jest.Mock).mock
        .calls[0][0];
      return isEnabled;
    };

    it('returns true when remote feature flag is enabled', () => {
      const mocks = arrangeMocks();
      (mocks.initMessenger.call as jest.Mock).mockReturnValue({
        remoteFeatureFlags: {
          backendWebSocketConnection: { value: true },
        },
      });

      backendWebSocketServiceInit(mocks);

      expect(getIsEnabledCallback()()).toBe(true);
      expect(mocks.initMessenger.call).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:getState',
      );
    });

    it.each([
      [
        'flag is disabled',
        {
          remoteFeatureFlags: { backendWebSocketConnection: { value: false } },
        },
      ],
      [
        'flag is not an object',
        { remoteFeatureFlags: { backendWebSocketConnection: 'invalid' } },
      ],
      [
        'flag has no value property',
        { remoteFeatureFlags: { backendWebSocketConnection: {} } },
      ],
      ['remoteFeatureFlags is undefined', {}],
    ])('returns false when %s', (_description, mockReturnValue) => {
      const mocks = arrangeMocks();
      (mocks.initMessenger.call as jest.Mock).mockReturnValue(mockReturnValue);

      backendWebSocketServiceInit(mocks);

      expect(getIsEnabledCallback()()).toBe(false);
    });

    it('returns false and logs error when feature flag check throws', () => {
      const mocks = arrangeMocks();
      const testError = new Error('Feature flag check failed');
      (mocks.initMessenger.call as jest.Mock).mockImplementation(() => {
        throw testError;
      });

      backendWebSocketServiceInit(mocks);

      expect(getIsEnabledCallback()()).toBe(false);
      expect(Logger.log).toHaveBeenCalledWith(
        'BackendWebSocketService: Could not check feature flag, defaulting to NOT connect',
        testError,
      );
    });
  });
});
