import {
  AtomicCapabilityStatus,
  getAccounts,
  getCallsStatus,
  getCapabilities,
  processSendCalls,
} from './eip5792';
import Engine from '../Engine';
import {
  GetCallsStatusCode,
  SendCalls,
} from '@metamask/eth-json-rpc-middleware';
import { JsonRpcRequest } from '@metamask/utils';
import {
  TransactionControllerState,
  TransactionStatus,
} from '@metamask/transaction-controller';

const MOCK_ACCOUNT = '0x1234';

jest.mock('../Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: () => ({ address: MOCK_ACCOUNT }),
    },
    KeyringController: {
      state: {
        isUnlocked: true,
      },
    },
    PermissionController: {
      getCaveat: () => ({
        type: 'authorizedScopes',
        value: {
          requiredScopes: {},
          optionalScopes: {
            'eip155:1': {
              accounts: ['eip155:1:0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'],
            },
          },
          isMultichainOrigin: false,
        },
      }),
    },
    TransactionController: {
      addTransactionBatch: jest.fn().mockResolvedValue({ batchId: 123 }),
      isAtomicBatchSupported: jest.fn().mockResolvedValue([true]),
    },
    PreferencesController: {
      state: {
        dismissSmartAccountSuggestionEnabled: false,
      },
    },
  },
  controllerMessenger: {
    call: jest.fn().mockImplementation((type) => {
      if (type === 'NetworkController:getNetworkClientById')
        return { configuration: { chainId: '0xaa36a7' } };
      if (type === 'AccountsController:getState')
        return {
          internalAccounts: {
            accounts: [
              {
                address: '0x935e73edb9ff52e23bac7f7ty67u1ecd06d05477',
                metadata: { keyring: { type: 'HD Key Tree' } },
              },
            ],
          },
        };
    }),
  },
}));

const MockEngine = jest.mocked(Engine);

describe('getAccounts', () => {
  it('return selected account address', async () => {
    const accounts = await getAccounts();
    expect(accounts).toStrictEqual([MOCK_ACCOUNT]);
  });

  it('return empty array if origin is metamask and AccountsController returns no selected account', async () => {
    MockEngine.context.AccountsController.getSelectedAccount = (() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined) as any;
    const accounts = await getAccounts();
    expect(accounts).toStrictEqual([]);
  });
});

