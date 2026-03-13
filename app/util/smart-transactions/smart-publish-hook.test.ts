/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-nodejs-modules */
require('dotenv').config({ path: '../../../.js.env' });
import {
  TransactionType,
  TransactionStatus,
  TransactionController,
  TransactionMeta,
  TransactionEnvelopeType,
} from '@metamask/transaction-controller';
import {
  ClientId,
  SmartTransactionsController,
  SmartTransactionsControllerMessenger,
  SmartTransactionsControllerSmartTransactionEvent,
  type SmartTransaction,
} from '@metamask/smart-transactions-controller';

import {
  SubmitSmartTransactionRequest,
  submitSmartTransactionHook,
  submitBatchSmartTransactionHook,
} from './smart-publish-hook';
import { ChainId } from '@metamask/controller-utils';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { Hex } from '@metamask/utils';

jest.mock('../../core/Engine', () => ({
  context: {
    TransactionController: {
      update: jest.fn(),
    },
  },
}));

const addressFrom = '0xabce7847fd3661a9b7c86aaf1daea08d9da5750e';
const transactionHash =
  '0x0302b75dfb9fd9eb34056af031efcaee2a8cbd799ea054a85966165cd82a7356';
const stxUuid = 'uuid';

type SubmitSmartTransactionRequestMocked = SubmitSmartTransactionRequest & {
  transactionController: jest.Mocked<TransactionController>;
};

const createSignedTransaction = (): Hex =>
  '0xf86c098504a817c800825208943535353535353535353535353535353535353535880de0b6b3a76400008025a02b79f322a625d623a2bb2911e0c6b3e7eaf741a7c7c5d2e8c67ef3ff4acf146ca01ae168fea63dc3391b75b586c8a7c0cb55cdf3b8e2e4d8e097957a3a56c6f2c5';

const createTransactionControllerMock = () =>
  ({
    approveTransactionsWithSameNonce: jest.fn((transactions = []) =>
      transactions.length === 0 ? [] : [createSignedTransaction()],
    ),
    state: { transactions: [] },
    update: jest.fn(),
  }) as unknown as jest.Mocked<TransactionController>;

const defaultTransactionMeta: TransactionMeta = {
  origin: 'http://localhost',
  hash: transactionHash,
  status: TransactionStatus.signed,
  id: '1',
  txParams: {
    from: addressFrom,
    to: '0x1678a085c290ebd122dc42cba69373b5953b831d',
    gasPrice: '0x77359400',
    gas: '0x7b0d',
    nonce: '0x4b',
  },
  type: TransactionType.simpleSend,
  chainId: ChainId.mainnet,
  networkClientId: 'testNetworkClientId',
  time: 1624408066355,
};

type WithRequestOptions = Partial<SubmitSmartTransactionRequestMocked>;

type WithRequestCallback<ReturnValue> = ({
  request,
  controllerMessenger,
  getFeesSpy,
  submitSignedTransactionsSpy,
  smartTransactionsController,
}: {
  request: SubmitSmartTransactionRequestMocked;
  controllerMessenger: RootMessenger;
  getFeesSpy: jest.SpyInstance;
  submitSignedTransactionsSpy: jest.SpyInstance;
  smartTransactionsController: SmartTransactionsController;
}) => ReturnValue;

type WithRequestArgs<ReturnValue> =
  | [WithRequestCallback<ReturnValue>]
  | [WithRequestOptions, WithRequestCallback<ReturnValue>];

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SmartTransactionsControllerMessenger>,
  MessengerEvents<SmartTransactionsControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

