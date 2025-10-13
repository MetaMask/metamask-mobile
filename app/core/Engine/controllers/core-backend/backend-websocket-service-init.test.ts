import { BackendWebSocketService } from '@metamask/core-backend';
import Logger from '../../../../util/Logger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { backendWebSocketServiceInit } from './backend-websocket-service-init';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { BackendWebSocketServiceInitMessenger } from '../../messengers/core-backend';

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
    const baseControllerMessenger = new ExtendedControllerMessenger();
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

  it('initializes BackendWebSocketService with default URL', () => {
    // Arrange
    const mocks = arrangeMocks();

    // Act
    const result = backendWebSocketServiceInit(mocks);

    // Assert
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

  it('uses default URL when environment variable not set', () => {
    // Arrange
    const mocks = arrangeMocks();

    // Act
    backendWebSocketServiceInit(mocks);

    // Assert
    expect(BackendWebSocketService).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'wss://gateway.api.cx.metamask.io/v1',
      }),
    );
  });

  it('configures service with correct timeouts', () => {
    // Arrange
    const mocks = arrangeMocks();

    // Act
    backendWebSocketServiceInit(mocks);

    // Assert
    expect(BackendWebSocketService).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 15000,
        reconnectDelay: 1000,
        maxReconnectDelay: 30000,
        requestTimeout: 20000,
      }),
    );
  });

  describe('isEnabled callback', () => {
    it('provides an isEnabled callback', () => {
      // Arrange
      const mocks = arrangeMocks();
      let isEnabledCallback: (() => boolean) | undefined;
      (BackendWebSocketService as jest.Mock).mockImplementation((config) => {
        isEnabledCallback = config.isEnabled;
        return {};
      });

      // Act
      backendWebSocketServiceInit(mocks);

      // Assert
      expect(isEnabledCallback).toBeDefined();
      if (isEnabledCallback) {
        expect(typeof isEnabledCallback()).toBe('boolean');
      }
    });

    it('returns true when remote feature flag is enabled', () => {
      // Arrange
      const mocks = arrangeMocks();
      (mocks.initMessenger.call as jest.Mock).mockReturnValue({
        remoteFeatureFlags: {
          backendWebSocketConnection: {
            value: true,
          },
        },
      });

      // Act
      backendWebSocketServiceInit(mocks);

      // Assert - Extract isEnabled from the constructor call args
      const { isEnabled } = (BackendWebSocketService as jest.Mock).mock
        .calls[0][0];
      expect(isEnabled).toBeDefined();
      expect(isEnabled?.()).toBe(true);
      expect(mocks.initMessenger.call).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:getState',
      );
    });

    it('returns false when remote feature flag is disabled', () => {
      // Arrange
      const mocks = arrangeMocks();
      (mocks.initMessenger.call as jest.Mock).mockReturnValue({
        remoteFeatureFlags: {
          backendWebSocketConnection: {
            value: false,
          },
        },
      });

      // Act
      backendWebSocketServiceInit(mocks);

      // Assert - Extract isEnabled from the constructor call args
      const { isEnabled } = (BackendWebSocketService as jest.Mock).mock
        .calls[0][0];
      expect(isEnabled).toBeDefined();
      expect(isEnabled?.()).toBe(false);
    });

    it('returns false when remote feature flag is not an object', () => {
      // Arrange
      const mocks = arrangeMocks();
      (mocks.initMessenger.call as jest.Mock).mockReturnValue({
        remoteFeatureFlags: {
          backendWebSocketConnection: 'invalid',
        },
      });

      // Act
      backendWebSocketServiceInit(mocks);

      // Assert - Extract isEnabled from the constructor call args
      const { isEnabled } = (BackendWebSocketService as jest.Mock).mock
        .calls[0][0];
      expect(isEnabled).toBeDefined();
      expect(isEnabled?.()).toBe(false);
    });

    it('returns false when remote feature flag does not have value property', () => {
      // Arrange
      const mocks = arrangeMocks();
      (mocks.initMessenger.call as jest.Mock).mockReturnValue({
        remoteFeatureFlags: {
          backendWebSocketConnection: {},
        },
      });

      // Act
      backendWebSocketServiceInit(mocks);

      // Assert - Extract isEnabled from the constructor call args
      const { isEnabled } = (BackendWebSocketService as jest.Mock).mock
        .calls[0][0];
      expect(isEnabled).toBeDefined();
      expect(isEnabled?.()).toBe(false);
    });

    it('returns false when remoteFeatureFlags is undefined', () => {
      // Arrange
      const mocks = arrangeMocks();
      (mocks.initMessenger.call as jest.Mock).mockReturnValue({});

      // Act
      backendWebSocketServiceInit(mocks);

      // Assert - Extract isEnabled from the constructor call args
      const { isEnabled } = (BackendWebSocketService as jest.Mock).mock
        .calls[0][0];
      expect(isEnabled).toBeDefined();
      expect(isEnabled?.()).toBe(false);
    });

    it('returns false and logs error when feature flag check throws', () => {
      // Arrange
      const mocks = arrangeMocks();
      const testError = new Error('Feature flag check failed');
      (mocks.initMessenger.call as jest.Mock).mockImplementation(() => {
        throw testError;
      });

      // Act
      backendWebSocketServiceInit(mocks);

      // Assert - Extract and call the isEnabled callback
      const { isEnabled } = (BackendWebSocketService as jest.Mock).mock
        .calls[0][0];
      expect(isEnabled).toBeDefined();
      expect(isEnabled?.()).toBe(false);
      expect(Logger.log).toHaveBeenCalledWith(
        'BackendWebSocketService: Could not check feature flag, defaulting to NOT connect',
        testError,
      );
    });
  });
});
