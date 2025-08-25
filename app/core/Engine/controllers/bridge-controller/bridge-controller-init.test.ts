import {
  BridgeController,
  type BridgeControllerMessenger,
} from '@metamask/bridge-controller';
import { TransactionController } from '@metamask/transaction-controller';
import { handleFetch } from '@metamask/controller-utils';

import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { getBridgeControllerMessenger } from '../../messengers/bridge-controller-messenger';
import { ControllerInitRequest } from '../../types';
import { bridgeControllerInit } from './bridge-controller-init';
import { MetaMetrics } from '../../../Analytics';
import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';
import { trace } from '../../../../util/trace';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';

jest.mock('@metamask/bridge-controller');
jest.mock('../../../Analytics');
jest.mock('../../../Analytics/MetricsEventBuilder');
jest.mock('../../../../util/trace');
jest.mock('@metamask/controller-utils');

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
): jest.Mocked<ControllerInitRequest<BridgeControllerMessenger>> {
  const baseControllerMessenger = new ExtendedControllerMessenger();
  const requestMock = {
    ...buildControllerInitRequestMock(baseControllerMessenger),
    controllerMessenger: getBridgeControllerMessenger(baseControllerMessenger),
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
  const metaMetricsInstanceMock = {
    trackEvent: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (MetaMetrics.getInstance as jest.Mock).mockReturnValue(
      metaMetricsInstanceMock,
    );
    (MetricsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue({
      addProperties: jest.fn().mockReturnValue({
        build: jest.fn().mockReturnValue({ mockEvent: true }),
      }),
    });
    (handleFetch as jest.Mock).mockResolvedValue({ ok: true });
    (trace as jest.Mock).mockImplementation((_label, fn) => fn());
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
    it('correctly sets up messenger and clientId', () => {
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
    });

    it('correctly sets up fetchFn', () => {
      // Arrange
      const requestMock = buildInitRequestMock();

      // Act
      bridgeControllerInit(requestMock);

      // Assert
      const constructorOptions = bridgeControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.fetchFn).toBe(handleFetch);
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

      // Assert
      expect(MetricsEventBuilder.createEventBuilder).toHaveBeenCalledWith({
        category: 'bridge_completed',
      });
      expect(metaMetricsInstanceMock.trackEvent).toHaveBeenCalledWith({
        mockEvent: true,
      });
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

      // Assert
      expect(MetricsEventBuilder.createEventBuilder).toHaveBeenCalledWith({
        category: 'bridge_completed',
      });
      expect(metaMetricsInstanceMock.trackEvent).toHaveBeenCalled();
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
});
