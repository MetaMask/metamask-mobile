import { validateAccountsController } from './accountsController';
import { LOG_TAG } from './validateMigration.types';
import { RootState } from '../../reducers';
import { AccountsControllerState } from '@metamask/accounts-controller';
import { EngineState } from '../../core/Engine/types';
import { Json } from '@metamask/utils';

describe('validateAccountsController', () => {
  const createMockState = (
    accountsState?: Partial<AccountsControllerState>,
  ): Partial<RootState> => ({
    engine: accountsState
      ? {
          backgroundState: {
            AccountsController: accountsState,
          } as EngineState,
        }
      : undefined,
  });

  const mockValidAccountsState: Partial<AccountsControllerState> = {
    internalAccounts: {
      accounts: {
        'account-1': {
          id: 'account-1',
          address: '0x123',
          type: 'eip155:eoa',
          options: {} as Record<string, Json>,
          methods: [],
          metadata: {
            name: 'Account 1',
            lastSelected: 0,
            importTime: Date.now(),
            keyring: {
              type: 'HD Key Tree',
            },
          },
        },
      },
      selectedAccount: 'account-1',
    },
  };

  it('returns no errors for valid state', () => {
    const errors = validateAccountsController(
      createMockState(mockValidAccountsState) as RootState,
    );
    expect(errors).toEqual([]);
  });

  it('returns error if AccountsController state is missing', () => {
    const errors = validateAccountsController(
      createMockState(undefined) as RootState,
    );
    expect(errors).toEqual([
      `${LOG_TAG}: AccountsController state is missing in engine backgroundState.`,
    ]);
  });

  it('returns error if internalAccounts is missing', () => {
    const errors = validateAccountsController(createMockState({}) as RootState);
    expect(errors).toEqual([
      `${LOG_TAG}: AccountsController No internalAccounts object found on AccountsControllerState.`,
    ]);
  });

  it('returns error if accounts is empty', () => {
    const errors = validateAccountsController(
      createMockState({
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      }) as RootState,
    );
    expect(errors).toEqual([
      `${LOG_TAG}: AccountsController No accounts found in internalAccounts.accounts.`,
    ]);
  });

  it('returns error if selectedAccount is empty', () => {
    const errors = validateAccountsController(
      createMockState({
        internalAccounts: {
          accounts: {
            'account-1': {
              id: 'account-1',
              address: '0x123',
              type: 'eip155:eoa',
              options: {} as Record<string, Json>,
              methods: [],
              metadata: {
                name: 'Account 1',
                lastSelected: 0,
                importTime: Date.now(),
                keyring: {
                  type: 'HD Key Tree',
                },
              },
            },
          },
          selectedAccount: '',
        },
      }) as RootState,
    );
    expect(errors).toEqual([
      `${LOG_TAG}: AccountsController selectedAccount is missing or empty.`,
    ]);
  });

  it('returns error if selectedAccount does not exist in accounts', () => {
    const errors = validateAccountsController(
      createMockState({
        internalAccounts: {
          accounts: {
            'account-1': {
              id: 'account-1',
              address: '0x123',
              type: 'eip155:eoa',
              options: {} as Record<string, Json>,
              methods: [],
              metadata: {
                name: 'Account 1',
                lastSelected: 0,
                importTime: Date.now(),
                keyring: {
                  type: 'HD Key Tree',
                },
              },
            },
          },
          selectedAccount: 'non-existent-account',
        },
      }) as RootState,
    );
    expect(errors).toEqual([
      `${LOG_TAG}: AccountsController The selectedAccount 'non-existent-account' does not exist in the accounts record.`,
    ]);
  });

  it('handles undefined engine state', () => {
    const errors = validateAccountsController({} as RootState);
    expect(errors).toEqual([
      `${LOG_TAG}: AccountsController state is missing in engine backgroundState.`,
    ]);
  });

  it('handles undefined backgroundState', () => {
    const errors = validateAccountsController({ engine: {} } as RootState);
    expect(errors).toEqual([
      `${LOG_TAG}: AccountsController state is missing in engine backgroundState.`,
    ]);
  });
});