function withRequest<ReturnValue>(
  ...args: WithRequestArgs<ReturnValue>
): ReturnValue {
  const [options, fn] = args.length === 2 ? args : [{}, args[0]];
  const rootMessenger = getRootMessenger();

  const smartTransactionControllerMessenger = new Messenger<
    'SmartTransactionsController',
    MessengerActions<SmartTransactionsControllerMessenger>,
    MessengerEvents<SmartTransactionsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'SmartTransactionsController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'NetworkController:getNetworkClientById',
      'TransactionController:getNonceLock',
      'TransactionController:getTransactions',
      'TransactionController:updateTransaction',
      'RemoteFeatureFlagController:getState',
      'ErrorReportingService:captureException',
    ],
    events: [
      'NetworkController:stateChange',
      'RemoteFeatureFlagController:stateChange',
    ],
    messenger: smartTransactionControllerMessenger,
  });

  const smartPublishHookMessenger = new Messenger<
    'SmartPublishHook',
    never,
    SmartTransactionsControllerSmartTransactionEvent,
    RootMessenger
  >({
    namespace: 'SmartPublishHook',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [],
    events: ['SmartTransactionsController:smartTransaction'],
    messenger: smartPublishHookMessenger,
  });

  const smartTransactionsController = new SmartTransactionsController({
    messenger: smartTransactionControllerMessenger,
    trackMetaMetricsEvent: jest.fn(),
    getMetaMetricsProps: jest.fn(),
    getFeatureFlags: jest.fn(),
    clientId: ClientId.Mobile,
  });

  const getFeesSpy = jest
    .spyOn(smartTransactionsController, 'getFees')
    .mockResolvedValue({
      tradeTxFees: {
        cancelFees: [],
        feeEstimate: 42000000000000,
        fees: [{ maxFeePerGas: 12843636951, maxPriorityFeePerGas: 2853145236 }],
        gasLimit: 21000,
        gasUsed: 21000,
      },
      approvalTxFees: null,
    });
  const submitSignedTransactionsSpy = jest
    .spyOn(smartTransactionsController, 'submitSignedTransactions')
    .mockResolvedValue({
      uuid: stxUuid,
      txHash: transactionHash,
    });

  const request: SubmitSmartTransactionRequestMocked = {
    transactionMeta: {
      ...defaultTransactionMeta,
    },
    smartTransactionsController,
    transactions: [], // Ensure transactions is always an array, not undefined
    controllerMessenger: smartPublishHookMessenger,
    transactionController: createTransactionControllerMock(),
    shouldUseSmartTransaction: true,
    featureFlags: {
      mobileActive: true,
      mobileActiveIOS: true,
      mobileActiveAndroid: true,
      expectedDeadline: 45,
      maxDeadline: 150,
      mobileReturnTxHashAsap: false,
      batchStatusPollingInterval: 1000,
    },
    ...options,
  };

  return fn({
    controllerMessenger: rootMessenger,
    request,
    getFeesSpy,
    submitSignedTransactionsSpy,
    smartTransactionsController,
  });
}

jest.setTimeout(10 * 1000);

