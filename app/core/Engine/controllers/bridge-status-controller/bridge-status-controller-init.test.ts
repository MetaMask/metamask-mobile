import {
  BridgeStatusController,
  type BridgeStatusControllerMessenger,
  QuoteStatusGetError,
  QuoteStatusUpdateError,
} from '@metamask/bridge-status-controller';
import { BridgeClientId } from '@metamask/bridge-controller';
import { TransactionController } from '@metamask/transaction-controller';
import { handleFetch } from '@metamask/controller-utils';

import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { getBridgeStatusControllerMessenger } from '../../messengers/bridge-status-controller-messenger';
import { MessengerClientInitRequest } from '../../types';
import { bridgeStatusControllerInit } from './bridge-status-controller-init';
import { trace } from '../../../../util/trace';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { captureException } from '@sentry/react-native';

jest.mock('@metamask/bridge-status-controller');
jest.mock('../../../../util/trace');
jest.mock('@metamask/controller-utils');
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

function buildRemoteFeatureFlagControllerMock(
  bridgeQuoteStatusManager?: { enabled?: boolean },
  localOverrides: Record<string, unknown> = {},
) {
  return {
    state: {
      remoteFeatureFlags: {
        bridgeQuoteStatusManager,
      },
      localOverrides,
    },
  };
}

/**
 * Build a mock TransactionController.
 *
 * @param partialMock - A partial mock object for the TransactionController
 * @returns A mock TransactionController
 */
function buildTransactionControllerMock(
  partialMock?: Partial<TransactionController>,
): TransactionController {
  const defaultMocks = {
    addTransactionBatch: jest.fn().mockResolvedValue(['txId1', 'txId2']),
  };

  // @ts-expect-error Incomplete mock, just includes properties used by code-under-test
  return {
    ...defaultMocks,
    ...partialMock,
  };
}

function buildInitRequestMock(
  initRequestProperties: Record<string, unknown> = {},
  options: {
    bridgeQuoteStatusManager?: { enabled?: boolean };
    localOverrides?: Record<string, unknown>;
  } = {},
): jest.Mocked<MessengerClientInitRequest<BridgeStatusControllerMessenger>> {
  const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseControllerMessenger),
    controllerMessenger: getBridgeStatusControllerMessenger(
      baseControllerMessenger,
    ),
    persistedState: {
      BridgeStatusController: {
        txHistory: {},
        bridgeFeatureFlags: {},
      },
    },
    ...initRequestProperties,
  };

  if (!initRequestProperties.getMessengerClient) {
    const mockTransactionController = buildTransactionControllerMock();
    const mockRemoteFeatureFlagController =
      buildRemoteFeatureFlagControllerMock(
        options.bridgeQuoteStatusManager,
        options.localOverrides,
      );

    requestMock.getMessengerClient = jest
      .fn()
      .mockReturnValue(buildTransactionControllerMock())
      .mockImplementation((name: string) => {
        if (name === 'TransactionController') {
          return mockTransactionController;
        }
        if (name === 'RemoteFeatureFlagController') {
          return mockRemoteFeatureFlagController;
        }
        throw new Error(`${name} not found`);
      });
  }

  return requestMock;
}

