import {
  BridgeController,
  UnifiedSwapBridgeEventName,
  type BridgeControllerMessenger,
} from '@metamask/bridge-controller';
import { TransactionController } from '@metamask/transaction-controller';
import { handleFetch } from '@metamask/controller-utils';
import { fetch as expoFetch } from 'expo/fetch';

import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import {
  getBridgeControllerMessenger,
  BridgeControllerInitMessenger,
} from '../../messengers/bridge-controller-messenger';
import { MessengerClientInitRequest } from '../../types';
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
import { swapQuoteFetchTrace } from '../../../../components/UI/Bridge/utils/swapQuoteFetchTrace';

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  BridgeController: jest.fn(),
}));
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
jest.mock('../../../redux', () => ({ store: { getState: jest.fn() } }));
jest.mock('../../../../components/UI/Bridge/utils/swapQuoteFetchTrace', () => ({
  swapQuoteFetchTrace: { mark: jest.fn() },
}));
jest.mock(
  '../../../../components/UI/Bridge/utils/firstQuoteFlushAbTestConfig',
  () => ({
    ...jest.requireActual(
      '../../../../components/UI/Bridge/utils/firstQuoteFlushAbTestConfig',
    ),
    selectFirstQuoteAbTestVariant: (_state: unknown, flagKey: string) =>
      flagKey.includes('Immediate') ? 'treatment' : 'control',
  }),
);

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
  MessengerClientInitRequest<
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
    ...buildMessengerClientInitRequestMock(baseControllerMessenger),
    controllerMessenger: getBridgeControllerMessenger(baseControllerMessenger),
    initMessenger: mockInitMessenger,
    ...initRequestProperties,
  };

  if (!initRequestProperties.getMessengerClient) {
    requestMock.getMessengerClient = jest
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
      getMessengerClient: jest.fn().mockImplementation(() => {
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
        getMessengerClient: jest
          .fn()
          .mockReturnValue(mockTransactionController),
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

    it('forwards Failed failure telemetry including hash presence', () => {
      const requestMock = buildInitRequestMock();

      bridgeControllerInit(requestMock);

      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      const { trackMetaMetricsFn } = constructorOptions;
      const properties = {
        error_message: 'Snap request failed',
        error_code: 'unknown',
        failure_phase: 'broadcast',
        source_hash_present: false,
        destination_hash_present: false,
        provider: 'rango_sunswap',
        chain_id_source: 'tron:728126428',
      };

      // The payload shape is enforced at runtime by the controller; the test
      // fixture intentionally omits unrelated required fields.
      trackMetaMetricsFn(
        UnifiedSwapBridgeEventName.Failed,
        properties as never,
      );

      expect(buildAndTrackEvent).toHaveBeenCalledWith(
        requestMock.initMessenger,
        UnifiedSwapBridgeEventName.Failed,
        properties,
      );
    });

    describe('getUseAssetsControllerForRates', () => {
      it('always returns true, since AssetsController is the sole rates source', () => {
        // Arrange
        const requestMock = buildInitRequestMock();

        // Act
        bridgeControllerInit(requestMock);

        // Assert
        const { getUseAssetsControllerForRates } =
          bridgeControllerClassMock.mock.calls[0][0];
        expect(getUseAssetsControllerForRates).toBeDefined();
        expect(getUseAssetsControllerForRates?.()).toBe(true);
      });
    });

    it('reads first quote timing options from their A/B flags', () => {
      bridgeControllerInit(buildInitRequestMock());

      const options = bridgeControllerClassMock.mock
        .calls[0][0] as unknown as Record<string, () => boolean>;
      expect(options.getShouldFetchFirstQuoteImmediately()).toBe(true);
      expect(options.getShouldYieldAfterFirstQuote()).toBe(false);
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
      bridgeControllerInit(requestMock);

      // Assert
      expect(requestMock.getMessengerClient).toHaveBeenCalledWith(
        'TransactionController',
      );
    });
  });

  describe('handleBridgeFetch', () => {
    it('should use expoFetch if the url includes Stream', () => {
      const url = new URL('http://localhost:3000/getBatchQuoteStream');
      const options = { headers: { 'Content-Type': 'application/json' } };

      handleBridgeFetch(url, options);
      expect(expoFetch).toHaveBeenCalledWith(url.toString(), options);
      expect(swapQuoteFetchTrace.mark).not.toHaveBeenCalled();
    });

    it('marks the first quote chunk of getQuoteStream once and passes reads through', async () => {
      const chunks = [
        'event: token_warning\n',
        'event: quote\n',
        'event: quote\n',
      ].map((text) => ({ done: false, value: new TextEncoder().encode(text) }));
      const rawReader = { read: jest.fn() };
      chunks.forEach((chunk) => rawReader.read.mockResolvedValueOnce(chunk));
      jest
        .mocked(expoFetch)
        .mockResolvedValue({ body: { getReader: () => rawReader } } as never);
      jest.mocked(swapQuoteFetchTrace.mark).mockReturnValue('trace-id');

      const response = await handleBridgeFetch(
        'http://localhost:3000/getQuoteStream',
      );
      const reader = response.body?.getReader();

      expect(await reader?.read()).toBe(chunks[0]);
      expect(swapQuoteFetchTrace.mark).toHaveBeenCalledTimes(2);
      expect(await reader?.read()).toBe(chunks[1]);
      expect(await reader?.read()).toBe(chunks[2]);
      expect(jest.mocked(swapQuoteFetchTrace.mark).mock.calls).toEqual([
        ['stream_fetch_start_ms'],
        ['stream_headers_ms', 'trace-id'],
        ['stream_first_quote_chunk_ms', 'trace-id'],
      ]);
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

    it('should use fetch if the url includes obtainGaslessBatch', async () => {
      const url = new URL('http://localhost:3000/obtainGaslessBatch');
      const options = {
        body: JSON.stringify({ quotes: [] }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      };
      const response = {
        ok: true,
        status: 200,
        statusText: 'OK',
      } as unknown as Response;
      const fetchMock = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(response);

      await expect(handleBridgeFetch(url, options)).resolves.toBe(response);

      expect(fetchMock).toHaveBeenCalledWith(url.toString(), options);
      expect(handleFetch).not.toHaveBeenCalled();

      fetchMock.mockRestore();
    });
  });
});
