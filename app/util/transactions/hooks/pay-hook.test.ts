import { TransactionMeta } from '@metamask/transaction-controller';
import { TransactionBridgeQuote } from '../../../components/Views/confirmations/utils/bridge';
import { TransactionControllerInitMessenger } from '../../../core/Engine/messengers/transaction-controller-messenger';
import { PayHook } from './pay-hook';
import { Messenger } from '@metamask/base-controller';
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

jest.mock('../../../selectors/smartTransactionsController');
jest.mock('../../transaction-controller');

const TRANSACTION_ID_MOCK = '123-456';
const BRIDGE_TRANSACTION_ID_MOCK = '456-789';
const BRIDGE_TRANSACTION_ID_2_MOCK = '789-012';

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
} as TransactionMeta;

const BRIDGE_TRANSACTION_META_MOCK = {
  id: BRIDGE_TRANSACTION_ID_MOCK,
} as TransactionMeta;

const BRIDGE_TRANSACTION_META_2_MOCK = {
  id: BRIDGE_TRANSACTION_ID_2_MOCK,
} as TransactionMeta;

describe('Pay Publish Hook', () => {
  let hook: PayHook;
  let baseMessenger: Messenger<
    BridgeStatusControllerActions,
    BridgeStatusControllerEvents
  >;
  let messengerMock: jest.Mocked<TransactionControllerInitMessenger>;

  const selectShouldUseSmartTransactionMock = jest.mocked(
    selectShouldUseSmartTransaction,
  );

  const submitTransactionMock: jest.MockedFunction<
    BridgeStatusController['submitTx']
  > = jest.fn();

  function runHook() {
    return hook.getHook()(TRANSACTION_META_MOCK, '0x1234');
  }

  function updateBridgeStatus(
    transactionId: string,
    status: StatusTypes,
  ): void {
    baseMessenger.publish(
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
    jest.clearAllMocks();

    baseMessenger = new Messenger<
      BridgeStatusControllerActions,
      BridgeStatusControllerEvents
    >();

    baseMessenger.registerActionHandler(
      'BridgeStatusController:submitTx',
      submitTransactionMock,
    );

    messengerMock = baseMessenger.getRestricted({
      name: 'TransactionControllerInitMessenger',
      allowedActions: ['BridgeStatusController:submitTx'],
      allowedEvents: ['BridgeStatusController:stateChange'],
    }) as jest.Mocked<TransactionControllerInitMessenger>;

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
  });

  it('submits matching quotes to bridge status controller', async () => {
    await runHook();

    expect(submitTransactionMock).toHaveBeenCalledWith(QUOTE_MOCK, false);
    expect(submitTransactionMock).toHaveBeenCalledWith(QUOTE_2_MOCK, false);
  });

  it('indicates if smart transactions is enabled', async () => {
    selectShouldUseSmartTransactionMock.mockReturnValue(true);

    await runHook();

    expect(submitTransactionMock).toHaveBeenCalledWith(QUOTE_MOCK, true);
    expect(submitTransactionMock).toHaveBeenCalledWith(QUOTE_2_MOCK, true);
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

    await expect(runHook).rejects.toThrow('Bridge transaction failed');
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
});
