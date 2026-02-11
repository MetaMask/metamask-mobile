import {
  BridgeController,
  type BridgeControllerMessenger,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';
import { TransactionController } from '@metamask/transaction-controller';
import { handleFetch } from '@metamask/controller-utils';
import { fetch as expoFetch } from 'expo/fetch';

import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import {
  getBridgeControllerMessenger,
  BridgeControllerInitMessenger,
} from '../../messengers/bridge-controller-messenger';
import { ControllerInitRequest } from '../../types';
import {
  bridgeControllerInit,
  handleBridgeFetch,
} from './bridge-controller-init';
import { trace } from '../../../../util/trace';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { buildAndTrackEvent } from '../../utils/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import type { AnalyticsTrackingEvent } from '@metamask/analytics-controller';

jest.mock('@metamask/bridge-controller');
jest.mock('../../utils/analytics');
jest.mock('../../../../util/trace');
jest.mock('../../../../util/analytics/AnalyticsEventBuilder');
jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  handleFetch: jest.fn(),
}));
jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

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
    getLayer1GasFee: jest.fn().mockResolvedValue('0x100'),
  };

  // @ts-expect-error Incomplete mock, just includes properties used by code-under-test
  return {
    ...defaultMocks,
    ...partialMock,
  };
}

function buildInitRequestMock(
  initRequestProperties: Record<string, unknown> = {},
): jest.Mocked<
  ControllerInitRequest<
    BridgeControllerMessenger,
    BridgeControllerInitMessenger
  >
> {
  const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const mockInitMessenger = {
    call: jest.fn(),
  } as unknown as BridgeControllerInitMessenger;

  const requestMock = {
    ...buildControllerInitRequestMock(baseControllerMessenger),
    controllerMessenger: getBridgeControllerMessenger(baseControllerMessenger),
    initMessenger: mockInitMessenger,
    ...initRequestProperties,
  };

  if (!initRequestProperties.getController) {
    requestMock.getController = jest
      .fn()
      .mockReturnValue(buildTransactionControllerMock());
  }

  return requestMock;
}

