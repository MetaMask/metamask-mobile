import { act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
// eslint-disable-next-line import/no-namespace
import * as UseSwitchNotificationsModule from '../../../../util/notifications/hooks/useSwitchNotifications';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import { useAccounts } from '../../../hooks/useAccounts';
import {
  useAccountProps,
  useNotificationAccountListProps,
} from './AccountsList.hooks';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockVar = any;

jest.mock('../../../hooks/useAccounts', () => ({
  useAccounts: jest.fn(),
}));

const arrangeMockUseAccounts = () => {
  const createAccounts = (addresses: string[]) =>
    addresses.map((address) => ({ address }));
  const mockUseAccounts = jest.mocked(useAccounts).mockReturnValue({
    accounts: createAccounts(['0x123', '0x456']),
  } as MockVar);

  return {
    createAccounts,
    mockUseAccounts,
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
        useBlockieIcon: true,
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
    expect(result.current.accountAvatarType).toBe(AvatarAccountType.Blockies);
    expect(result.current.accountAddresses).toEqual(['0x123', '0x456']);
  });
});
