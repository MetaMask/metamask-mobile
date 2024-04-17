/* eslint-disable import/no-nodejs-modules */
import EventEmitter from 'events';
import {
  TransactionType,
  TransactionStatus,
  TransactionController,
} from '@metamask/transaction-controller';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import {
  SubmitSmartTransactionRequest,
  submitSmartTransactionHook,
} from './smart-tx';
import { ChainId } from '@metamask/controller-utils';
import { ApprovalController } from '@metamask/approval-controller';

const addressFrom = '0xabce7847fd3661a9b7c86aaf1daea08d9da5750e';
const transactionHash =
  '0x0302b75dfb9fd9eb34056af031efcaee2a8cbd799ea054a85966165cd82a7356';
const uuid = 'uuid';

let addRequestCallback: () => void;

type SubmitSmartTransactionRequestMocked = SubmitSmartTransactionRequest & {
  smartTransactionsController: jest.Mocked<SmartTransactionsController>;
  transactionController: jest.Mocked<TransactionController>;
};

const createSignedTransaction = () =>
  '0xf86c098504a817c800825208943535353535353535353535353535353535353535880de0b6b3a76400008025a02b79f322a625d623a2bb2911e0c6b3e7eaf741a7c7c5d2e8c67ef3ff4acf146ca01ae168fea63dc3391b75b586c8a7c0cb55cdf3b8e2e4d8e097957a3a56c6f2c5';

const createTransactionControllerMock = () =>
  ({
    approveTransactionsWithSameNonce: jest.fn((transactions = []) =>
      transactions.length === 0 ? [] : [createSignedTransaction()],
    ),
    state: { transactions: [] },
  } as unknown as jest.Mocked<TransactionController>);

const createApprovalControllerMock = () =>
  ({
    state: {
      pendingApprovals: [],
    },
    startFlow: jest.fn().mockReturnValue({ id: 'approvalId' }),
    addAndShowApprovalRequest: jest
      .fn()
      .mockResolvedValue('addAndShowApprovalRequest resolved value'),
    updateRequestState: jest.fn(),
    endFlow: jest.fn(),
  } as unknown as jest.Mocked<ApprovalController>);

const createSmartTransactionsControllerMock = () =>
  ({
    getFees: jest.fn(async () => ({
      tradeTxFees: {
        cancelFees: [],
        feeEstimate: 42000000000000,
        fees: [{ maxFeePerGas: 12843636951, maxPriorityFeePerGas: 2853145236 }],
        gasLimit: 21000,
        gasUsed: 21000,
      },
    })),
    submitSignedTransactions: jest.fn(async () => ({
      uuid,
      txHash: transactionHash,
    })),
    eventEmitter: new EventEmitter(),
  } as unknown as jest.Mocked<SmartTransactionsController>);

const createRequest = () => ({
  transactionMeta: {
    origin: 'http://localhost',
    transactionHash,
    status: TransactionStatus.signed,
    id: '1',
    transaction: {
      from: addressFrom,
      to: '0x1678a085c290ebd122dc42cba69373b5953b831d',
      gasPrice: '0x77359400',
      gas: '0x7b0d',
      nonce: '0x4b',
    },
    type: TransactionType.simpleSend,
    chainId: ChainId.mainnet,
    time: 1624408066355,
    defaultGasEstimates: {
      gas: '0x7b0d',
      gasPrice: '0x77359400',
    },
    error: {
      name: 'Error',
      message: 'Details of the error',
    },
    securityProviderResponse: {
      flagAsDangerous: 0,
    },
  },
  smartTransactionsController: createSmartTransactionsControllerMock(),
  transactionController: createTransactionControllerMock(),
  isSmartTransaction: true,
  approvalController: createApprovalControllerMock(),
  featureFlags: {
    extensionActive: true,
    mobileActive: true,
    mobileActiveIOS: true,
    mobileActiveAndroid: true,
    smartTransactions: {
      expectedDeadline: 45,
      maxDeadline: 150,
      returnTxHashAsap: false,
    },
  },
});

jest.setTimeout(10 * 1000);

