import { act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
// eslint-disable-next-line import/no-namespace
import * as UseSwitchNotificationsModule from '../../../../util/notifications/hooks/useSwitchNotifications';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import { getValidNotificationAccounts } from '../../../../selectors/notifications';
import {
  useAccountProps,
  useNotificationAccountListProps,
} from './AccountsList.hooks';
import { selectInternalAccountsById } from '../../../../selectors/accountsController';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/accountTreeController';
import { AccountGroupType, AccountWalletType } from '@metamask/account-api';

jest.mock('../../../../selectors/notifications', () => ({
  getValidNotificationAccounts: jest.fn(),
}));
jest.mock('../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../selectors/accountsController'),
  selectInternalAccountsById: jest.fn(),
}));
jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectAccountGroupsByWallet: jest.fn(),
  }),
);

const arrangeMockUseAccounts = () => {
  const createMockAccountGroup = (
    idx: number,
    accounts: [string, ...string[]],
  ) =>
    ({
      accounts,
      id: `entropy:111/${idx}`,
      type: AccountGroupType.MultichainAccount,
      metadata: {
        entropy: {
          groupIndex: idx,
        },
        hidden: false,
        name: `Account ${idx}`,
        pinned: false,
      },
    } as const);

  const group1 = createMockAccountGroup(0, [
    `MOCK-ID-FOR-0xb2B92547A92C1aC55EAe3F6632Fa1aF87dc05a29`,
    'MOCK-ID-FOR-63jw5Q7pJXeHgHSvfTmKytUQ19hQgiAJQ5LZykmSMGRY',
  ]);
  const group2 = createMockAccountGroup(1, [
    `MOCK-ID-FOR-0x700CcD8172BC3807D893883a730A1E0E6630F8EC`,
    'MOCK-ID-FOR-Agsjd8HjGH5DxiXLMWc8fR4jjgHhvJG3TXcCpc1ieD9B',
  ]);
  const group3 = createMockAccountGroup(0, [
    `MOCK-ID-FOR-0xb2B92547A92C1aC55EAe3F6632Fa1aF87dc05a20`,
    'MOCK-ID-FOR-63jw5Q7pJXeHgHSvfTmKytUQ19hQgiAJQ5LZykmSMGR0',
  ]);
  const group4 = createMockAccountGroup(1, [
    `MOCK-ID-FOR-0x700CcD8172BC3807D893883a730A1E0E6630F8E0`,
    'MOCK-ID-FOR-Agsjd8HjGH5DxiXLMWc8fR4jjgHhvJG3TXcCpc1ieD90',
  ]);

  const mockSelectoWallets = jest
    .mocked(selectAccountGroupsByWallet)
    .mockReturnValue([
      {
        title: 'Wallet 1',
        wallet: {
          id: 'entropy:wallet-1',
          type: AccountWalletType.Entropy,
          metadata: {
            entropy: {
              id: '',
            },
            name: 'Wallet 1',
          },
          status: 'ready',
          groups: {
            [group1.id]: group1,
            [group2.id]: group2,
          },
        },
        data: [group1, group2],
      },
      {
        title: 'Wallet 2',
        wallet: {
          id: 'entropy:wallet-2',
          type: AccountWalletType.Entropy,
          metadata: {
            entropy: {
              id: '',
            },
            name: 'Wallet 2',
          },
          status: 'ready',
          groups: {
            [group3.id]: group3,
            [group4.id]: group4,
          },
        },
        data: [group3, group4],
      },
    ]);

  return {
    mockSelectoWallets,
  };
};