describe('BridgeController Init', () => {
  const bridgeControllerClassMock = jest.mocked(BridgeController);

  beforeEach(() => {
    jest.resetAllMocks();
    (trace as jest.Mock).mockImplementation((_label, fn) => fn());

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

  it('returns controller instance', () => {
    // Arrange
    const requestMock = buildInitRequestMock();

    // Act
    const result = bridgeControllerInit(requestMock);

    // Assert
    expect(result.controller).toBeInstanceOf(BridgeController);
  });

  it('throws error if TransactionController is not found', () => {
    // Arrange
    const requestMock = buildInitRequestMock({
      getController: jest.fn().mockImplementation(() => {
        throw new Error('TransactionController not found');
      }),
    });

    // Act & Assert
    expect(() => bridgeControllerInit(requestMock)).toThrow(
      'TransactionController not found',
    );
  });

  it('throws error if controller initialization fails', () => {
    // Arrange
    bridgeControllerClassMock.mockImplementationOnce(() => {
      throw new Error('Controller initialization failed');
    });
    const requestMock = buildInitRequestMock();

    // Act & Assert
    expect(() => bridgeControllerInit(requestMock)).toThrow(
      'Controller initialization failed',
    );
  });

  describe('BridgeController constructor options', () => {
    it('correctly sets up messenger, clientId, and clientVersion', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      bridgeControllerInit(requestMock);

      // Assert
      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.messenger).toBe(
        requestMock.controllerMessenger,
      );
      expect(constructorOptions.clientId).toBe('mobile');
      // clientVersion should come from package.json
      expect(constructorOptions.clientVersion).toBeDefined();
      expect(typeof constructorOptions.clientVersion).toBe('string');
      // Should match the version from package.json (7.58.0 currently)
      expect(constructorOptions.clientVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('correctly sets up fetchFn', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      bridgeControllerInit(requestMock);

      // Assert
      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.fetchFn).toBe(handleBridgeFetch);
    });

    it('correctly sets up traceFn', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      bridgeControllerInit(requestMock);

      // Assert
      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.traceFn).toBe(trace);
    });

    it('correctly sets up config with API base URL', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      bridgeControllerInit(requestMock);

      // Assert
      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.config).toEqual({
        customBridgeApiBaseUrl: BRIDGE_API_BASE_URL,
      });
    });

    it('correctly sets up getLayer1GasFee function', async () => {
      // Arrange
      const mockTransactionController = buildTransactionControllerMock({
        getLayer1GasFee: jest.fn().mockResolvedValue('0x200'),
      });
      const requestMock = buildInitRequestMock({
        getController: jest.fn().mockReturnValue(mockTransactionController),
      });

      // Act
      bridgeControllerInit(requestMock);

      // Assert
      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      const getLayer1GasFeeFn = constructorOptions.getLayer1GasFee;
      const mockParams = {
        transactionParams: { from: '0xabc', to: '0x123', value: '0x0' },
        chainId: '0x1' as const,
      };

      await getLayer1GasFeeFn(mockParams);
      expect(mockTransactionController.getLayer1GasFee).toHaveBeenCalledWith(
        mockParams,
      );
    });

    it('correctly sets up trackMetaMetricsFn', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      bridgeControllerInit(requestMock);

      // Assert
      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      const trackMetaMetricsFn = constructorOptions.trackMetaMetricsFn;

      // Act - call the tracking function
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trackMetaMetricsFn('bridge_completed' as any, { property: 'value' });

      // Verify buildAndTrackEvent was called with correct parameters
      expect(buildAndTrackEvent).toHaveBeenCalledWith(
        requestMock.initMessenger,
        'bridge_completed',
        { property: 'value' },
      );
    });

    it('handles trackMetaMetricsFn with no properties', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      bridgeControllerInit(requestMock);

      // Assert
      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      const trackMetaMetricsFn = constructorOptions.trackMetaMetricsFn;

      // Act - call the tracking function without properties
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trackMetaMetricsFn('bridge_completed' as any, {});

      // Verify buildAndTrackEvent was called with correct parameters
      expect(buildAndTrackEvent).toHaveBeenCalledWith(
        requestMock.initMessenger,
        'bridge_completed',
        {},
      );
    });

    it('enriches Completed event with cached source from earlier event', () => {
      // Arrange
      const requestMock = buildInitRequestMock({
        getState: jest.fn().mockReturnValue({
          bridge: { source: 'trending' },
        }),
      });

      // Act
      bridgeControllerInit(requestMock);

      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      const trackMetaMetricsFn = constructorOptions.trackMetaMetricsFn;

      // Fire a preceding event to cache source (mimics real flow where
      // PageViewed fires while BridgeView is mounted, before Completed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trackMetaMetricsFn(UnifiedSwapBridgeEventName.PageViewed as any, {});

      // Now fire the Completed event (Redux source may have been cleared by resetBridgeState)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trackMetaMetricsFn(UnifiedSwapBridgeEventName.Completed as any, {
        token_symbol_source: 'ETH',
      });

      // Assert - source should come from the cached value
      expect(buildAndTrackEvent).toHaveBeenCalledWith(
        requestMock.initMessenger,
        UnifiedSwapBridgeEventName.Completed,
        {
          token_symbol_source: 'ETH',
          source: 'trending',
        },
      );
    });

    it('clears cached source after Completed event so it does not leak to next swap', () => {
      // Arrange
      const requestMock = buildInitRequestMock({
        getState: jest.fn().mockReturnValue({
          bridge: { source: 'trending' },
        }),
      });

      // Act
      bridgeControllerInit(requestMock);

      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      const trackMetaMetricsFn = constructorOptions.trackMetaMetricsFn;

      // First swap flow: cache + complete
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trackMetaMetricsFn(UnifiedSwapBridgeEventName.PageViewed as any, {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trackMetaMetricsFn(UnifiedSwapBridgeEventName.Completed as any, {});

      // Second swap flow: source is now undefined in Redux
      requestMock.getState.mockReturnValue({
        bridge: {},
      } as ReturnType<typeof requestMock.getState>);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trackMetaMetricsFn(UnifiedSwapBridgeEventName.Completed as any, {
        token_symbol_source: 'USDC',
      });

      // Assert - second Completed should NOT have source
      expect(buildAndTrackEvent).toHaveBeenLastCalledWith(
        requestMock.initMessenger,
        UnifiedSwapBridgeEventName.Completed,
        { token_symbol_source: 'USDC' },
      );
    });

    it('does not add source to Completed event when source was never set', () => {
      // Arrange
      const requestMock = buildInitRequestMock({
        getState: jest.fn().mockReturnValue({
          bridge: { source: undefined },
        }),
      });

      // Act
      bridgeControllerInit(requestMock);

      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      const trackMetaMetricsFn = constructorOptions.trackMetaMetricsFn;

      // Fire preceding event (source is undefined)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trackMetaMetricsFn(UnifiedSwapBridgeEventName.PageViewed as any, {});

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trackMetaMetricsFn(UnifiedSwapBridgeEventName.Completed as any, {
        token_symbol_source: 'ETH',
      });

      // Assert
      expect(buildAndTrackEvent).toHaveBeenCalledWith(
        requestMock.initMessenger,
        UnifiedSwapBridgeEventName.Completed,
        { token_symbol_source: 'ETH' },
      );
    });

    it('does not enrich non-Completed events with source', () => {
      // Arrange
      const requestMock = buildInitRequestMock({
        getState: jest.fn().mockReturnValue({
          bridge: { source: 'trending' },
        }),
      });

      // Act
      bridgeControllerInit(requestMock);

      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      const trackMetaMetricsFn = constructorOptions.trackMetaMetricsFn;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trackMetaMetricsFn(UnifiedSwapBridgeEventName.PageViewed as any, {
        location: 'token_view',
      });

      // Assert - should NOT include source
      expect(buildAndTrackEvent).toHaveBeenCalledWith(
        requestMock.initMessenger,
        UnifiedSwapBridgeEventName.PageViewed,
        { location: 'token_view' },
      );
    });
  });

  describe('getControllers helper', () => {
    it('correctly retrieves TransactionController', () => {
      // Arrange
      const mockTransactionController = buildTransactionControllerMock();
      const requestMock = buildInitRequestMock({
        getController: jest.fn().mockReturnValue(mockTransactionController),
      });

      // Act
      bridgeControllerInit(requestMock);

      // Assert
      expect(requestMock.getController).toHaveBeenCalledWith(
        'TransactionController',
      );
    });
  });

  describe('handleBridgeFetch', () => {
    it('should use expoFetch if the url includes Stream', () => {
      const url = new URL(
        'http://localhost:3000/getQuoteStream?srcChainId=1&destChainId=2&srcTokenAddress=0x123&destTokenAddress=0x456&srcAmount=100&destAmount=200',
      );
      const options = { headers: { 'Content-Type': 'application/json' } };

      handleBridgeFetch(url, options);
      expect(expoFetch).toHaveBeenCalledWith(url.toString(), options);
    });

    it.each([
      ['http://localhost:3000/getQuote?srcChainId', {}],
      [
        'http://localhost:3000/getTokens',
        { headers: { 'Content-Type': 'application/json' } },
      ],
    ])('should use handleFetch if the url is %s', (url, options) => {
      handleBridgeFetch(url, options);
      expect(handleFetch).toHaveBeenCalledWith(url.toString(), options);
    });
  });
});
