import { act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
// eslint-disable-next-line import/no-namespace
import * as UseSwitchNotificationsModule from '../../../../util/notifications/hooks/useSwitchNotifications';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import { useAccounts } from '../../../hooks/useAccounts';
import { getValidNotificationAccounts } from '../../../../selectors/notifications';
import {
  useAccountProps,
  useNotificationAccountListProps,
} from './AccountsList.hooks';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockVar = any;

jest.mock('../../../hooks/useAccounts', () => ({
  useAccounts: jest.fn(),
}));
jest.mock('../../../../selectors/notifications', () => ({
  getValidNotificationAccounts: jest.fn(),
}));

const arrangeMockUseAccounts = () => {
  const createAccounts = (addresses: string[]) =>
    addresses.map((address) => ({ address }));
  const mockUseAccounts = jest.mocked(useAccounts).mockReturnValue({
    accounts: createAccounts(['0x123', '0x456']),
  } as MockVar);
  const mockGetNotificationAccounts = jest
    .mocked(getValidNotificationAccounts)
    .mockReturnValue(['0x123', '0x456']);

  return {
    createAccounts,
    mockUseAccounts,
    mockGetNotificationAccounts,
  };
};

describe('useNotificationAccountListProps', () => {
  const arrangeMocks = () => {
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
      mockUpdate,
      createUseFetchAccountNotificationsReturn,
      mockUseFetchAccountNotifications,
    };
  };

  const arrange = (
    addresses: string[],
    mutateMocks?: (m: ReturnType<typeof arrangeMocks>) => void,
  ) => {
    const mocks = arrangeMocks();
    mutateMocks?.(mocks);
    const hook = renderHookWithProvider(() =>
      useNotificationAccountListProps(addresses),
    );

    return { mocks, hook };
  };
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
    expect(hook.result.current.isAccountLoading('0x123')).toBe(true);
    expect(hook.result.current.isAccountLoading('0x456')).toBe(false);
  });

  it('returns correct account enabled state', async () => {
    const addresses = ['0x123', '0x456'];
    const { hook } = arrange(addresses, (m) => {
      m.mockUseFetchAccountNotifications.mockReturnValue({
        ...m.createUseFetchAccountNotificationsReturn(),

        data: { '0x123': true, '0x456': false },
      });
    });
    expect(hook.result.current.isAccountEnabled('0x123')).toBe(true);
    expect(hook.result.current.isAccountEnabled('0x456')).toBe(false);
  });

  it('handles account loading with different address formats', async () => {
    const addresses = ['0x123', '0x456'];
    const { hook } = arrange(addresses, (m) => {
      m.mockUseFetchAccountNotifications.mockReturnValue({
        ...m.createUseFetchAccountNotificationsReturn(),
        // accountsBeingUpdated contains lowercase address
        accountsBeingUpdated: ['0xc4955c0d639d99699bfd7ec54d9fafee40e4d272'],
      });
    });
    // Should match even when checking with different case
    expect(
      hook.result.current.isAccountLoading(
        '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      ),
    ).toBe(true);
    expect(hook.result.current.isAccountLoading('0x456')).toBe(false);
  });

  it('returns account enabled state with formatted address keys', async () => {
    const addresses = ['0x123', '0x456'];
    const { hook } = arrange(addresses, (m) => {
      m.mockUseFetchAccountNotifications.mockReturnValue({
        ...m.createUseFetchAccountNotificationsReturn(),
        // Data keys are in checksummed format
        data: { '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': true },
      });
    });
    // Should find the account even with different case input
    expect(
      hook.result.current.isAccountEnabled(
        '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
      ),
    ).toBe(true);
  });

  it('falls back to lowercase address when formatted address not found', async () => {
    const addresses = ['0x123', '0x456'];
    const { hook } = arrange(addresses, (m) => {
      m.mockUseFetchAccountNotifications.mockReturnValue({
        ...m.createUseFetchAccountNotificationsReturn(),
        // Data keys are in lowercase format
        data: { '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272': true },
      });
    });
    // Should find the account using lowercase fallback
    expect(
      hook.result.current.isAccountEnabled(
        '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      ),
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
    expect(hook.result.current.isAccountEnabled('0x999')).toBe(false);
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

    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accountAvatarType).toBe(AvatarAccountType.Maskicon);
    expect(result.current.accountAddresses).toEqual(['0x123', '0x456']);
  });
});