describe('useNotificationAccountListProps', () => {
  const arrangeMocks = (addresses: string[]) => {
    const mockGetNotificationAccounts = jest
      .mocked(getValidNotificationAccounts)
      .mockReturnValue(addresses);

    const createInternalAccount = (address: string): InternalAccount =>
      ({
        id: `id-${address}`,
        address,
        type: 'eip155:eoa',
      } as InternalAccount);

    const accountsMap: Record<string, InternalAccount> = {};
    addresses.forEach((addr) => {
      const account = createInternalAccount(addr);
      accountsMap[account.id] = account;
    });

    const mockSelectInternalAccountsById = jest
      .mocked(selectInternalAccountsById)
      .mockReturnValue(accountsMap);

    const mockUpdate = jest.fn();
    const createUseFetchAccountNotificationsReturn = () => ({
      accountsBeingUpdated: [],
      data: {},
      error: null,
      initialLoading: false,
      update: mockUpdate,
    });
    const mockUseFetchAccountNotifications = jest
      .spyOn(UseSwitchNotificationsModule, 'useFetchAccountNotifications')
      .mockReturnValue(createUseFetchAccountNotificationsReturn());

    return {
      mockSelectInternalAccountsById,
      mockGetNotificationAccounts,
      mockUpdate,
      createUseFetchAccountNotificationsReturn,
      mockUseFetchAccountNotifications,
    };
  };

  const arrange = (
    addresses: string[],
    mutateMocks?: (m: ReturnType<typeof arrangeMocks>) => void,
  ) => {
    const mocks = arrangeMocks(addresses);
    mutateMocks?.(mocks);
    const hook = renderHookWithProvider(() =>
      useNotificationAccountListProps(),
    );

    return { mocks, hook };
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns correct loading state', async () => {
    const addresses = ['0x123', '0x456'];
    const { hook } = arrange(addresses);
    expect(hook.result.current.isAnyAccountLoading).toBe(false);
  });

  it('returns correct account loading state', async () => {
    const addresses = ['0x123', '0x456'];
    const { hook } = arrange(addresses, (m) => {
      m.mockUseFetchAccountNotifications.mockReturnValue({
        ...m.createUseFetchAccountNotificationsReturn(),
        accountsBeingUpdated: ['0x123'],
      });
    });
    expect(hook.result.current.isAccountLoading(['id-0x123'])).toBe(true);
    expect(hook.result.current.isAccountLoading(['id-0x456'])).toBe(false);
  });

  it('returns correct account enabled state', async () => {
    const addresses = ['0x123', '0x456'];
    const { hook } = arrange(addresses, (m) => {
      m.mockUseFetchAccountNotifications.mockReturnValue({
        ...m.createUseFetchAccountNotificationsReturn(),

        data: { '0x123': true, '0x456': false },
      });
    });
    expect(hook.result.current.isAccountEnabled(['id-0x123'])).toBe(true);
    expect(hook.result.current.isAccountEnabled(['id-0x456'])).toBe(false);
  });

  it('handles account loading with different address formats', async () => {
    const addresses = [
      '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      '0x123',
      '0x456',
    ];
    const { hook } = arrange(addresses, (m) => {
      m.mockUseFetchAccountNotifications.mockReturnValue({
        ...m.createUseFetchAccountNotificationsReturn(),
        // accountsBeingUpdated contains lowercase address
        accountsBeingUpdated: ['0xc4955c0d639d99699bfd7ec54d9fafee40e4d272'],
      });
    });
    // Should match even when checking with different case
    expect(
      hook.result.current.isAccountLoading([
        'id-0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      ]),
    ).toBe(true);
    expect(hook.result.current.isAccountLoading(['id-0x456'])).toBe(false);
  });

  it('returns account enabled state with formatted address keys', async () => {
    const addresses = [
      '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
      '0x123',
      '0x456',
    ];
    const { hook } = arrange(addresses, (m) => {
      m.mockUseFetchAccountNotifications.mockReturnValue({
        ...m.createUseFetchAccountNotificationsReturn(),
        // Data keys are in checksummed format
        data: { '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': true },
      });
    });
    // Should find the account even with different case input
    expect(
      hook.result.current.isAccountEnabled([
        'id-0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
      ]),
    ).toBe(true);
  });

  it('falls back to lowercase address when formatted address not found', async () => {
    const addresses = [
      '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      '0x123',
      '0x456',
    ];
    const { hook } = arrange(addresses, (m) => {
      m.mockUseFetchAccountNotifications.mockReturnValue({
        ...m.createUseFetchAccountNotificationsReturn(),
        // Data keys are in lowercase format
        data: { '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272': true },
      });
    });
    // Should find the account using lowercase fallback
    expect(
      hook.result.current.isAccountEnabled([
        'id-0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      ]),
    ).toBe(true);
  });

  it('returns false when address not found in any format', async () => {
    const addresses = ['0x123', '0x456'];
    const { hook } = arrange(addresses, (m) => {
      m.mockUseFetchAccountNotifications.mockReturnValue({
        ...m.createUseFetchAccountNotificationsReturn(),
        data: { '0x789': true },
      });
    });
    // Should return false when address not found
    expect(hook.result.current.isAccountEnabled(['id-0x999'])).toBe(false);
  });

  it('refetches account settings', async () => {
    const addresses = ['0x123', '0x456'];
    const { mocks, hook } = arrange(addresses);

    // Act
    await act(async () => hook.result.current.refetchAccountSettings());

    // Assert update method is called
    await waitFor(() => {
      expect(mocks.mockUpdate).toHaveBeenCalledWith(addresses);
    });
  });
});

describe('useAccountProps', () => {
  const arrangeMocks = () => {
    const mockStore = jest.fn().mockReturnValue({
      settings: {
        avatarAccountType: AvatarAccountType.Maskicon,
      },
    });

    return {
      ...arrangeMockUseAccounts(),
      mockStore,
    };
  };

  it('returns correct account props', () => {
    const mocks = arrangeMocks();
    const { result } = renderHookWithProvider(() => useAccountProps(), {
      state: mocks.mockStore(),
    });

    expect(result.current.accountAvatarType).toBe(AvatarAccountType.Maskicon);
    expect(result.current.firstHDWalletGroups).toStrictEqual(
      expect.objectContaining({
        title: 'Wallet 1',
        wallet: expect.objectContaining({
          id: 'entropy:wallet-1',
          type: AccountWalletType.Entropy,
        }),
      }),
    );
  });
});