describe('submitSmartTransactionHook', () => {
  beforeEach(() => {
    addRequestCallback = () => undefined;
  });

  it('does not submit a transaction that is not a smart transaction', async () => {
    const request: SubmitSmartTransactionRequestMocked = createRequest();
    request.isSmartTransaction = false;
    const result = await submitSmartTransactionHook(request);
    expect(result).toEqual({ transactionHash: undefined });
  });

  it('returns a txHash asap if the feature flag requires it', async () => {
    const request: SubmitSmartTransactionRequestMocked = createRequest();
    request.featureFlags.smartTransactions.returnTxHashAsap = true;
    const result = await submitSmartTransactionHook(request);
    expect(result).toEqual({ transactionHash });
  });

  it('throws an error if there is no uuid', async () => {
    const request: SubmitSmartTransactionRequestMocked = createRequest();
    request.smartTransactionsController.submitSignedTransactions = jest.fn(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async ({ signedTransactions, signedCanceledTransactions }) => ({
        uuid: undefined,
      }),
    );
    await expect(submitSmartTransactionHook(request)).rejects.toThrow(
      'No smart transaction UUID',
    );
  });

  it('throws an error if there is no transaction hash', async () => {
    const request: SubmitSmartTransactionRequestMocked = createRequest();
    setImmediate(() => {
      request.smartTransactionsController.eventEmitter.emit(
        `uuid:smartTransaction`,
        {
          status: 'cancelled',
          statusMetadata: {
            minedHash: '',
          },
        },
      );
    });
    await expect(submitSmartTransactionHook(request)).rejects.toThrow(
      'Transaction does not have a transaction hash, there was a problem',
    );
  });

  it.todo('throws an error if there is no origin');

  it.only('submits a smart transaction', async () => {
    const request: SubmitSmartTransactionRequestMocked = createRequest();
    setImmediate(() => {
      request.smartTransactionsController.eventEmitter.emit(
        `uuid:smartTransaction`,
        {
          status: 'pending',
          statusMetadata: {
            minedHash: '',
          },
        },
      );
      request.smartTransactionsController.eventEmitter.emit(
        `uuid:smartTransaction`,
        {
          status: 'success',
          statusMetadata: {
            minedHash: transactionHash,
          },
        },
      );
    });
    const result = await submitSmartTransactionHook(request);
    expect(result).toEqual({ transactionHash });
    const { transaction, chainId } = request.transactionMeta;
    expect(
      request.transactionController.approveTransactionsWithSameNonce,
    ).toHaveBeenCalledWith(
      [
        {
          ...transaction,
          maxFeePerGas: '0x2fd8a58d7',
          maxPriorityFeePerGas: '0xaa0f8a94',
          chainId,
          value: undefined,
        },
      ],
      { hasNonce: true },
    );
    expect(
      request.smartTransactionsController.submitSignedTransactions,
    ).toHaveBeenCalledWith({
      signedTransactions: [createSignedTransaction()],
      signedCanceledTransactions: [],
      transaction,
      transactionMeta: request.transactionMeta,
    });
    addRequestCallback();
    expect(request.approvalController.startFlow).toHaveBeenCalled();
    expect(
      request.approvalController.addAndShowApprovalRequest,
    ).toHaveBeenCalledWith({
      id: 'approvalId',
      origin: 'http://localhost',
      type: 'smart_transaction_status',
      requestState: {
        smartTransaction: {
          status: 'pending',
          uuid,
          creationTime: expect.any(Number),
        },
        isDapp: true,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
      },
    });
    expect(request.approvalController.updateRequestState).toHaveBeenCalledWith({
      id: 'approvalId',
      requestState: {
        smartTransaction: {
          status: 'success',
          statusMetadata: {
            minedHash:
              '0x0302b75dfb9fd9eb34056af031efcaee2a8cbd799ea054a85966165cd82a7356',
          },
        },
        isDapp: true,
      },
    });

    expect(request.approvalController.endFlow).toHaveBeenCalledWith({
      id: 'approvalId',
    });
  });

  it('submits a smart transaction and does not update approval request if approval was already approved or rejected', async () => {
    const request: SubmitSmartTransactionRequestMocked = createRequest();
    setImmediate(() => {
      request.smartTransactionsController.eventEmitter.emit(
        `uuid:smartTransaction`,
        {
          status: 'pending',
          uuid,
          statusMetadata: {
            minedHash: '',
          },
        },
      );
      addRequestCallback();
      request.smartTransactionsController.eventEmitter.emit(
        `uuid:smartTransaction`,
        {
          status: 'success',
          uuid,
          statusMetadata: {
            minedHash: transactionHash,
          },
        },
      );
    });
    const result = await submitSmartTransactionHook(request);
    expect(result).toEqual({ transactionHash });
    const { transaction, chainId } = request.transactionMeta;
    expect(
      request.transactionController.approveTransactionsWithSameNonce,
    ).toHaveBeenCalledWith(
      [
        {
          ...transaction,
          maxFeePerGas: '0x2fd8a58d7',
          maxPriorityFeePerGas: '0xaa0f8a94',
          chainId,
        },
      ],
      { hasNonce: true },
    );
    expect(
      request.smartTransactionsController.submitSignedTransactions,
    ).toHaveBeenCalledWith({
      signedTransactions: [createSignedTransaction()],
      signedCanceledTransactions: [],
      transaction,
      transactionMeta: request.transactionMeta,
    });
    expect(request.approvalController.startFlow).toHaveBeenCalled();
    expect(
      request.approvalController.addAndShowApprovalRequest,
    ).toHaveBeenCalledWith(
      {
        id: 'approvalId',
        origin: 'http://localhost',
        type: 'smartTransaction:showSmartTransactionStatusPage',
        requestState: {
          smartTransaction: {
            status: 'pending',
            uuid,
            creationTime: expect.any(Number),
          },
          isDapp: true,
        },
      },
      true,
    );
    expect(request.approvalController.endFlow).toHaveBeenCalledWith({
      id: 'approvalId',
    });
  });

  describe('MM Swaps', () => {
    it.todo(
      'starts an approval flow if there is an swap tx requires allowance',
    );
    it.todo('starts an approval flow if a swap tx does not require allowance');
    it.todo(
      'does not start an approval flow if a swap tx is after a swap allowance tx',
    );
    it.todo('updates TransactionController.swapsTransactions');
  });
});