describe('submitSmartTransactionHook', () => {
  it('does not submit a transaction that is not a smart transaction', async () => {
    withRequest(async ({ request }) => {
      request.shouldUseSmartTransaction = false;
      const result = await submitSmartTransactionHook(request);
      expect(result).toEqual({ transactionHash: undefined });
    });
  });

  it('falls back to regular transaction submit if it is a legacy transaction', async () => {
    withRequest(async ({ request }) => {
      // Modify transaction to be a legacy transaction with explicit type
      request.transactionMeta.txParams = {
        ...request.transactionMeta.txParams,
        type: TransactionEnvelopeType.legacy,
        gasPrice: '0x77359400',
      };
      // Remove EIP-1559 specific fields if they exist
      delete request.transactionMeta.txParams.maxFeePerGas;
      delete request.transactionMeta.txParams.maxPriorityFeePerGas;

      const result = await submitSmartTransactionHook(request);
      expect(result).toEqual({ transactionHash: undefined });
    });
  });

  it('returns a txHash asap if the feature flag requires it', async () => {
    withRequest(async ({ request }) => {
      request.featureFlags.mobileReturnTxHashAsap = true;
      const result = await submitSmartTransactionHook(request);
      expect(result).toEqual({ transactionHash });
    });
  });

  it('throws an error if there is no uuid', async () => {
    withRequest(async ({ request, submitSignedTransactionsSpy }) => {
      submitSignedTransactionsSpy.mockResolvedValue({
        uuid: undefined,
      });
      await expect(submitSmartTransactionHook(request)).rejects.toThrow(
        'No smart transaction UUID',
      );
    });
  });

  it('throws an error if there is no transaction hash', async () => {
    withRequest(async ({ request, controllerMessenger }) => {
      setImmediate(() => {
        controllerMessenger.publish(
          'SmartTransactionsController:smartTransaction',
          {
            status: 'cancelled',
            statusMetadata: {
              minedHash: '',
            },
            uuid: 'uuid',
          } as SmartTransaction,
        );
      });
      await expect(submitSmartTransactionHook(request)).rejects.toThrow(
        'Smart Transaction does not have a transaction hash, there was a problem',
      );
    });
  });

  it('submits a smart transaction', async () => {
    withRequest(
      async ({ request, controllerMessenger, submitSignedTransactionsSpy }) => {
        setImmediate(() => {
          controllerMessenger.publish(
            'SmartTransactionsController:smartTransaction',
            {
              status: 'pending',
              statusMetadata: {
                minedHash: '',
              },
              uuid: 'uuid',
            } as SmartTransaction,
          );

          controllerMessenger.publish(
            'SmartTransactionsController:smartTransaction',
            {
              status: 'success',
              statusMetadata: {
                minedHash: transactionHash,
              },
              uuid: 'uuid',
            } as SmartTransaction,
          );
        });
        const result = await submitSmartTransactionHook(request);

        expect(result).toEqual({ transactionHash });
        const { txParams, chainId } = request.transactionMeta;
        expect(
          request.transactionController.approveTransactionsWithSameNonce,
        ).toHaveBeenCalledWith(
          [
            {
              ...txParams,
              maxFeePerGas: '0x2fd8a58d7',
              maxPriorityFeePerGas: '0xaa0f8a94',
              chainId,
              value: undefined,
            },
          ],
          { hasNonce: true },
        );
        expect(submitSignedTransactionsSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            signedTransactions: [createSignedTransaction()],
            signedCanceledTransactions: [],
            txParams,
            transactionMeta: request.transactionMeta,
          }),
        );
      },
    );
  });

  it('sets the status refresh interval if provided in feature flags', async () => {
    withRequest(async ({ request, smartTransactionsController }) => {
      const setStatusRefreshIntervalSpy = jest.spyOn(
        smartTransactionsController,
        'setStatusRefreshInterval',
      );

      request.featureFlags.batchStatusPollingInterval = 2000;

      await submitSmartTransactionHook(request);

      expect(setStatusRefreshIntervalSpy).toHaveBeenCalledWith(2000);
    });
  });

  it('does not set the status refresh interval if not provided in feature flags', async () => {
    withRequest(async ({ request, smartTransactionsController }) => {
      const setStatusRefreshIntervalSpy = jest.spyOn(
        smartTransactionsController,
        'setStatusRefreshInterval',
      );

      request.featureFlags.batchStatusPollingInterval = 0;

      await submitSmartTransactionHook(request);

      expect(setStatusRefreshIntervalSpy).not.toHaveBeenCalled();
    });
  });
});

