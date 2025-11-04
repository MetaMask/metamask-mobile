import {
  TransactionControllerGetStateAction,
  TransactionControllerState,
  TransactionControllerStateChangeEvent,
  TransactionControllerUnapprovedTransactionAddedEvent,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  TransactionBridgeQuote,
  refreshQuote,
} from '../../../components/Views/confirmations/utils/bridge';
import { TransactionControllerInitMessenger } from '../../../core/Engine/messengers/transaction-controller-messenger';
import { PayHook } from './pay-hook';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  MockAnyNamespace,
} from '@metamask/messenger';
import {
  BridgeStatusController,
  BridgeStatusControllerActions,
  BridgeStatusControllerEvents,
  BridgeStatusControllerState,
} from '@metamask/bridge-status-controller';
import { store } from '../../../store';
import { RootState } from '../../../reducers';
import { StatusTypes } from '@metamask/bridge-controller';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';
import { toHex } from '@metamask/controller-utils';

jest.mock('../../../selectors/smartTransactionsController');
jest.mock('../../transaction-controller');
jest.mock('../../../components/Views/confirmations/utils/bridge');

const TRANSACTION_ID_MOCK = '123-456';
const REQUIRED_TRANSACTION_ID_MOCK = '234-567';
const BRIDGE_TRANSACTION_ID_MOCK = '456-789';
const BRIDGE_TRANSACTION_ID_2_MOCK = '789-012';
const ERROR_MESSAGE_MOCK = 'Test error';

const QUOTE_MOCK = {
  quote: {
    srcChainId: 123,
  },
  trade: { gasLimit: 2000 },
} as TransactionBridgeQuote;

const QUOTE_2_MOCK = {
  ...QUOTE_MOCK,
  approval: { gasLimit: 3000 },
} as TransactionBridgeQuote;

const TRANSACTION_META_MOCK = {
  id: TRANSACTION_ID_MOCK,
  txParams: {
    from: '0xabc',
  },
} as TransactionMeta;

const BRIDGE_TRANSACTION_META_MOCK = {
  id: BRIDGE_TRANSACTION_ID_MOCK,
} as TransactionMeta;

const BRIDGE_TRANSACTION_META_2_MOCK = {
  id: BRIDGE_TRANSACTION_ID_2_MOCK,
} as TransactionMeta;

