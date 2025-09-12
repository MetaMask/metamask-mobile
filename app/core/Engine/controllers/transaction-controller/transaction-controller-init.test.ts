import {
  PublishHook,
  TransactionController,
  TransactionControllerMessenger,
  TransactionControllerOptions,
  TransactionMeta,
  TransactionType,
  type PublishBatchHookTransaction,
} from '@metamask/transaction-controller';
import { SmartTransactionStatuses } from '@metamask/smart-transactions-controller/dist/types';
import { NetworkController } from '@metamask/network-controller';

import { selectSwapsChainFeatureFlags } from '../../../../reducers/swaps';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import { getGlobalChainId } from '../../../../util/networks/global-network';
import { submitSmartTransactionHook } from '../../../../util/smart-transactions/smart-publish-hook';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { TransactionControllerInitMessenger } from '../../messengers/transaction-controller-messenger';
import { ControllerInitRequest } from '../../types';
import { TransactionControllerInit } from './transaction-controller-init';
import {
  handleTransactionAddedEventForMetrics,
  handleTransactionApprovedEventForMetrics,
  handleTransactionFinalizedEventForMetrics,
  handleTransactionRejectedEventForMetrics,
  handleTransactionSubmittedEventForMetrics,
} from './event-handlers/metrics';
import { Hex } from '@metamask/utils';
import { PayHook } from '../../../../util/transactions/hooks/pay-hook';

jest.mock('@metamask/transaction-controller');
jest.mock('../../../../reducers/swaps');
jest.mock('../../../../selectors/smartTransactionsController');
jest.mock('../../../../util/networks/global-network');
jest.mock('../../../../util/smart-transactions/smart-publish-hook');
jest.mock('./event-handlers/metrics');
jest.mock('../../../../util/transactions/hooks/pay-hook');

jest.mock('../../../../util/transactions', () => ({
  getTransactionById: jest.fn((_id) => ({
    id: _id,
    chainId: '0x1',
    status: 'approved',
    time: 123,
    txParams: {
      from: '0x123',
    },
    networkClientId: 'selectedNetworkClientId',
  })),
}));

const MOCK_TRANSACTION_META = {
  id: '123',
  chainId: '0x1',
  status: 'approved',
  time: 123,
  txParams: {
    from: '0x123',
  },
  networkClientId: 'selectedNetworkClientId',
} as TransactionMeta;

/**
 * Build a mock NetworkController.
 *
 * @param partialMock - A partial mock object for the NetworkController, merged
 * with the default mock.
 * @returns A mock NetworkController.
 */
function buildControllerMock(
  partialMock?: Partial<NetworkController>,
): NetworkController {
  const defaultControllerMocks = {};

  // @ts-expect-error Incomplete mock, just includes properties used by code-under-test.
  return {
    ...defaultControllerMocks,
    ...partialMock,
  };
}

function buildInitRequestMock(
  initRequestProperties: Record<string, unknown> = {},
): jest.Mocked<
  ControllerInitRequest<
    TransactionControllerMessenger,
    TransactionControllerInitMessenger
  >
> {
  const initMessenger = new ExtendedControllerMessenger();
  const baseControllerMessenger = new ExtendedControllerMessenger();
  const requestMock = {
    ...buildControllerInitRequestMock(baseControllerMessenger),
    initMessenger:
      initMessenger as unknown as TransactionControllerInitMessenger,
    controllerMessenger:
      baseControllerMessenger as unknown as TransactionControllerMessenger,
    ...initRequestProperties,
  };

  if (!initRequestProperties.getController) {
    requestMock.getController.mockReturnValue(buildControllerMock());
  }

  return requestMock;
}

