import {
  BridgeStatusController,
  type BridgeStatusControllerMessenger,
} from '@metamask/bridge-status-controller';
import { BridgeClientId } from '@metamask/bridge-controller';
import { TransactionController } from '@metamask/transaction-controller';
import { handleFetch } from '@metamask/controller-utils';

import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { getBridgeStatusControllerMessenger } from '../../messengers/bridge-status-controller-messenger';
import { ControllerInitRequest } from '../../types';
import { bridgeStatusControllerInit } from './bridge-status-controller-init';
import { trace } from '../../../../util/trace';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';

jest.mock('@metamask/bridge-status-controller');
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
    addTransaction: jest.fn().mockResolvedValue('txId'),
    estimateGasFee: jest.fn().mockResolvedValue({ gasLimit: '0x5208' }),
    addTransactionBatch: jest.fn().mockResolvedValue(['txId1', 'txId2']),
    updateTransaction: jest.fn().mockResolvedValue(undefined),
  };

  // @ts-expect-error Incomplete mock, just includes properties used by code-under-test
  return {
    ...defaultMocks,
    ...partialMock,
  };
}

function buildInitRequestMock(
  initRequestProperties: Record<string, unknown> = {},
): jest.Mocked<ControllerInitRequest<BridgeStatusControllerMessenger>> {
  const baseControllerMessenger = new ExtendedControllerMessenger();
  const requestMock = {
    ...buildControllerInitRequestMock(baseControllerMessenger),
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

  if (!initRequestProperties.getController) {
    requestMock.getController = jest
      .fn()
      .mockReturnValue(buildTransactionControllerMock());
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
      getController: jest.fn().mockImplementation(() => {
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

    it('correctly sets up addTransactionFn', () => {
      // Arrange
      const mockTransactionController = buildTransactionControllerMock({
        addTransaction: jest.fn().mockResolvedValue('newTxId'),
      });
      const requestMock = buildInitRequestMock({
        getController: jest.fn().mockReturnValue(mockTransactionController),
      });

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[0][0];
      const addTransactionFn = constructorOptions.addTransactionFn;
      const mockTxParams = { from: '0xabc', to: '0x123', value: '0x0' };
      const mockOrigin = 'test-origin';

      addTransactionFn(mockTxParams, {
        origin: mockOrigin,
        networkClientId: 'mainnet',
      });
      expect(mockTransactionController.addTransaction).toHaveBeenCalledWith(
        mockTxParams,
        { origin: mockOrigin, networkClientId: 'mainnet' },
      );
    });

    it('correctly sets up estimateGasFeeFn', () => {
      // Arrange
      const mockTransactionController = buildTransactionControllerMock({
        estimateGasFee: jest.fn().mockResolvedValue({ gasLimit: '0x7530' }),
      });
      const requestMock = buildInitRequestMock({
        getController: jest.fn().mockReturnValue(mockTransactionController),
      });

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[0][0];
      const estimateGasFeeFn = constructorOptions.estimateGasFeeFn;
      const mockTxParams = {
        transactionParams: { from: '0xabc', to: '0x123', value: '0x0' },
        chainId: '0x1' as const,
      };

      estimateGasFeeFn(mockTxParams);
      expect(mockTransactionController.estimateGasFee).toHaveBeenCalledWith(
        mockTxParams,
      );
    });

    it('correctly sets up addTransactionBatchFn', () => {
      // Arrange
      const mockTransactionController = buildTransactionControllerMock({
        addTransactionBatch: jest.fn().mockResolvedValue(['txId1', 'txId2']),
      });
      const requestMock = buildInitRequestMock({
        getController: jest.fn().mockReturnValue(mockTransactionController),
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

    it('correctly sets up updateTransactionFn', () => {
      // Arrange
      const mockTransactionController = buildTransactionControllerMock({
        updateTransaction: jest.fn().mockResolvedValue(undefined),
      });
      const requestMock = buildInitRequestMock({
        getController: jest.fn().mockReturnValue(mockTransactionController),
      });

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      const constructorOptions =
        bridgeStatusControllerClassMock.mock.calls[0][0];
      const updateTransactionFn = constructorOptions.updateTransactionFn;
      const mockTxUpdate = {
        id: 'txId',
        chainId: '0x1' as const,
        networkClientId: 'mainnet',
        time: Date.now(),
        txParams: { from: '0xabc', to: '0x123', value: '0x0' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: 'confirmed' as any,
      };
      const mockNote = 'test note';

      updateTransactionFn(mockTxUpdate, mockNote);
      expect(mockTransactionController.updateTransaction).toHaveBeenCalledWith(
        mockTxUpdate,
        mockNote,
      );
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
        getController: jest.fn().mockReturnValue(mockTransactionController),
      });

      // Act
      bridgeStatusControllerInit(requestMock);

      // Assert
      expect(requestMock.getController).toHaveBeenCalledWith(
        'TransactionController',
      );
    });
  });
});
