import {
  createAsyncWalletMiddleware,
  getAccounts,
  processSendCalls,
} from './createAsyncWalletMiddleware';
import Engine from '../Engine';
import { SendCalls } from '@metamask/eth-json-rpc-middleware';
import { JsonRpcRequest } from '@metamask/utils';

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
    },
  },
}));

const MockEngine = jest.mocked(Engine);

describe('createAsyncWalletMiddleware', () => {
  it('return instance of Wallet Middleware', async () => {
    const middleware = createAsyncWalletMiddleware();
    expect(middleware).toBeDefined();
  });
});

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

  it('return selected account address', async () => {
    const result = await processSendCalls(MOCK_PARAMS, MOCK_REQUEST);
    expect(
      Engine.context.TransactionController.addTransactionBatch,
    ).toHaveBeenCalledTimes(1);
    expect(result.id).toStrictEqual(123);
  });
});