type RootMessenger = Messenger<
  MockAnyNamespace,
  BridgeStatusControllerActions | TransactionControllerGetStateAction,
  | BridgeStatusControllerEvents
  | TransactionControllerStateChangeEvent
  | TransactionControllerUnapprovedTransactionAddedEvent
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('Pay Publish Hook', () => {
  let hook: PayHook;
  let rootMessenger: RootMessenger;
  let messengerMock: TransactionControllerInitMessenger;

  const selectShouldUseSmartTransactionMock = jest.mocked(
    selectShouldUseSmartTransaction,
  );

  const submitTransactionMock: jest.MockedFunction<
    BridgeStatusController['submitTx']
  > = jest.fn();

  const getTransactionStateMock = jest.fn();
  const getBridgeStatusStateMock = jest.fn();
  const refreshQuoteMock = jest.mocked(refreshQuote);

  function runHook() {
    return hook.getHook()(TRANSACTION_META_MOCK, '0x1234');
  }

  function unapprovedTransactionEvent(transactionId: string) {
    rootMessenger.publish('TransactionController:unapprovedTransactionAdded', {
      ...TRANSACTION_META_MOCK,
      id: transactionId,
      chainId: toHex(123),
    });
  }

  function updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
  ) {
    rootMessenger.publish(
      'TransactionController:stateChange',
      {
        transactions: [
          {
            ...TRANSACTION_META_MOCK,
            id: transactionId,
            status,
            type: TransactionType.bridge,
            error: {
              message: ERROR_MESSAGE_MOCK,
            },
          },
        ],
      } as TransactionControllerState,
      [],
    );
  }

  function updateBridgeStatus(
    transactionId: string,
    status: StatusTypes,
  ): void {
    rootMessenger.publish(
      'BridgeStatusController:stateChange',
      {
        txHistory: {
          [transactionId]: {
            status: {
              status,
            },
          },
        },
      } as unknown as BridgeStatusControllerState,
      [],
    );
  }

  beforeEach(() => {
    jest.resetAllMocks();

    rootMessenger = getRootMessenger();

    rootMessenger.registerActionHandler(
      'BridgeStatusController:getState',
      getBridgeStatusStateMock,
    );

    rootMessenger.registerActionHandler(
      'BridgeStatusController:submitTx',
      submitTransactionMock,
    );

    rootMessenger.registerActionHandler(
      'TransactionController:getState',
      getTransactionStateMock,
    );

    messengerMock = new Messenger<
      'TransactionControllerInitMessenger',
      BridgeStatusControllerActions | TransactionControllerGetStateAction,
      | BridgeStatusControllerEvents
      | TransactionControllerStateChangeEvent
      | TransactionControllerUnapprovedTransactionAddedEvent,
      RootMessenger
    >({
      namespace: 'TransactionControllerInitMessenger',
      parent: rootMessenger,
    });

    rootMessenger.delegate({
      actions: [
        'BridgeStatusController:getState',
        'BridgeStatusController:submitTx',
        'TransactionController:getState',
      ],
      events: [
        'BridgeStatusController:stateChange',
        'TransactionController:stateChange',
        'TransactionController:unapprovedTransactionAdded',
      ],
      messenger: messengerMock,
    });

    hook = new PayHook({
      messenger: messengerMock,
    });

    jest.spyOn(store, 'getState').mockReturnValue({
      confirmationMetrics: {
        transactionBridgeQuotesById: {
          [TRANSACTION_ID_MOCK]: [QUOTE_MOCK, QUOTE_2_MOCK],
        },
      },
    } as unknown as RootState);

    submitTransactionMock.mockImplementationOnce(async () => {
      setTimeout(() => {
        updateBridgeStatus(BRIDGE_TRANSACTION_ID_MOCK, StatusTypes.COMPLETE);
      }, 0);

      return BRIDGE_TRANSACTION_META_MOCK;
    });

    submitTransactionMock.mockImplementationOnce(async () => {
      setTimeout(() => {
        updateBridgeStatus(BRIDGE_TRANSACTION_ID_2_MOCK, StatusTypes.COMPLETE);
      }, 0);

      return BRIDGE_TRANSACTION_META_2_MOCK;
    });

    selectShouldUseSmartTransactionMock.mockReturnValue(false);

    refreshQuoteMock.mockImplementation(async (_quote) => _quote);

    getTransactionStateMock.mockReturnValue({
      transactions: [],
    } as unknown as TransactionControllerState);

    getBridgeStatusStateMock.mockReturnValue({
      txHistory: {},
    } as BridgeStatusControllerState);
  });

  it('submits matching quotes to bridge status controller', async () => {
    await runHook();

    expect(submitTransactionMock).toHaveBeenCalledWith(
      '0xabc',
      QUOTE_MOCK,
      false,
    );
    expect(submitTransactionMock).toHaveBeenCalledWith(
      '0xabc',
      QUOTE_2_MOCK,
      false,
    );
  });

  it('indicates if smart transactions is enabled', async () => {
    selectShouldUseSmartTransactionMock.mockReturnValue(true);

    await runHook();

    expect(submitTransactionMock).toHaveBeenCalledWith(
      '0xabc',
      QUOTE_MOCK,
      true,
    );
    expect(submitTransactionMock).toHaveBeenCalledWith(
      '0xabc',
      QUOTE_2_MOCK,
      true,
    );
  });

  it('does nothing if no matching quotes', async () => {
    jest.spyOn(store, 'getState').mockReturnValue({
      confirmationMetrics: {
        transactionBridgeQuotesById: {},
      },
    } as unknown as RootState);

    await runHook();

    expect(submitTransactionMock).not.toHaveBeenCalled();
  });

  it('does nothing if first quote has same source and target chain', async () => {
    jest.spyOn(store, 'getState').mockReturnValue({
      confirmationMetrics: {
        transactionBridgeQuotesById: {
          [TRANSACTION_ID_MOCK]: [
            {
              ...QUOTE_MOCK,
              quote: { ...QUOTE_MOCK.quote, destChainId: 123 },
            },
            QUOTE_2_MOCK,
          ],
        },
      },
    } as unknown as RootState);

    await runHook();

    expect(submitTransactionMock).not.toHaveBeenCalled();
  });

  it('throws if bridge status is failed', async () => {
    submitTransactionMock.mockReset();
    submitTransactionMock.mockImplementation(async () => {
      setTimeout(() => {
        updateBridgeStatus(BRIDGE_TRANSACTION_ID_MOCK, StatusTypes.FAILED);
      }, 0);

      return BRIDGE_TRANSACTION_META_MOCK;
    });

    await expect(runHook).rejects.toThrow('Bridge failed');
  });

  it('returns empty result once all bridges are complete', async () => {
    const result = await runHook();

    expect(result).toEqual({
      transactionHash: undefined,
    });
  });

  it('returns empty result if error', async () => {
    submitTransactionMock.mockImplementationOnce(() => {
      throw new Error('Bridge transaction error');
    });

    const result = await runHook();

    expect(result).toEqual({
      transactionHash: undefined,
    });
  });

  it('refreshes quote if subsequent bridge transaction', async () => {
    await runHook();

    expect(refreshQuoteMock).toHaveBeenCalledWith(QUOTE_2_MOCK);
  });

  it.each([TransactionStatus.dropped, TransactionStatus.failed])(
    'throws if required transaction status is %s',
    async (status) => {
      submitTransactionMock.mockReset();
      submitTransactionMock.mockImplementationOnce(async () => {
        unapprovedTransactionEvent(REQUIRED_TRANSACTION_ID_MOCK);

        setTimeout(() => {
          updateTransactionStatus(REQUIRED_TRANSACTION_ID_MOCK, status);
        }, 0);

        return BRIDGE_TRANSACTION_META_MOCK;
      });

      await expect(runHook()).rejects.toThrow(
        `Required transaction failed - ${TransactionType.bridge} - ${ERROR_MESSAGE_MOCK}`,
      );
    },
  );

  it('waits for required transactions to confirm', async () => {
    jest.spyOn(store, 'getState').mockReturnValue({
      confirmationMetrics: {
        transactionBridgeQuotesById: {
          [TRANSACTION_ID_MOCK]: [QUOTE_MOCK],
        },
      },
    } as unknown as RootState);

    getBridgeStatusStateMock.mockReturnValue({
      txHistory: {
        [BRIDGE_TRANSACTION_ID_MOCK]: {
          status: {
            status: StatusTypes.COMPLETE,
          },
        },
      },
    });

    submitTransactionMock.mockReset();
    submitTransactionMock.mockImplementationOnce(async () => {
      unapprovedTransactionEvent(REQUIRED_TRANSACTION_ID_MOCK);

      setTimeout(() => {
        updateTransactionStatus(
          REQUIRED_TRANSACTION_ID_MOCK,
          TransactionStatus.confirmed,
        );
      }, 0);

      return BRIDGE_TRANSACTION_META_MOCK;
    });

    await runHook();
  });
});