describe('processSendCalls', () => {
  const MOCK_PARAMS = {
    version: '2.0.0',
    from: '0x935e73edb9ff52e23bac7f7ty67u1ecd06d05477',
    chainId: '0xaa36a7',
    atomicRequired: true,
    calls: [
      {
        to: '0x0c54FcCd2e384b4BB6f2E405Bf5Cbc15a017AaFb',
        data: '0x654365436543',
        value: '0x3B9ACA00',
      },
    ],
  } as SendCalls;
  const MOCK_REQUEST = {
    method: 'wallet_sendCalls',
    params: MOCK_PARAMS,
    jsonrpc: '2.0',
    id: 1315126919,
    toNative: true,
    origin: 'metamask.github.io',
    networkClientId: 'sepolia',
  } as JsonRpcRequest;

  it('creates transaction instance for batch request', async () => {
    const result = await processSendCalls(MOCK_PARAMS, MOCK_REQUEST);
    expect(
      Engine.context.TransactionController.addTransactionBatch,
    ).toHaveBeenCalledTimes(1);
    expect(result.id).toStrictEqual(123);
  });

  it('throw error if wrong version of request is used', async () => {
    expect(async () => {
      await processSendCalls(
        { ...MOCK_PARAMS, version: '3.0.0' },
        MOCK_REQUEST,
      );
    }).rejects.toThrow('Version not supported: Got 3.0.0, expected 2.0.0');
  });

  it('throw error if TransactionController.isAtomicBatchSupported returns false', async () => {
    Engine.context.TransactionController.isAtomicBatchSupported = jest
      .fn()
      .mockResolvedValue([false]);
    expect(async () => {
      await processSendCalls(MOCK_PARAMS, MOCK_REQUEST);
    }).rejects.toThrow('EIP-7702 not supported on chain: 0xaa36a7');
    Engine.context.TransactionController.isAtomicBatchSupported = jest
      .fn()
      .mockResolvedValue([true]);
  });

  it('throws if top-level capability is required', async () => {
    await expect(
      processSendCalls(
        {
          ...MOCK_PARAMS,
          capabilities: {
            test: {},
            test2: { optional: true },
            test3: { optional: false },
          },
        },
        MOCK_REQUEST,
      ),
    ).rejects.toThrow('Unsupported non-optional capabilities: test, test3');
  });

  it('throws if call capability is required', async () => {
    await expect(
      processSendCalls(
        {
          ...MOCK_PARAMS,
          calls: [
            ...MOCK_PARAMS.calls,
            {
              ...MOCK_PARAMS.calls[0],
              capabilities: {
                test: {},
                test2: { optional: true },
                test3: { optional: false },
              },
            },
          ],
        },
        MOCK_REQUEST,
      ),
    ).rejects.toThrow('Unsupported non-optional capabilities: test, test3');
  });

  it('throw error if dappChainId is different from request chainId', async () => {
    Engine.controllerMessenger.call = jest.fn().mockImplementation((type) => {
      if (type === 'NetworkController:getNetworkClientById')
        return { configuration: { chainId: '0x1' } };
      if (type === 'AccountsController:getState')
        return {
          internalAccounts: {
            accounts: [
              {
                address: '0x935e73edb9ff52e23bac7f7ty67u1ecd06d05477',
                metadata: { keyring: { type: 'HD Key Tree' } },
              },
            ],
          },
        };
    });
    expect(async () => {
      await processSendCalls(MOCK_PARAMS, {
        ...MOCK_REQUEST,
        networkClientId: 'linea',
      } as JsonRpcRequest);
    }).rejects.toThrow(
      'Chain ID must match the dApp selected network: Got 0xaa36a7, expected 0x1',
    );
  });

  it('throw error if keyring type of account is not supported', async () => {
    Engine.controllerMessenger.call = jest.fn().mockImplementation((type) => {
      if (type === 'NetworkController:getNetworkClientById')
        return { configuration: { chainId: '0xaa36a7' } };
      if (type === 'AccountsController:getState')
        return {
          internalAccounts: {
            accounts: [
              {
                address: '0x935e73edb9ff52e23bac7f7ty67u1ecd06d05477',
                metadata: { keyring: { type: 'un-supported' } },
              },
            ],
          },
        };
    });
    expect(async () => {
      await processSendCalls(MOCK_PARAMS, {
        ...MOCK_REQUEST,
        networkClientId: 'linea',
      } as JsonRpcRequest);
    }).rejects.toThrow('EIP-7702 upgrade not supported on account');
  });

  it('throw error if user has enabled preference dismissSmartAccountSuggestionEnabled', async () => {
    Engine.context.PreferencesController.state.dismissSmartAccountSuggestionEnabled =
      true;
    expect(async () => {
      await processSendCalls(MOCK_PARAMS, {
        ...MOCK_REQUEST,
        networkClientId: 'linea',
      } as JsonRpcRequest);
    }).rejects.toThrow('EIP-7702 upgrade disabled by the user');
  });

  describe('getCallsStatus', () => {
    const BATCH_ID_MOCK = '0xf3472db2a4134607a17213b7e9ca26e3';
    const CHAIN_ID_MOCK = '0x123';
    const TRANSACTION_META_MOCK = {
      batchId: BATCH_ID_MOCK,
      chainId: CHAIN_ID_MOCK,
      status: TransactionStatus.confirmed,
      txReceipt: {
        blockHash: '0xabcd',
        blockNumber: '0x1234',
        gasUsed: '0x4321',
        logs: [
          {
            address: '0xa123',
            data: '0xb123',
            topics: ['0xc123'],
          },
          {
            address: '0xd123',
            data: '0xe123',
            topics: ['0xf123'],
          },
        ],
        status: '0x1',
        transactionHash: '0xcba',
      },
    };

    it('returns result using metadata from transaction controller', async () => {
      Engine.controllerMessenger.call = jest.fn().mockReturnValue({
        transactions: [TRANSACTION_META_MOCK],
      });

      expect(await getCallsStatus(BATCH_ID_MOCK)).toStrictEqual({
        version: '2.0.0',
        id: BATCH_ID_MOCK,
        chainId: CHAIN_ID_MOCK,
        atomic: true,
        status: GetCallsStatusCode.CONFIRMED,
        receipts: [
          {
            blockNumber: TRANSACTION_META_MOCK.txReceipt.blockNumber,
            blockHash: TRANSACTION_META_MOCK.txReceipt.blockHash,
            gasUsed: TRANSACTION_META_MOCK.txReceipt.gasUsed,
            logs: TRANSACTION_META_MOCK.txReceipt.logs,
            status: TRANSACTION_META_MOCK.txReceipt.status,
            transactionHash: TRANSACTION_META_MOCK.txReceipt.transactionHash,
          },
        ],
      });
    });

    it('ignores additional properties in receipt', async () => {
      Engine.controllerMessenger.call = jest.fn().mockReturnValue({
        transactions: [
          {
            ...TRANSACTION_META_MOCK,
            txReceipt: {
              ...TRANSACTION_META_MOCK.txReceipt,
              extra: 'data',
            },
          },
        ],
      } as unknown as TransactionControllerState);

      const receiptResult = (await getCallsStatus(BATCH_ID_MOCK))
        ?.receipts?.[0];

      expect(receiptResult).not.toHaveProperty('extra');
    });

    it('ignores additional properties in log', async () => {
      Engine.controllerMessenger.call = jest.fn().mockReturnValue({
        transactions: [
          {
            ...TRANSACTION_META_MOCK,
            txReceipt: {
              ...TRANSACTION_META_MOCK.txReceipt,
              logs: [
                {
                  ...TRANSACTION_META_MOCK.txReceipt.logs[0],
                  extra: 'data',
                },
              ],
            },
          },
        ],
      } as unknown as TransactionControllerState);

      const receiptLog = (await getCallsStatus(BATCH_ID_MOCK))?.receipts?.[0]
        ?.logs?.[0];

      expect(receiptLog).not.toHaveProperty('extra');
    });

    it('returns failed status if transaction status is failed and no hash', async () => {
      Engine.controllerMessenger.call = jest.fn().mockReturnValue({
        transactions: [
          {
            ...TRANSACTION_META_MOCK,
            status: TransactionStatus.failed,
            hash: undefined,
          },
        ],
      } as unknown as TransactionControllerState);

      expect((await getCallsStatus(BATCH_ID_MOCK))?.status).toStrictEqual(
        GetCallsStatusCode.FAILED_OFFCHAIN,
      );
    });

    it('returns reverted status if transaction status is failed and hash', async () => {
      Engine.controllerMessenger.call = jest.fn().mockReturnValue({
        transactions: [
          {
            ...TRANSACTION_META_MOCK,
            status: TransactionStatus.failed,
            hash: '0x123',
          },
        ],
      } as unknown as TransactionControllerState);

      expect((await getCallsStatus(BATCH_ID_MOCK))?.status).toStrictEqual(
        GetCallsStatusCode.REVERTED,
      );
    });

    it('returns reverted status if transaction status is dropped', async () => {
      Engine.controllerMessenger.call = jest.fn().mockReturnValue({
        transactions: [
          {
            ...TRANSACTION_META_MOCK,
            status: TransactionStatus.dropped,
          },
        ],
      } as unknown as TransactionControllerState);

      expect((await getCallsStatus(BATCH_ID_MOCK))?.status).toStrictEqual(
        GetCallsStatusCode.REVERTED,
      );
    });

    it.each([
      TransactionStatus.approved,
      TransactionStatus.signed,
      TransactionStatus.submitted,
      TransactionStatus.unapproved,
    ])(
      'returns pending status if transaction status is %s',
      async (status: TransactionStatus) => {
        Engine.controllerMessenger.call = jest.fn().mockReturnValue({
          transactions: [
            {
              ...TRANSACTION_META_MOCK,
              status,
            },
          ],
        } as unknown as TransactionControllerState);

        expect((await getCallsStatus(BATCH_ID_MOCK))?.status).toStrictEqual(
          GetCallsStatusCode.PENDING,
        );
      },
    );

    it('throws if no transactions found', () => {
      Engine.controllerMessenger.call = jest.fn().mockReturnValue({
        transactions: [],
      } as unknown as TransactionControllerState);

      expect(async () => {
        await getCallsStatus(BATCH_ID_MOCK);
      }).rejects.toThrow(`No matching bundle found`);
    });
  });

  describe('getCapabilities', () => {
    const CHAIN_ID_MOCK = '0x123';
    const FROM_MOCK = '0xabc123';
    const DELEGATION_ADDRESS_MOCK =
      '0x1234567890abcdef1234567890abcdef12345678';

    beforeEach(() => {
      Engine.controllerMessenger.call = jest.fn().mockImplementation((type) => {
        if (type === 'NetworkController:getNetworkClientById')
          return { configuration: { chainId: CHAIN_ID_MOCK } };
        if (type === 'AccountsController:getState')
          return {
            internalAccounts: {
              accounts: [
                {
                  address: FROM_MOCK,
                  metadata: { keyring: { type: 'HD Key Tree' } },
                },
              ],
            },
          };
      });
    });

    it('includes atomic capability if already upgraded', async () => {
      Engine.context.TransactionController.isAtomicBatchSupported = jest
        .fn()
        .mockResolvedValueOnce([
          {
            chainId: CHAIN_ID_MOCK,
            delegationAddress: DELEGATION_ADDRESS_MOCK,
            isSupported: true,
          },
        ]);

      const capabilities = await getCapabilities(FROM_MOCK, [CHAIN_ID_MOCK]);

      expect(capabilities).toStrictEqual({
        [CHAIN_ID_MOCK]: {
          atomic: {
            status: AtomicCapabilityStatus.Supported,
          },
        },
      });
    });

    it('includes atomic capability if not yet upgraded', async () => {
      Engine.context.TransactionController.isAtomicBatchSupported = jest
        .fn()
        .mockResolvedValueOnce([
          {
            chainId: CHAIN_ID_MOCK,
            delegationAddress: undefined,
            isSupported: false,
            upgradeContractAddress: DELEGATION_ADDRESS_MOCK,
          },
        ]);

      const capabilities = await getCapabilities(FROM_MOCK, [CHAIN_ID_MOCK]);

      expect(capabilities).toStrictEqual({
        [CHAIN_ID_MOCK]: {
          atomic: {
            status: AtomicCapabilityStatus.Ready,
          },
        },
      });
    });

    it('does not include atomic capability if chain not supported', async () => {
      Engine.context.TransactionController.isAtomicBatchSupported = jest
        .fn()
        .mockResolvedValueOnce([]);

      const capabilities = await getCapabilities(FROM_MOCK, [CHAIN_ID_MOCK]);

      expect(capabilities).toStrictEqual({});
    });

    it('does not include atomic capability if keyring type is not supported', async () => {
      Engine.controllerMessenger.call = jest.fn().mockImplementation((type) => {
        if (type === 'NetworkController:getNetworkClientById')
          return { configuration: { chainId: CHAIN_ID_MOCK } };
        if (type === 'AccountsController:getState')
          return {
            internalAccounts: {
              accounts: [
                {
                  address: FROM_MOCK,
                  metadata: { keyring: { type: 'un-supported' } },
                },
              ],
            },
          };
      });
      Engine.context.TransactionController.isAtomicBatchSupported = jest
        .fn()
        .mockResolvedValueOnce([]);

      const capabilities = await getCapabilities(FROM_MOCK, [CHAIN_ID_MOCK]);

      expect(capabilities).toStrictEqual({});
    });
  });
});
