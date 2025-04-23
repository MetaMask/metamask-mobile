import { ORIGIN_METAMASK } from '@metamask/controller-utils';

import {
  createAsyncWalletMiddleware,
  getAccounts,
} from './createAsyncWalletMiddleware';
import Engine from '../Engine';
import { PermissionDoesNotExistError } from '@metamask/permission-controller';

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
  it('return selected account address if origin is metamask', async () => {
    const accounts = await getAccounts({ origin: ORIGIN_METAMASK });
    expect(accounts).toStrictEqual([MOCK_ACCOUNT]);
  });

  it('return empty array if origin is metamask and AccountsController returns no selected account', async () => {
    MockEngine.context.AccountsController.getSelectedAccount = (() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined) as any;
    const accounts = await getAccounts({ origin: ORIGIN_METAMASK });
    expect(accounts).toStrictEqual([]);
  });

  it('return account with permission if origin is not metamask and keyring controller is unlocked', async () => {
    const accounts = await getAccounts({ origin: 'https://test.dapp' });
    expect(accounts).toStrictEqual([
      '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
    ]);
  });

  it('return empty array if permission controller does not return caveat', async () => {
    MockEngine.context.PermissionController.getCaveat = (() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined) as any;
    const accounts = await getAccounts({ origin: 'https://test.dapp' });
    expect(accounts).toStrictEqual([]);
  });

  it('return empty array if permission controller getCaveat throws an instance of PermissionDoesNotExistError', async () => {
    MockEngine.context.PermissionController.getCaveat = (() => {
      throw new PermissionDoesNotExistError(
        'https://test.dapp',
        'dummy_target',
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    const accounts = await getAccounts({ origin: 'https://test.dapp' });
    expect(accounts).toStrictEqual([]);
  });

  it('return empty array if origin is not metamask and keyring controller state isUnlocked is false', async () => {
    MockEngine.context.KeyringController.state.isUnlocked = false;
    const accounts = await getAccounts({ origin: 'https://www.mock.com' });
    expect(accounts).toStrictEqual([]);
  });
});