describe('BridgeStatusController Init', () => {
  const bridgeStatusControllerClassMock = jest.mocked(BridgeStatusController);

  beforeEach(() => {
    jest.resetAllMocks();
    (handleFetch as jest.Mock).mockResolvedValue({ ok: true });
    (trace as jest.Mock).mockImplementation((_label, fn) => fn());
  });

  it('returns controller instance', () => {
    // Arrange
    const requestMock = buildInitRequestMock();

    // Act
    const result = bridgeStatusControllerInit(requestMock);

    // Assert
    expect(result.controller).toBeInstanceOf(BridgeStatusController);
  });

  it('throws error if TransactionController is not found', () => {
    // Arrange
    const requestMock = buildInitRequestMock({
      getMessengerClient: jest.fn().mockImplementation(() => {
        throw new Error('TransactionController not found');
      }),
    });

    // Act & Assert
    expect(() => bridgeStatusControllerInit(requestMock)).toThrow(
      'TransactionController not found',
    );
  });

  it('throws error if controller initialization fails', () => {
    // Arrange
    bridgeStatusControllerClassMock.mockImplementationOnce(() => {
      throw new Error('Controller initialization failed');
    });
    const requestMock = buildInitRequestMock();

    // Act & Assert
    expect(() => bridgeStatusControllerInit(requestMock)).toThrow(
      'Controller initialization failed',
    );
  });

  describe('BridgeStatusController constructor options', () => {
    it('correctly sets up messenger and state', () => {
      // Arrange
      const mockState = {
        txHistory: { '0x123': { status: 'pending' } },
        bridgeFeatureFlags: { enabled: true },
      };
      const requestMock = buildInitRequestMock({
        persistedState: {
          BridgeStatusController: mockState,
        },
      });

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.messenger).toBe(
        requestMock.controllerMessenger,
      );
      expect(constructorOptions.state).toEqual(mockState);
    });

    it('correctly sets up clientId', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.clientId).toBe(BridgeClientId.MOBILE);
    });

    it('correctly sets up fetchFn', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.fetchFn).toBe(handleFetch);
    });

    it('correctly sets up traceFn', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.traceFn).toBe(trace);
    });

    it('correctly sets up config with API base URL', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.config).toEqual({
        customBridgeApiBaseUrl: BRIDGE_API_BASE_URL,
      });
    });

    it('correctly sets up addTransactionBatchFn', () => {
      // Arrange
      const mockTransactionController = buildTransactionControllerMock({
        addTransactionBatch: jest.fn().mockResolvedValue(['txId1', 'txId2']),
      });
      const requestMock = buildInitRequestMock({
        getMessengerClient: jest.fn().mockImplementation((name: string) => {
          if (name === 'TransactionController') {
            return mockTransactionController;
          }
          if (name === 'RemoteFeatureFlagController') {
            return buildRemoteFeatureFlagControllerMock();
          }
          throw new Error(`${name} not found`);
        }),
      });

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[0][0];
      const addTransactionBatchFn = constructorOptions.addTransactionBatchFn;
      const mockTxBatch = {
        from: '0xabc' as const,
        networkClientId: 'mainnet',
        transactions: [
          { params: { from: '0xabc' as const, to: '0x123' as const } },
          { params: { from: '0xabc' as const, to: '0x456' as const } },
        ],
      };

      addTransactionBatchFn(mockTxBatch);
      expect(
        mockTransactionController.addTransactionBatch,
      ).toHaveBeenCalledWith(mockTxBatch);
    });

    it('handles undefined persistedState', () => {
      // Arrange
      const requestMock = buildInitRequestMock({
        persistedState: {},
      });

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.state).toBeUndefined();
    });
  });

  describe('getControllers helper', () => {
    it('correctly retrieves TransactionController', () => {
      // Arrange
      const mockTransactionController = buildTransactionControllerMock();
      const requestMock = buildInitRequestMock({
        getMessengerClient: jest
          .fn()
          .mockReturnValue(mockTransactionController),
      });

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      expect(requestMock.getMessengerClient).toHaveBeenCalledWith(
        'TransactionController',
      );
    });

    it('passes quote status manager callbacks', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.onQuoteStatusManagerError).toEqual(
        expect.any(Function),
      );
      expect(constructorOptions.isQuoteStatusManagerEnabled).toEqual(
        expect.any(Function),
      );
    });
  });

  describe('onQuoteStatusManagerError', () => {
    function getOnQuoteStatusManagerError() {
      const requestMock = buildInitRequestMock();
      bridgeStatusControllerInit(requestMock);
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[
          bridgeStatusControllerClassMock.mock.calls.length - 1
        ][0];
      return constructorOptions.onQuoteStatusManagerError;
    }

    it('calls captureException for QuoteStatusUpdateError', () => {
      const onQuoteStatusManagerError = getOnQuoteStatusManagerError();
      const error = new QuoteStatusUpdateError('update failed', {
        quoteId: 'quote-1',
      });

      onQuoteStatusManagerError?.(error);

      expect(captureException).toHaveBeenCalledWith(error);
    });

    it('does not call captureException for QuoteStatusGetError', () => {
      const onQuoteStatusManagerError = getOnQuoteStatusManagerError();
      const error = new QuoteStatusGetError('get failed', {
        quoteId: 'quote-1',
      });

      onQuoteStatusManagerError?.(error);

      expect(captureException).not.toHaveBeenCalled();
    });
  });

  describe('isQuoteStatusManagerEnabled', () => {
    function getIsQuoteStatusManagerEnabled(
      bridgeQuoteStatusManager?: { enabled?: boolean },
      localOverrides?: Record<string, unknown>,
    ) {
      const requestMock = buildInitRequestMock(
        {},
        { bridgeQuoteStatusManager, localOverrides },
      );
      bridgeStatusControllerInit(requestMock);
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[
          bridgeStatusControllerClassMock.mock.calls.length - 1
        ][0];
      return constructorOptions.isQuoteStatusManagerEnabled;
    }

    it('returns true when the remote feature flag is enabled', () => {
      const isQuoteStatusManagerEnabled = getIsQuoteStatusManagerEnabled({
        enabled: true,
      });

      expect(isQuoteStatusManagerEnabled?.()).toBe(true);
    });

    it('returns false when the remote feature flag is disabled', () => {
      const isQuoteStatusManagerEnabled = getIsQuoteStatusManagerEnabled({
        enabled: false,
      });

      expect(isQuoteStatusManagerEnabled?.()).toBe(false);
    });

    it('returns false when the remote feature flag is not set', () => {
      const isQuoteStatusManagerEnabled = getIsQuoteStatusManagerEnabled();

      expect(isQuoteStatusManagerEnabled?.()).toBe(false);
    });

    it('returns true when a local override enables the feature flag', () => {
      const isQuoteStatusManagerEnabled = getIsQuoteStatusManagerEnabled(
        { enabled: false },
        { bridgeQuoteStatusManager: { enabled: true } },
      );

      expect(isQuoteStatusManagerEnabled?.()).toBe(true);
    });

    it('returns false when a local override disables the feature flag', () => {
      const isQuoteStatusManagerEnabled = getIsQuoteStatusManagerEnabled(
        { enabled: true },
        { bridgeQuoteStatusManager: { enabled: false } },
      );

      expect(isQuoteStatusManagerEnabled?.()).toBe(false);
    });
  });
});
