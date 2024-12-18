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
  WalletDevice,
} from '@metamask/transaction-controller';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import { type SmartTransaction, ClientId } from '@metamask/smart-transactions-controller/dist/types';

import {
  AllowedActions,
  AllowedEvents,
  SubmitSmartTransactionRequest,
  submitSmartTransactionHook,
} from './smart-publish-hook';
import { ChainId } from '@metamask/controller-utils';
import { ApprovalController } from '@metamask/approval-controller';
import { ControllerMessenger } from '@metamask/base-controller';
import {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';

interface PendingApprovalsData {
  id: string;
  origin: string;
  type: string;
  requestState: {
    isInSwapFlow: boolean;
    isSwapApproveTx: boolean;
  };
}

jest.mock('uuid', () => ({
  ...jest.requireActual('uuid'),
  v1: jest.fn(() => 'approvalId'),
}));

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

const createSignedTransaction = () =>
  '0xf86c098504a817c800825208943535353535353535353535353535353535353535880de0b6b3a76400008025a02b79f322a625d623a2bb2911e0c6b3e7eaf741a7c7c5d2e8c67ef3ff4acf146ca01ae168fea63dc3391b75b586c8a7c0cb55cdf3b8e2e4d8e097957a3a56c6f2c5';

const createTransactionControllerMock = () =>
  ({
    approveTransactionsWithSameNonce: jest.fn((transactions = []) =>
      transactions.length === 0 ? [] : [createSignedTransaction()],
    ),
    state: { transactions: [] },
    update: jest.fn(),
  } as unknown as jest.Mocked<TransactionController>);

const getDefaultAddAndShowApprovalRequest = () => jest.fn();
const createApprovalControllerMock = ({
  addAndShowApprovalRequest,
  pendingApprovals,
}: {
  addAndShowApprovalRequest: () => void;
  pendingApprovals: PendingApprovalsData[];
}) =>
  ({
    state: {
      pendingApprovals,
    },
    addAndShowApprovalRequest,
    updateRequestState: jest.fn(),
  } as unknown as jest.Mocked<ApprovalController>);

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

type WithRequestOptions = {
  addAndShowApprovalRequest?: jest.Mock;
  pendingApprovals?: PendingApprovalsData[];
} & Partial<SubmitSmartTransactionRequestMocked>;

type WithRequestCallback<ReturnValue> = ({
  request,
  controllerMessenger,
}: {
  request: SubmitSmartTransactionRequestMocked;
  controllerMessenger: SubmitSmartTransactionRequestMocked['controllerMessenger'];
  getFeesSpy: jest.SpyInstance;
  submitSignedTransactionsSpy: jest.SpyInstance;
}) => ReturnValue;

type WithRequestArgs<ReturnValue> =
  | [WithRequestCallback<ReturnValue>]
  | [WithRequestOptions, WithRequestCallback<ReturnValue>];

function withRequest<ReturnValue>(
  ...args: WithRequestArgs<ReturnValue>
): ReturnValue {
  const [{ ...rest }, fn] = args.length === 2 ? args : [{}, args[0]];
  const {
    addAndShowApprovalRequest = getDefaultAddAndShowApprovalRequest(),
    pendingApprovals = [],
    ...options
  } = rest;
  const controllerMessenger = new ControllerMessenger<
    NetworkControllerGetNetworkClientByIdAction | AllowedActions,
    NetworkControllerStateChangeEvent | AllowedEvents
  >();

  const smartTransactionsController = new SmartTransactionsController({
    messenger: controllerMessenger.getRestricted({
      name: 'SmartTransactionsController',
      allowedActions: ['NetworkController:getNetworkClientById'],
      allowedEvents: ['NetworkController:stateChange'],
    }),
    getNonceLock: jest.fn(),
    confirmExternalTransaction: jest.fn(),
    trackMetaMetricsEvent: jest.fn(),
    getTransactions: jest.fn(),
    getMetaMetricsProps: jest.fn(),
    getFeatureFlags: jest.fn(),
    updateTransaction: jest.fn(),
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
    controllerMessenger,
    transactionController: createTransactionControllerMock(),
    shouldUseSmartTransaction: true,
    approvalController: createApprovalControllerMock({
      addAndShowApprovalRequest,
      pendingApprovals,
    }),
    featureFlags: {
      extensionActive: true,
      mobileActive: true,
      mobileActiveIOS: true,
      mobileActiveAndroid: true,
      smartTransactions: {
        expectedDeadline: 45,
        maxDeadline: 150,
        mobileReturnTxHashAsap: false,
      },
      mobile_active: true,
      extension_active: true,
      fallback_to_v1: false,
      fallbackToV1: false,
    },
    ...options,
  };

  return fn({
    controllerMessenger,
    request,
    getFeesSpy,
    submitSignedTransactionsSpy,
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

  it('returns a txHash asap if the feature flag requires it', async () => {
    withRequest(async ({ request }) => {
      request.featureFlags.smartTransactions.mobileReturnTxHashAsap = true;
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
        'Transaction does not have a transaction hash, there was a problem',
      );
    });
  });

  it('throws an error if there is no origin', async () => {
    withRequest(async ({ request }) => {
      request.transactionMeta.origin = undefined;
      await expect(submitSmartTransactionHook(request)).rejects.toThrow(
        'Origin is required',
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
        expect(submitSignedTransactionsSpy).toHaveBeenCalledWith({
          signedTransactions: [createSignedTransaction()],
          signedCanceledTransactions: [],
          txParams,
          transactionMeta: request.transactionMeta,
        });

        expect(
          request.approvalController.addAndShowApprovalRequest,
        ).toHaveBeenCalledWith({
          id: 'approvalId',
          origin: 'http://localhost',
          type: 'smart_transaction_status',
          requestState: {
            smartTransaction: {
              status: 'pending',
              uuid: stxUuid,
              creationTime: expect.any(Number),
            },
            isDapp: true,
            isInSwapFlow: false,
            isSwapApproveTx: false,
            isSwapTransaction: false,
          },
        });
        expect(
          request.approvalController.updateRequestState,
        ).toHaveBeenCalledWith({
          id: 'approvalId',
          requestState: {
            smartTransaction: {
              status: 'success',
              statusMetadata: {
                minedHash:
                  '0x0302b75dfb9fd9eb34056af031efcaee2a8cbd799ea054a85966165cd82a7356',
              },
              uuid: 'uuid',
            },
            isDapp: true,
            isInSwapFlow: false,
            isSwapApproveTx: false,
            isSwapTransaction: false,
          },
        });
      },
    );
  });

  it('submits a smart transaction without the smart transaction status page', async () => {
    withRequest(
      async ({ request, controllerMessenger, submitSignedTransactionsSpy }) => {
        request.featureFlags.smartTransactions.mobileReturnTxHashAsap = true;
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
        expect(submitSignedTransactionsSpy).toHaveBeenCalledWith({
          signedTransactions: [createSignedTransaction()],
          signedCanceledTransactions: [],
          txParams,
          transactionMeta: request.transactionMeta,
        });

        expect(
          request.approvalController.addAndShowApprovalRequest,
        ).not.toHaveBeenCalled();
        expect(
          request.approvalController.updateRequestState,
        ).not.toHaveBeenCalled();
      },
    );
  });

  describe('MM Swaps', () => {
    it('starts an approval and does not end it if there is an swap tx that requires allowance', async () => {
      withRequest(
        {
          transactionMeta: {
            ...defaultTransactionMeta,
            // An ERC20 approve transaction
            ...{
              id: 'ec514870-fcee-11ee-8b89-2f9930c68b06',
              networkID: undefined,
              chainId: '0x1',
              origin: 'EXAMPLE_FOX_CODE',
              status: TransactionStatus.signed,
              time: 1713381359223,
              txParams: {
                from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
                data: '0x095ea7b3000000000000000000000000881d40237659c251811cec9c364ef91dc08d300c0000000000000000000000000000000000000000000000000000000000989680',
                gas: '0xdd87',
                nonce: '0x217',
                to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                value: '0x0',
                maxFeePerGas: '0x62f500a7a',
                maxPriorityFeePerGas: '0x2d54010',
                estimatedBaseFee: '0x3a1b1a43e',
              },
              deviceConfirmedOn: WalletDevice.MM_MOBILE,
              verifiedOnBlockchain: false,
              securityAlertResponse: undefined,
              gasFeeEstimatesLoaded: true,
            },
          },
        },
        async ({
          request,
          controllerMessenger,
          submitSignedTransactionsSpy,
        }) => {
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
                value: '0x0',
              },
            ],
            { hasNonce: true },
          );
          expect(submitSignedTransactionsSpy).toHaveBeenCalledWith({
            signedTransactions: [createSignedTransaction()],
            signedCanceledTransactions: [],
            txParams,
            transactionMeta: request.transactionMeta,
          });

          expect(
            request.approvalController.addAndShowApprovalRequest,
          ).toHaveBeenCalledWith({
            id: 'approvalId',
            origin: 'EXAMPLE_FOX_CODE',
            type: 'smart_transaction_status',
            requestState: {
              smartTransaction: {
                status: 'pending',
                uuid: stxUuid,
                creationTime: expect.any(Number),
              },
              isDapp: false,
              isInSwapFlow: true,
              isSwapApproveTx: true,
              isSwapTransaction: false,
            },
          });
          expect(
            request.approvalController.updateRequestState,
          ).not.toHaveBeenCalled();
        },
      );
    });
    it('does not start an approval if a swap tx is after a swap allowance tx and ends the allowance', async () => {
      withRequest(
        {
          pendingApprovals: [
            {
              id: 'approvalId',
              origin: 'EXAMPLE_FOX_CODE',
              type: 'smart_transaction_status',
              requestState: {
                isInSwapFlow: true,
                isSwapApproveTx: true,
              },
            },
          ],
          transactionMeta: {
            ...defaultTransactionMeta,
            // An ERC20 swap from transaction
            ...{
              chainId: '0x1',
              deviceConfirmedOn: WalletDevice.MM_MOBILE,
              gasFeeEstimatesLoaded: true,
              id: '01c48130-fcf0-11ee-8f32-2f9930c68b06',
              networkID: undefined,
              origin: 'EXAMPLE_FOX_CODE',
              rawTransaction:
                '0x02f903560182021a840339802785063b5f780783038e2494881d40237659c251811cec9c364ef91dc08d300c80b902e65f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000a7d8c000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563546656544796e616d6963000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a7d8c0000000000000000000000000000000000000000000000000000c8e72d12c36ac000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000001cf42ad63350000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000c80502b1c5000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000a7d8c0000000000000000000000000000000000000000000000000000caad2bdb673320000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000140000000000000003b6d0340b4e16d0168e52d35cacd2c6185b44281ec28c9dc7dcbea7c000000000000000000000000000000000000000000000000001bc001a0c05c821f53b6750d9482d166d4860926fb215f63b5111e91abdb00c1ed8ad25da0455d063383fa7781e20457da191b2f0dd31b28eca0fe3604304ce4331fd737c7',
              securityAlertResponse: undefined,
              status: TransactionStatus.signed,
              time: 1713381824707,
              txParams: {
                data: '0x5f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000a7d8c000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563546656544796e616d6963000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a7d8c0000000000000000000000000000000000000000000000000000c8e72d12c36ac000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000001cf42ad63350000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000c80502b1c5000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000a7d8c0000000000000000000000000000000000000000000000000000caad2bdb673320000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000140000000000000003b6d0340b4e16d0168e52d35cacd2c6185b44281ec28c9dc7dcbea7c000000000000000000000000000000000000000000000000001b',
                estimatedBaseFee: '0x3a88ece0b',
                from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
                gas: '0x38e24',
                maxFeePerGas: '0x63b5f7807',
                maxPriorityFeePerGas: '0x3398027',
                nonce: '0x21a',
                to: '0x881d40237659c251811cec9c364ef91dc08d300c',
                value: '0x0',
              },
              verifiedOnBlockchain: false,
            },
          },
        },
        async ({
          request,
          controllerMessenger,
          submitSignedTransactionsSpy,
        }) => {
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
                value: '0x0',
              },
            ],
            { hasNonce: true },
          );
          expect(submitSignedTransactionsSpy).toHaveBeenCalledWith({
            signedTransactions: [createSignedTransaction()],
            signedCanceledTransactions: [],
            txParams,
            transactionMeta: request.transactionMeta,
          });

          expect(
            request.approvalController.addAndShowApprovalRequest,
          ).not.toHaveBeenCalled();
          expect(
            request.approvalController.updateRequestState,
          ).toHaveBeenCalledWith({
            id: 'approvalId',
            requestState: {
              smartTransaction: {
                status: 'success',
                statusMetadata: {
                  minedHash:
                    '0x0302b75dfb9fd9eb34056af031efcaee2a8cbd799ea054a85966165cd82a7356',
                },
                uuid: 'uuid',
              },
              isDapp: false,
              isInSwapFlow: true,
              isSwapApproveTx: false,
              isSwapTransaction: true,
            },
          });
        },
      );
    });
  });
});
