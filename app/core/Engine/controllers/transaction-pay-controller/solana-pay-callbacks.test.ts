import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { FeeType, SolScope } from '@metamask/keyring-api';
import type {
  GetSolanaPayPreflightRequest,
  SolanaPaySignAndSendTransactionRequest,
} from '@metamask/transaction-pay-controller';

import Engine from '../../Engine';
import { handleSnapRequest } from '../../../Snaps/utils';
import { getAmountData } from './amount-data-callback';
import {
  getPreparationId,
  getSolanaPayFollowUpStatus,
  getSolanaPayPreflight,
  getSolanaPayTransactionStatus,
  signAndSendSolanaPayTransaction,
  submitSolanaPayFollowUp,
} from './solana-pay-callbacks';

jest.mock('../../../Snaps/utils');
jest.mock('./amount-data-callback');
jest.mock('../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountsController: {
        state: { internalAccounts: { accounts: {} } },
      },
      ConfigRegistryController: {
        getNetworkConfigByCaip2ChainId: jest.fn(),
      },
      NetworkController: {
        getNetworkClientById: jest.fn(),
      },
      TransactionController: {
        addTransactionBatch: jest.fn(),
        state: { transactions: [] },
      },
    },
    controllerMessenger: {},
  },
}));

const ACCOUNT_ID = 'solana-account-id';
const ACCOUNT_ADDRESS = '7Ec4QeG8wF3RnTjHDrTuYP8hVV7WYuPFyM4hZUodkG6Z';
const SOURCE_ACCOUNT = `${SolScope.Mainnet}:${ACCOUNT_ADDRESS}` as const;
const NATIVE_ASSET = `${SolScope.Mainnet}/slip44:501` as const;

const account = {
  address: ACCOUNT_ADDRESS,
  id: ACCOUNT_ID,
  metadata: { snap: { id: 'npm:@metamask/solana-wallet-snap' } },
};

const preflightRequest: GetSolanaPayPreflightRequest = {
  accountId: ACCOUNT_ID,
  caipAccountId: SOURCE_ACCOUNT,
  requestId: 'relay-request-id',
  scope: SolScope.Mainnet,
  sourceAmountRaw: '100',
  sourceAssetId: NATIVE_ASSET,
  transaction: {
    chainId: 792703809,
    instructions: [
      {
        data: '',
        keys: [],
        programId: SystemProgram.programId.toBase58(),
      },
    ],
  },
};

const preparedTransaction = 'prepared-base64';
const submissionRequest: SolanaPaySignAndSendTransactionRequest = {
  accountId: ACCOUNT_ID,
  caipAccountId: SOURCE_ACCOUNT,
  preparedTransaction,
  preparationId: getPreparationId({
    accountId: ACCOUNT_ID,
    preparedTransaction,
    requestId: 'relay-request-id',
    scope: SolScope.Mainnet,
  }),
  requestId: 'relay-request-id',
  scope: SolScope.Mainnet,
};