describe('submitBatchSmartTransactionHook', () => {
  it('throws an error when smart transaction is not enabled', async () => {
    withRequest(
      {
        transactions: [
          { signedTx: createSignedTransaction(), id: '1', params: {} },
        ],
      },
      async ({ request }) => {
        request.shouldUseSmartTransaction = false;

        // The function should throw an error because smart transactions are disabled
        await expect(submitBatchSmartTransactionHook(request)).rejects.toThrow(
          'STX publishHook: Smart Transaction is required for batch submissions',
        );
      },
    );
  });

  it('throws an error when transactions is undefined', async () => {
    withRequest(
      {
        transactions: undefined,
      },
      async ({ request }) => {
        // The function should throw an error because transactions is required
        await expect(submitBatchSmartTransactionHook(request)).rejects.toThrow(
          'STX publishHook: A list of transactions are required for batch submissions',
        );
      },
    );
  });

  it('throws an error when transactions is an empty array', async () => {
    withRequest(
      {
        transactions: [],
      },
      async ({ request }) => {
        // The function should throw an error because transactions cannot be empty
        await expect(submitBatchSmartTransactionHook(request)).rejects.toThrow(
          'STX publishHook: A list of transactions are required for batch submissions',
        );
      },
    );
  });

  it('throws an error if there is no uuid', async () => {
    withRequest(
      {
        transactions: [
          { signedTx: createSignedTransaction(), id: '1', params: {} },
        ],
      },
      async ({ request, submitSignedTransactionsSpy }) => {
        submitSignedTransactionsSpy.mockResolvedValue({
          uuid: undefined,
        });
        await expect(submitBatchSmartTransactionHook(request)).rejects.toThrow(
          'No smart transaction UUID',
        );
      },
    );
  });

  it('throws an error if there is no transaction hash', async () => {
    withRequest(
      {
        transactions: [
          { signedTx: createSignedTransaction(), id: '1', params: {} },
        ],
      },
      async ({ request, controllerMessenger }) => {
        setImmediate(() => {
          controllerMessenger.publish(
            'SmartTransactionsController:smartTransaction',
            {
              status: 'cancelled',
              statusMetadata: {
                minedHash: '',
              },
              uuid: 'uuid',
            } as SmartTransaction,
          );
        });
        await expect(submitBatchSmartTransactionHook(request)).rejects.toThrow(
          'Smart Transaction does not have a transaction hash, there was a problem',
        );
      },
    );
  });

  it('submits a batch of smart transactions', async () => {
    const mockSignedTx = createSignedTransaction();
    withRequest(
      {
        transactions: [
          { signedTx: mockSignedTx, id: '1', params: {} },
          { signedTx: mockSignedTx, id: '2', params: {} },
        ],
      },
      async ({ request, controllerMessenger, submitSignedTransactionsSpy }) => {
        submitSignedTransactionsSpy.mockResolvedValue({
          uuid: stxUuid,
          txHash: transactionHash,
          txHashes: [transactionHash, transactionHash],
        });

        setImmediate(() => {
          controllerMessenger.publish(
            'SmartTransactionsController:smartTransaction',
            {
              status: 'pending',
              statusMetadata: {
                minedHash: '',
              },
              uuid: 'uuid',
            } as SmartTransaction,
          );

          controllerMessenger.publish(
            'SmartTransactionsController:smartTransaction',
            {
              status: 'success',
              statusMetadata: {
                minedHash: transactionHash,
              },
              uuid: 'uuid',
            } as SmartTransaction,
          );
        });

        const result = await submitBatchSmartTransactionHook(request);

        expect(result).toEqual({
          results: [{ transactionHash }, { transactionHash }],
        });

        expect(submitSignedTransactionsSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            signedTransactions: [mockSignedTx, mockSignedTx],
            signedCanceledTransactions: [],
            transactionMeta: request.transactionMeta,
          }),
        );
      },
    );
  });

  it('sets the status refresh interval if provided in feature flags', async () => {
    const mockSignedTx = createSignedTransaction();
    withRequest(
      {
        transactions: [
          { signedTx: mockSignedTx, id: '1', params: {} },
          { signedTx: mockSignedTx, id: '2', params: {} },
        ],
      },
      async ({ request, smartTransactionsController }) => {
        const setStatusRefreshIntervalSpy = jest.spyOn(
          smartTransactionsController,
          'setStatusRefreshInterval',
        );

        request.featureFlags.batchStatusPollingInterval = 2000;

        await submitBatchSmartTransactionHook(request);

        expect(setStatusRefreshIntervalSpy).toHaveBeenCalledWith(2000);
      },
    );
  });

  it('handles empty batch results when no txHashes are returned', async () => {
    const mockSignedTx = createSignedTransaction();
    withRequest(
      {
        transactions: [{ signedTx: mockSignedTx, id: '1', params: {} }],
      },
      async ({ request, controllerMessenger, submitSignedTransactionsSpy }) => {
        submitSignedTransactionsSpy.mockResolvedValue({
          uuid: stxUuid,
          txHash: transactionHash,
          // No txHashes property
        });

        setImmediate(() => {
          controllerMessenger.publish(
            'SmartTransactionsController:smartTransaction',
            {
              status: 'success',
              statusMetadata: {
                minedHash: transactionHash,
              },
              uuid: 'uuid',
            } as SmartTransaction,
          );
        });

        const result = await submitBatchSmartTransactionHook(request);

        expect(result).toEqual({
          results: [],
        });
      },
    );
  });
});
