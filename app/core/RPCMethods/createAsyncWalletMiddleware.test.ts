import {
  createAsyncWalletMiddleware,
  getAccounts,
} from './createAsyncWalletMiddleware';
import Engine from '../Engine';

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