describe('Solana Pay callbacks', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .spyOn(
        Engine.context.ConfigRegistryController,
        'getNetworkConfigByCaip2ChainId',
      )
      .mockReturnValue({
        rpcProviders: { default: { url: 'https://solana.example' } },
      } as never);
    Engine.context.AccountsController.state.internalAccounts.accounts = {
      [ACCOUNT_ID]: account,
    } as never;
    jest.mocked(getAmountData).mockResolvedValue({
      updates: [{ nestedTransactionIndex: 0, data: '0x5678' }],
    });
    jest
      .mocked(Engine.context.NetworkController.getNetworkClientById)
      .mockReturnValue({
        provider: {
          request: jest.fn().mockResolvedValue({
            logs: [
              {
                address: '0x1111111111111111111111111111111111111111',
                data: '0x64',
                topics: [
                  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                  '0x0',
                  '0x000000000000000000000000abcdefabcdefabcdefabcdefabcdefabcdefabcd',
                ],
              },
            ],
          }),
        },
      } as never);
  });

  it('prepares Relay instructions and returns finalized native observations', async () => {
    jest.spyOn(Connection.prototype, 'getLatestBlockhash').mockResolvedValue({
      blockhash: PublicKey.default.toBase58(),
      lastValidBlockHeight: 1,
    });
    jest.mocked(handleSnapRequest).mockResolvedValue([
      { type: FeeType.Base, asset: { amount: '0.000005' } },
      { type: FeeType.Priority, asset: { amount: '0.0000001' } },
    ]);
    jest.spyOn(Connection.prototype, 'getBalance').mockResolvedValue(1_000_000);
    jest
      .spyOn(Connection.prototype, 'getMinimumBalanceForRentExemption')
      .mockResolvedValue(890_880);
    const result = await getSolanaPayPreflight(preflightRequest);

    expect(result).toEqual({
      nativeBalanceRaw: '1000000',
      networkFeeRaw: '5000',
      preparedTransaction: expect.any(String),
      preparationId: expect.any(String),
      priorityFeeRaw: '100',
      rentDebitRaw: '0',
      rentExemptionRequirementRaw: '890880',
      sourceBalanceRaw: '1000000',
    });
  });

  it('submits the exact prepared transaction through the owning Snap', async () => {
    jest.mocked(handleSnapRequest).mockResolvedValue({
      transactionId: 'solana-signature',
    });

    const result = await signAndSendSolanaPayTransaction(submissionRequest);

    expect(result).toEqual({
      outcome: 'submitted',
      transactionId: 'solana-signature',
    });
    expect(handleSnapRequest).toHaveBeenCalledTimes(1);
    expect(handleSnapRequest).toHaveBeenCalledWith(
      Engine.controllerMessenger,
      expect.objectContaining({
        request: expect.objectContaining({
          method: 'signAndSendTransaction',
          params: {
            accountId: ACCOUNT_ID,
            options: { commitment: 'confirmed', skipPreflight: false },
            scope: SolScope.Mainnet,
            transaction: 'prepared-base64',
          },
        }),
      }),
    );
  });

  it('rejects a prepared transaction whose binding changed', async () => {
    const result = await signAndSendSolanaPayTransaction({
      ...submissionRequest,
      preparationId: 'different-preparation',
    });

    expect(result).toEqual({
      outcome: 'not-submitted',
      errorCode: 'construction_failed',
    });
    expect(handleSnapRequest).not.toHaveBeenCalled();
  });

  it('maps Snap user rejection without retrying submission', async () => {
    jest
      .mocked(handleSnapRequest)
      .mockRejectedValue(
        Object.assign(new Error('User rejected'), { code: 4001 }),
      );

    const result = await signAndSendSolanaPayTransaction(submissionRequest);

    expect(result).toEqual({ outcome: 'user-rejected' });
    expect(handleSnapRequest).toHaveBeenCalledTimes(1);
  });

  it('maps an uncertain Snap failure to ambiguous', async () => {
    jest
      .mocked(handleSnapRequest)
      .mockRejectedValue(new Error('Connection closed'));

    const result = await signAndSendSolanaPayTransaction(submissionRequest);

    expect(result).toEqual({ outcome: 'ambiguous' });
    expect(handleSnapRequest).toHaveBeenCalledTimes(1);
  });

  it('maps a rejected Snap request to a stable construction code', async () => {
    jest
      .mocked(handleSnapRequest)
      .mockRejectedValue(
        Object.assign(new Error('Invalid params'), { code: -32602 }),
      );

    const result = await signAndSendSolanaPayTransaction(submissionRequest);

    expect(result).toEqual({
      outcome: 'not-submitted',
      errorCode: 'construction_failed',
    });
  });

  it('omits raw response details when the Snap returns no transaction ID', async () => {
    jest.mocked(handleSnapRequest).mockResolvedValue({ unexpected: 'value' });

    const result = await signAndSendSolanaPayTransaction(submissionRequest);

    expect(result).toEqual({ outcome: 'ambiguous' });
  });

  it('submits the sponsored Money Account follow-up as a separate batch', async () => {
    jest
      .mocked(Engine.context.TransactionController.addTransactionBatch)
      .mockResolvedValue({ batchId: '0xfollowup' });

    const result = await submitSolanaPayFollowUp({
      relayTransactionId: '0xrelay',
      requestId: 'relay-request-id',
      transaction: {
        id: 'parent-id',
        nestedTransactions: [
          {
            data: '0x1234',
            to: '0x1234567890123456789012345678901234567890',
          },
        ],
        networkClientId: 'network-client-id',
        requiredAssets: [
          { address: '0x1111111111111111111111111111111111111111' },
        ],
        txParams: {
          from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        },
      },
    } as never);

    expect(result).toEqual({
      outcome: 'submitted',
      transactionId: '0xfollowup',
    });
    expect(
      Engine.context.TransactionController.addTransactionBatch,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        transactions: [
          expect.objectContaining({
            params: expect.objectContaining({ data: '0x5678' }),
          }),
        ],
      }),
    );
  });

  it('observes a confirmed sponsored follow-up batch', async () => {
    Engine.context.TransactionController.state.transactions = [
      { batchId: '0xfollowup', status: 'confirmed' },
    ] as never;

    const result = await getSolanaPayFollowUpStatus({
      transaction: {},
      transactionId: '0xfollowup',
    } as never);

    expect(result).toBe('confirmed');
  });

  it('observes a confirmed source signature without submitting', async () => {
    jest.spyOn(Connection.prototype, 'getSignatureStatuses').mockResolvedValue({
      context: { slot: 1 },
      value: [
        {
          confirmationStatus: 'confirmed',
          confirmations: 1,
          err: null,
          slot: 1,
        },
      ],
    });

    const result = await getSolanaPayTransactionStatus({
      accountId: ACCOUNT_ID,
      caipAccountId: SOURCE_ACCOUNT,
      scope: SolScope.Mainnet,
      transactionId: 'solana-signature',
    });

    expect(result).toBe('confirmed');
    expect(handleSnapRequest).not.toHaveBeenCalled();
  });
});