describe('Transaction Controller Init', () => {
  const transactionControllerClassMock = jest.mocked(TransactionController);
  const selectShouldUseSmartTransactionMock = jest.mocked(
    selectShouldUseSmartTransaction,
  );
  const submitSmartTransactionHookMock = jest.mocked(
    submitSmartTransactionHook,
  );
  const selectSwapsChainFeatureFlagsMock = jest.mocked(
    selectSwapsChainFeatureFlags,
  );
  const getGlobalChainIdMock = jest.mocked(getGlobalChainId);
  const handleTransactionApprovedEventForMetricsMock = jest.mocked(
    handleTransactionApprovedEventForMetrics,
  );
  const handleTransactionFinalizedEventForMetricsMock = jest.mocked(
    handleTransactionFinalizedEventForMetrics,
  );
  const handleTransactionRejectedEventForMetricsMock = jest.mocked(
    handleTransactionRejectedEventForMetrics,
  );
  const handleTransactionSubmittedEventForMetricsMock = jest.mocked(
    handleTransactionSubmittedEventForMetrics,
  );
  const handleTransactionAddedEventForMetricsMock = jest.mocked(
    handleTransactionAddedEventForMetrics,
  );
  const payHookClassMock = jest.mocked(PayHook);
  const payHookMock: jest.MockedFn<PublishHook> = jest.fn();

  /**
   * Extract a constructor option passed to the controller.
   *
   * @param option - The option to extract.
   * @param dependencyProperties - Any properties required on the controller dependencies.
   * @returns The extracted option.
   */
  function testConstructorOption<T extends keyof TransactionControllerOptions>(
    option: T,
    dependencyProperties: Record<string, unknown> = {},
    initRequestProperties: Record<string, unknown> = {},
  ): TransactionControllerOptions[T] {
    const requestMock = buildInitRequestMock(initRequestProperties);

    requestMock.getController.mockReturnValue(
      buildControllerMock(dependencyProperties),
    );

    TransactionControllerInit(requestMock);

    return transactionControllerClassMock.mock.calls[0][0][option];
  }

  beforeEach(() => {
    jest.resetAllMocks();

    selectShouldUseSmartTransactionMock.mockReturnValue(true);
    selectSwapsChainFeatureFlagsMock.mockReturnValue({});
    getGlobalChainIdMock.mockReturnValue('0x1');

    payHookClassMock.mockReturnValue({
      getHook: () => payHookMock,
    } as unknown as PayHook);

    payHookMock.mockResolvedValue({
      transactionHash: undefined,
    });
  });

  it('returns controller instance', () => {
    const requestMock = buildInitRequestMock();
    expect(TransactionControllerInit(requestMock).controller).toBeInstanceOf(
      TransactionController,
    );
  });

  it('initialize with correct state', () => {
    const MOCK_TRANSACTION_CONTROLLER_STATE = {
      transactions: [],
    };
    const state = testConstructorOption('state', undefined, {
      persistedState: {
        TransactionController: MOCK_TRANSACTION_CONTROLLER_STATE,
      },
    });

    expect(state).toBe(MOCK_TRANSACTION_CONTROLLER_STATE);
  });

  describe('throws error', () => {
    it('if requested controller is not found', () => {
      const requestMock = buildInitRequestMock({
        getController: () => {
          throw new Error('Controller not found');
        },
      });
      expect(() => TransactionControllerInit(requestMock)).toThrow(
        'Controller not found',
      );
    });

    it('if controller initialisation fails', () => {
      transactionControllerClassMock.mockImplementationOnce(() => {
        throw new Error('Controller initialisation failed');
      });
      const requestMock = buildInitRequestMock();

      expect(() => TransactionControllerInit(requestMock)).toThrow(
        'Controller initialisation failed',
      );
    });
  });

  it.each([
    [
      'networkController',
      'getEIP1559Compatibility',
      'getCurrentNetworkEIP1559Compatibility',
    ],
    ['gasFeeController', 'fetchGasFeeEstimates', 'getGasFeeEstimates'],
    [
      'networkController',
      'getNetworkClientRegistry',
      'getNetworkClientRegistry',
    ],
    ['keyringController', 'signTransaction', 'sign'],
  ])('calls %s.%s on option %s', (_controller, method, option) => {
    const mock = jest.fn();

    const optionFn = testConstructorOption(
      option as keyof TransactionControllerOptions,
      {
        [method]: mock,
      },
    ) as unknown as () => void;

    optionFn();

    expect(mock).toHaveBeenCalled();
  });

  it('calls smartTransactionsController.getTransactions on option getExternalPendingTransactions', () => {
    const MOCK_STX = [{ id: '123' }];
    const MOCK_ADDRESS = '0x123';
    const getTransactionsMock = jest.fn().mockReturnValue(MOCK_STX);

    const optionFn = testConstructorOption('getExternalPendingTransactions', {
      getTransactions: getTransactionsMock,
    });

    optionFn?.(MOCK_ADDRESS);

    expect(getTransactionsMock).toHaveBeenCalledWith({
      addressFrom: MOCK_ADDRESS,
      status: SmartTransactionStatuses.PENDING,
    });
  });

  it('determines if simulation enabled using preference', () => {
    const optionFn = testConstructorOption('isSimulationEnabled', {
      state: {
        useTransactionSimulations: true,
      },
    });

    expect(optionFn?.()).toBe(true);
  });

  it('determines if resubmit enabled for pending transactions', () => {
    const optionFn = testConstructorOption(
      'pendingTransactions',
    )?.isResubmitEnabled;

    expect(optionFn?.()).toBe(false);
  });

  describe('publish hook', () => {
    it('calls submitSmartTransactionHook', async () => {
      const hooks = testConstructorOption('hooks');

      await hooks?.publish?.(MOCK_TRANSACTION_META);

      expect(submitSmartTransactionHookMock).toHaveBeenCalledTimes(1);
      expect(selectShouldUseSmartTransactionMock).toHaveBeenCalledTimes(1);
      expect(selectShouldUseSmartTransactionMock).toHaveBeenCalledWith(
        undefined,
        MOCK_TRANSACTION_META.chainId,
      );
      expect(selectSwapsChainFeatureFlagsMock).toHaveBeenCalledTimes(1);
      expect(submitSmartTransactionHookMock).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionMeta: MOCK_TRANSACTION_META,
          shouldUseSmartTransaction: true,
        }),
      );
    });

    it('calls pay hook', async () => {
      const hooks = testConstructorOption('hooks');
      await hooks?.publish?.(MOCK_TRANSACTION_META);

      expect(payHookMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('publishBatch hook', () => {
    it('calls submitBatchSmartTransactionHook', () => {
      const mockTransactionMeta = {
        id: '123',
        chainId: '0x1',
        status: 'approved',
        time: 123,
        txParams: {
          from: '0x123',
        },
        networkClientId: 'selectedNetworkClientId',
      };

      const getTransactionByIdMock = jest.requireMock(
        '../../../../util/transactions',
      ).getTransactionById;
      getTransactionByIdMock.mockReturnValue(mockTransactionMeta);

      selectShouldUseSmartTransactionMock.mockReturnValue(true);

      const submitBatchSmartTransactionHookMock = jest.requireMock(
        '../../../../util/smart-transactions/smart-publish-hook',
      ).submitBatchSmartTransactionHook;
      submitBatchSmartTransactionHookMock.mockResolvedValue({
        results: [{ transactionHash: '0xhash' }],
      });

      const hooks = testConstructorOption('hooks');

      const mockTransactions = [
        {
          id: '123',
          signedTx: '0x1234' as Hex,
        },
      ];

      hooks?.publishBatch?.({
        transactions:
          mockTransactions as unknown as PublishBatchHookTransaction[],
        from: '0x123',
        networkClientId: 'selectedNetworkClientId',
      });

      expect(submitBatchSmartTransactionHookMock).toHaveBeenCalled();

      expect(submitBatchSmartTransactionHookMock).toHaveBeenCalledWith(
        expect.objectContaining({
          transactions: mockTransactions,
          shouldUseSmartTransaction: true,
        }),
      );
    });
  });

  it('determines incoming transactions based on preference privacyMode', () => {
    const option = testConstructorOption('incomingTransactions', {
      state: {
        privacyMode: false,
      },
    });

    const isEnabledFn = option?.isEnabled;
    const updateTransactionsProp = option?.updateTransactions;

    expect(isEnabledFn?.()).toBe(true);
    expect(updateTransactionsProp).toBe(true);
  });

  it('determines if automatic gas fee update is enabled based on transaction type', () => {
    const option = testConstructorOption('isAutomaticGasFeeUpdateEnabled');
    const isEnabledFn = option as ({ type }: { type: string }) => boolean;

    // Redesigned transaction types
    expect(isEnabledFn({ type: TransactionType.stakingDeposit })).toBe(true);
    expect(isEnabledFn({ type: TransactionType.stakingUnstake })).toBe(true);
    expect(isEnabledFn({ type: TransactionType.stakingClaim })).toBe(true);
    expect(isEnabledFn({ type: TransactionType.contractInteraction })).toBe(
      true,
    );

    // Non-redesigned transaction types
    expect(isEnabledFn({ type: TransactionType.bridge })).toBe(false);
  });

  it('gets network state from network controller on option getNetworkState', () => {
    const MOCK_NETWORK_STATE = {
      chainId: '0x1',
    };
    const option = testConstructorOption('getNetworkState', {
      state: {
        ...MOCK_NETWORK_STATE,
      },
    });

    expect(option?.()).toStrictEqual(MOCK_NETWORK_STATE);
  });

  it('calls appropriate handlers when transaction events are triggered', () => {
    const mockSubscribe = jest.fn();
    const subscribeCallbacks: Record<string, (...args: unknown[]) => void> = {};

    mockSubscribe.mockImplementation((eventName, callback) => {
      subscribeCallbacks[eventName] = callback;
    });

    const requestMock = buildInitRequestMock({
      initMessenger: {
        subscribe: mockSubscribe,
      },
      getState: () => ({ confirmationMetrics: { metricsById: {} } }),
    });

    TransactionControllerInit(requestMock);

    const mockTransactionMeta = {
      id: '123',
      status: 'approved',
    } as TransactionMeta;

    const handlerContext = {
      getState: expect.any(Function),
      initMessenger: expect.any(Object),
      smartTransactionsController: expect.any(Object),
    };

    const eventHandlerMap = [
      {
        event: 'TransactionController:transactionApproved',
        handler: handleTransactionApprovedEventForMetricsMock,
        payload: { transactionMeta: mockTransactionMeta },
        expectedArgs: [mockTransactionMeta, handlerContext],
      },
      {
        event: 'TransactionController:transactionConfirmed',
        handler: handleTransactionFinalizedEventForMetricsMock,
        payload: mockTransactionMeta,
        expectedArgs: [mockTransactionMeta, handlerContext],
      },
      {
        event: 'TransactionController:transactionDropped',
        handler: handleTransactionFinalizedEventForMetricsMock,
        payload: { transactionMeta: mockTransactionMeta },
        expectedArgs: [mockTransactionMeta, handlerContext],
      },
      {
        event: 'TransactionController:transactionFailed',
        handler: handleTransactionFinalizedEventForMetricsMock,
        payload: { transactionMeta: mockTransactionMeta },
        expectedArgs: [mockTransactionMeta, handlerContext],
      },
      {
        event: 'TransactionController:transactionRejected',
        handler: handleTransactionRejectedEventForMetricsMock,
        payload: { transactionMeta: mockTransactionMeta },
        expectedArgs: [mockTransactionMeta, handlerContext],
      },
      {
        event: 'TransactionController:transactionSubmitted',
        handler: handleTransactionSubmittedEventForMetricsMock,
        payload: { transactionMeta: mockTransactionMeta },
        expectedArgs: [mockTransactionMeta, handlerContext],
      },
      {
        event: 'TransactionController:unapprovedTransactionAdded',
        handler: handleTransactionAddedEventForMetricsMock,
        payload: mockTransactionMeta,
        expectedArgs: [mockTransactionMeta, handlerContext],
      },
    ];

    // Verify all events are subscribed
    expect(Object.keys(subscribeCallbacks).length).toBe(eventHandlerMap.length);

    // Test each event handler
    eventHandlerMap.forEach(({ event, handler, payload, expectedArgs }) => {
      subscribeCallbacks[event](payload);
      expect(handler).toHaveBeenCalledWith(...expectedArgs);
    });
  });
});
