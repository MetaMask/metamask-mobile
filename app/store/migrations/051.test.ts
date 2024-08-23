import { AccountsControllerState } from '@metamask/accounts-controller';
import { migrate, version } from './051';
import { createMockInternalAccount } from '../../util/test/accountsControllerTestUtils';

const oldVersion = 50;
const MOCK_DEFAULT_ADDRESS = '0xd5e099c71b797516c10ed0f0d895f429c2781111';

const mockInternalAccount = createMockInternalAccount(
  MOCK_DEFAULT_ADDRESS,
  'Account 1',
);
const mockAccountsControllerState: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      [mockInternalAccount.id]: mockInternalAccount,
    },
    selectedAccount: mockInternalAccount.id,
  },
};

describe('Migration #51', () => {
  afterEach(() => jest.resetAllMocks());

  it('updates the version metadata', async () => {
    const oldStorage = {
      meta: { version: oldVersion },
      data: {
        AccountsController: mockAccountsControllerState,
      },
    };

    const newStorage = await migrate(oldStorage);
    expect(newStorage.meta).toStrictEqual({ version });
  });

  it('updates selected account if it is not found in the list of accounts', async () => {
    const oldStorage = {
      meta: { version: oldVersion },
      data: {
        AccountsController: {
          ...mockAccountsControllerState,
          internalAccounts: {
            ...mockAccountsControllerState.internalAccounts,
            selectedAccount: 'unknown id',
          },
        },
      },
    };

    const newStorage = await migrate(oldStorage);
    const {
      internalAccounts: { selectedAccount },
    } = newStorage.data.AccountsController as AccountsControllerState;
    expect(selectedAccount).toStrictEqual(mockInternalAccount.id);
    expect(newStorage.data.AccountsController).toStrictEqual(
      mockAccountsControllerState,
    );
  });

  it('does nothing if the selectedAccount is found in the list of accounts', async () => {
    const oldStorage = {
      meta: { version: oldVersion },
      data: {
        AccountsController: mockAccountsControllerState,
      },
    };

    const newStorage = await migrate(oldStorage);
    expect(newStorage.data.AccountsController).toStrictEqual(
      mockAccountsControllerState,
    );
  });
});
