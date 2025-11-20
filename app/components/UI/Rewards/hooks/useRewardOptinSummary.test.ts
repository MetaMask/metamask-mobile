import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useRewardOptinSummary } from './useRewardOptinSummary';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { OptInStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useAccountsOperationsLoadingStates } from '../../../../util/accounts/useAccountsOperationsLoadingStates';
import { useMetrics } from '../../../hooks/useMetrics';
import { AccountGroupId } from '@metamask/account-api';
import { AccountWalletObject } from '@metamask/account-tree-controller';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

// Mock useDebouncedValue hook
jest.mock('../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: jest.fn(),
}));

// Mock useAccountsOperationsLoadingStates hook
jest.mock(
  '../../../../util/accounts/useAccountsOperationsLoadingStates',
  () => ({
    useAccountsOperationsLoadingStates: jest.fn(),
  }),
);

// Mock useMetrics hook
jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
}));

// Mock useInvalidateByRewardEvents hook
jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

describe('useRewardOptinSummary', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockLoggerLog = Logger.log as jest.MockedFunction<typeof Logger.log>;
  const mockUseDebouncedValue = useDebouncedValue as jest.MockedFunction<
    typeof useDebouncedValue
  >;
  const mockUseAccountsOperationsLoadingStates =
    useAccountsOperationsLoadingStates as jest.MockedFunction<
      typeof useAccountsOperationsLoadingStates
    >;
  const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;
  const mockUseInvalidateByRewardEvents =
    useInvalidateByRewardEvents as jest.MockedFunction<
      typeof useInvalidateByRewardEvents
    >;

  const mockAccount1: InternalAccount = {
    id: 'account-1',
    address: '0x123456789abcdef',
    metadata: {
      name: 'Account 1',
      importTime: Date.now(),
      keyring: {
        type: 'HD Key Tree',
      },
    },
    options: {},
    methods: ['personal_sign', 'eth_signTransaction'],
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
  } as InternalAccount;

  const mockAccount2: InternalAccount = {
    id: 'account-2',
    address: '0xabcdef123456789',
    metadata: {
      name: 'Account 2',
      importTime: Date.now(),
      keyring: {
        type: 'HD Key Tree',
      },
    },
    options: {},
    methods: ['personal_sign', 'eth_signTransaction'],
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
  } as InternalAccount;

  const mockAccount3: InternalAccount = {
    id: 'account-3',
    address: '0x987654321fedcba',
    metadata: {
      name: 'Account 3',
      importTime: Date.now(),
      keyring: {
        type: 'HD Key Tree',
      },
    },
    options: {},
    methods: ['personal_sign', 'eth_signTransaction'],
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
  } as InternalAccount;

  // Mock account group data
  const mockAccountGroup1 = {
    id: 'group-1' as AccountGroupId,
    accounts: ['account-1', 'account-2'] as readonly string[],
    metadata: { name: 'Group 1' },
  };

  const mockAccountGroup2 = {
    id: 'group-2' as AccountGroupId,
    accounts: ['account-3'] as readonly string[],
    metadata: { name: 'Group 2' },
  };

  const mockWallet1: AccountWalletObject = {
    id: 'wallet-1',
    name: 'Wallet 1',
    type: 'HD Key Tree',
    accounts: ['account-1', 'account-2'],
    status: 'active',
    groups: [],
    metadata: {},
  } as unknown as AccountWalletObject;

  const mockWallet2: AccountWalletObject = {
    id: 'wallet-2',
    name: 'Wallet 2',
    type: 'HD Key Tree',
    accounts: ['account-3'],
    status: 'active',
    groups: [],
    metadata: {},
  } as unknown as AccountWalletObject;

  const mockAccountGroupsByWallet = [
    {
      wallet: mockWallet1,
      data: [mockAccountGroup1],
    },
    {
      wallet: mockWallet2,
      data: [mockAccountGroup2],
    },
  ];

  const mockInternalAccountsById = {
    'account-1': mockAccount1,
    'account-2': mockAccount2,
    'account-3': mockAccount3,
  };

  const mockSelectedAccountGroup = mockAccountGroup1;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock useSelector calls for the new implementation
    mockUseSelector
      .mockReturnValueOnce(mockSelectedAccountGroup) // selectSelectedAccountGroup
      .mockReturnValueOnce(null) // selectRewardsActiveAccountSubscriptionId
      .mockReturnValueOnce(mockAccountGroupsByWallet) // selectAccountGroupsByWallet
      .mockReturnValueOnce(mockInternalAccountsById); // selectInternalAccountsById

    // Mock useDebouncedValue to return account groups and accounts by default
    mockUseDebouncedValue
      .mockReturnValueOnce(mockAccountGroupsByWallet) // debouncedAccountGroupsByWallet
      .mockReturnValueOnce(mockInternalAccountsById); // debouncedInternalAccountsById

    // Mock useAccountsOperationsLoadingStates to return not syncing by default
    mockUseAccountsOperationsLoadingStates.mockReturnValue({
      areAnyOperationsLoading: false,
      isAccountSyncingInProgress: false,
      loadingMessage: null,
    });

    // Mock useMetrics hook
    mockUseMetrics.mockReturnValue({
      addTraitsToUser: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useMetrics>);

    // Mock useInvalidateByRewardEvents hook
    mockUseInvalidateByRewardEvents.mockImplementation(() => {
      // Mock implementation
    });

    // Mock RewardsController methods
    mockEngineCall.mockImplementation((method: string, ..._args) => {
      if (method === 'RewardsController:isOptInSupported') {
        return true; // Default: all accounts are supported
      }
      if (method === 'RewardsController:getOptInStatus') {
        return Promise.resolve({
          ois: [true, false, true], // Account1: true, Account2: false, Account3: true
          sids: ['sub_123', null, 'sub_456'], // Account1: sub_123, Account2: null, Account3: sub_456
        });
      }
      return Promise.resolve();
    });
  });

  describe('initial state', () => {
    it('should return a refresh function', () => {
      const { result } = renderHook(() => useRewardOptinSummary());

      expect(result.current.refresh).toBeDefined();
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('successful data fetching', () => {
    it('should fetch opt-in status and organize accounts by wallet and group', async () => {
      // Arrange - Account1 and Account3 opted in, Account2 not opted in
      const mockResponse: OptInStatusDto = {
        ois: [true, false, true], // Account1: true, Account2: false, Account3: true
        sids: ['sub_123', null, 'sub_456'], // Account1: sub_123, Account2: null, Account3: sub_456
      };

      mockEngineCall.mockImplementation((method: string, ..._args) => {
        if (method === 'RewardsController:isOptInSupported') {
          return true; // All accounts are supported
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Wait for the effect to complete
      await waitForNextUpdate();

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);

      // Check byWallet structure
      expect(result.current.byWallet).toHaveLength(2);
      // Wallet 1 should have Group 1 with Account1 (opted in) and Account2 (opted out)
      const wallet1 = result.current.byWallet[0];
      expect(wallet1.wallet).toEqual(mockWallet1);
      expect(wallet1.groups).toHaveLength(1);
      expect(wallet1.groups[0].id).toBe('group-1');
      expect(wallet1.groups[0].optedInAccounts).toHaveLength(1);
      expect(wallet1.groups[0].optedInAccounts[0]).toMatchObject({
        ...mockAccount1,
        hasOptedIn: true,
      });
      expect(wallet1.groups[0].optedOutAccounts).toHaveLength(1);
      expect(wallet1.groups[0].optedOutAccounts[0]).toMatchObject({
        ...mockAccount2,
        hasOptedIn: false,
      });
      expect(wallet1.groups[0].unsupportedAccounts).toHaveLength(0);

      // Wallet 2 should have Group 2 with Account3 (opted in)
      const wallet2 = result.current.byWallet[1];
      expect(wallet2.wallet).toEqual(mockWallet2);
      expect(wallet2.groups).toHaveLength(1);
      expect(wallet2.groups[0].id).toBe('group-2');
      expect(wallet2.groups[0].optedInAccounts).toHaveLength(1);
      expect(wallet2.groups[0].optedInAccounts[0]).toMatchObject({
        ...mockAccount3,
        hasOptedIn: true,
      });
      expect(wallet2.groups[0].optedOutAccounts).toHaveLength(0);
      expect(wallet2.groups[0].unsupportedAccounts).toHaveLength(0);

      // Verify that isOptInSupported was called for each account
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:isOptInSupported',
        mockAccount1,
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:isOptInSupported',
        mockAccount2,
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:isOptInSupported',
        mockAccount3,
      );

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getOptInStatus',
        {
          addresses: [
            '0x123456789abcdef',
            '0xabcdef123456789',
            '0x987654321fedcba',
          ],
        },
      );
    });

    it('should handle all accounts opted out', async () => {
      // Arrange
      const mockResponse: OptInStatusDto = {
        ois: [false, false, false],
        sids: [null, null, null],
      };

      mockEngineCall.mockImplementation((method: string, ..._args) => {
        if (method === 'RewardsController:isOptInSupported') {
          return true; // All accounts are supported
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      // Assert
      expect(result.current.byWallet).toHaveLength(2);
      // All groups should have no opted-in accounts
      result.current.byWallet.forEach((wallet) => {
        wallet.groups.forEach((group) => {
          expect(group.optedInAccounts).toHaveLength(0);
          expect(group.optedOutAccounts.length).toBeGreaterThan(0);
        });
      });
    });

    it('should handle all accounts opted in', async () => {
      // Arrange
      const mockResponse: OptInStatusDto = {
        ois: [true, true, true],
        sids: ['sub_123', 'sub_456', 'sub_789'],
      };

      mockEngineCall.mockImplementation((method: string, ..._args) => {
        if (method === 'RewardsController:isOptInSupported') {
          return true; // All accounts are supported
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      // Assert
      expect(result.current.byWallet).toHaveLength(2);
      // All groups should have all accounts opted in
      result.current.byWallet.forEach((wallet) => {
        wallet.groups.forEach((group) => {
          expect(group.optedInAccounts.length).toBeGreaterThan(0);
          expect(group.optedOutAccounts).toHaveLength(0);
        });
      });
    });

    it('should handle no selected account group', async () => {
      // Arrange
      mockUseSelector
        .mockReset()
        .mockReturnValueOnce(null) // selectSelectedAccountGroup - null
        .mockReturnValueOnce(null) // selectRewardsActiveAccountSubscriptionId
        .mockReturnValueOnce(mockAccountGroupsByWallet) // selectAccountGroupsByWallet
        .mockReturnValueOnce(mockInternalAccountsById); // selectInternalAccountsById

      const { result } = renderHook(() => useRewardOptinSummary());

      // Assert
      expect(result.current.bySelectedAccountGroup).toBeNull();
      expect(result.current.currentAccountGroupOptedInStatus).toBeNull();
      expect(result.current.currentAccountGroupPartiallySupported).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle API errors and set error state', async () => {
      // Arrange
      const mockError = new Error('Network error');

      mockEngineCall.mockImplementation((method: string, ..._args) => {
        if (method === 'RewardsController:isOptInSupported') {
          return true; // All accounts are supported
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.reject(mockError);
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(true);
      expect(result.current.byWallet).toEqual([]);
      expect(result.current.bySelectedAccountGroup).toBeNull();
      expect(result.current.currentAccountGroupOptedInStatus).toBeNull();
      expect(result.current.currentAccountGroupPartiallySupported).toBeNull();

      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useRewardOptinSummary: Failed to fetch opt-in status',
        mockError,
      );
    });

    it('should set loading to true at start and false after error', async () => {
      // Arrange
      const mockError = new Error('Network error');

      mockEngineCall.mockImplementation((method: string, ..._args) => {
        if (method === 'RewardsController:isOptInSupported') {
          return true; // All accounts are supported
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.reject(mockError);
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Assert - loading should be true initially when there's data to fetch
      expect(result.current.isLoading).toBe(true);

      await waitForNextUpdate();

      // Assert - loading should be false after error
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(true);
    });
  });

  describe('useDebouncedValue behavior', () => {
    it('should use debounced value when account syncing is not in progress', () => {
      // Arrange - not syncing
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        areAnyOperationsLoading: false,
        isAccountSyncingInProgress: false,
        loadingMessage: null,
      });

      // Act
      renderHook(() => useRewardOptinSummary());

      // Assert - should call useDebouncedValue with 0ms delay when not syncing
      expect(mockUseDebouncedValue).toHaveBeenCalledWith(
        mockAccountGroupsByWallet,
        0,
      );
      expect(mockUseDebouncedValue).toHaveBeenCalledWith(
        mockInternalAccountsById,
        0,
      );
    });

    it('should use debounced value with 10s delay when account syncing is in progress', () => {
      // Arrange - syncing in progress
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        areAnyOperationsLoading: true,
        isAccountSyncingInProgress: true,
        loadingMessage: 'Syncing accounts...',
      });

      // Act
      renderHook(() => useRewardOptinSummary());

      // Assert - should call useDebouncedValue with 10000ms delay when syncing
      expect(mockUseDebouncedValue).toHaveBeenCalledWith(
        mockAccountGroupsByWallet,
        10000,
      );
      expect(mockUseDebouncedValue).toHaveBeenCalledWith(
        mockInternalAccountsById,
        10000,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty account groups', async () => {
      // Arrange
      mockUseSelector
        .mockReset()
        .mockReturnValueOnce(mockSelectedAccountGroup) // selectSelectedAccountGroup
        .mockReturnValueOnce(null) // selectRewardsActiveAccountSubscriptionId
        .mockReturnValueOnce([]) // selectAccountGroupsByWallet - empty
        .mockReturnValueOnce(mockInternalAccountsById); // selectInternalAccountsById

      mockUseDebouncedValue
        .mockReturnValueOnce([]) // debouncedAccountGroupsByWallet - empty
        .mockReturnValueOnce(mockInternalAccountsById); // debouncedInternalAccountsById

      const { result } = renderHook(() => useRewardOptinSummary());

      // Assert
      expect(result.current.byWallet).toEqual([]);
      expect(result.current.bySelectedAccountGroup).toBeNull();
    });

    it('should handle empty internal accounts', async () => {
      // Arrange
      mockUseSelector
        .mockReset()
        .mockReturnValueOnce(mockSelectedAccountGroup) // selectSelectedAccountGroup
        .mockReturnValueOnce(null) // selectRewardsActiveAccountSubscriptionId
        .mockReturnValueOnce(mockAccountGroupsByWallet) // selectAccountGroupsByWallet
        .mockReturnValueOnce({}); // selectInternalAccountsById - empty

      mockUseDebouncedValue
        .mockReturnValueOnce(mockAccountGroupsByWallet) // debouncedAccountGroupsByWallet
        .mockReturnValueOnce({}); // debouncedInternalAccountsById - empty

      const { result } = renderHook(() => useRewardOptinSummary());

      // Assert
      expect(result.current.byWallet).toEqual([]);
      expect(result.current.bySelectedAccountGroup).toBeNull();
    });
  });

  describe('metrics tracking', () => {
    it('should track user traits for reward-enabled accounts count', async () => {
      // Arrange
      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
        sids: ['sub_123', null, 'sub_456'],
      };

      mockEngineCall.mockImplementation((method: string, ..._args) => {
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        return Promise.resolve();
      });

      const { waitForNextUpdate } = renderHook(() => useRewardOptinSummary());

      await waitForNextUpdate();

      // Assert - should call addTraitsToUser with reward-enabled accounts count
      expect(mockUseMetrics().addTraitsToUser).toHaveBeenCalledWith({
        reward_enabled_accounts_count: 2, // Account1 and Account3 are opted in
      });
    });
  });

  describe('subscription conflict handling', () => {
    it('should filter out groups with subscription conflicts', async () => {
      // Arrange
      const activeSubscriptionId = 'active-subscription-id';
      mockUseSelector
        .mockReset()
        .mockReturnValueOnce(mockSelectedAccountGroup) // selectSelectedAccountGroup
        .mockReturnValueOnce(activeSubscriptionId) // selectRewardsActiveAccountSubscriptionId
        .mockReturnValueOnce(mockAccountGroupsByWallet) // selectAccountGroupsByWallet
        .mockReturnValueOnce(mockInternalAccountsById); // selectInternalAccountsById

      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
        sids: ['different-sub-id', null, 'another-sub-id'], // Different subscription IDs
      };

      mockEngineCall.mockImplementation((method: string, ..._args) => {
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      // Assert - should filter out groups with conflicting subscriptions
      expect(result.current.byWallet).toHaveLength(0); // All groups filtered out due to conflicts
    });
  });

  describe('unsupported accounts handling', () => {
    it('should categorize unsupported accounts separately', async () => {
      // Arrange - Account1 is unsupported, Account2 is opted in, Account3 is opted out
      const mockResponse: OptInStatusDto = {
        ois: [true, false], // Only Account2 and Account3 (Account1 not included)
        sids: ['sub_123', null], // Account2: sub_123, Account3: null
      };

      mockEngineCall.mockImplementation((method: string, ...args) => {
        if (method === 'RewardsController:isOptInSupported') {
          // Account1 is not supported, Account2 and Account3 are supported
          const account = args[0];
          return account !== mockAccount1;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);

      // Check byWallet structure
      expect(result.current.byWallet).toHaveLength(2);

      // Wallet 1 should have Group 1 with Account2 (opted in), Account3 (opted out), and Account1 (unsupported)
      const wallet1 = result.current.byWallet[0];
      expect(wallet1.groups[0].optedInAccounts).toHaveLength(1);
      expect(wallet1.groups[0].optedInAccounts[0].id).toBe('account-2');
      expect(wallet1.groups[0].optedOutAccounts).toHaveLength(0);
      expect(wallet1.groups[0].unsupportedAccounts).toHaveLength(1);
      expect(wallet1.groups[0].unsupportedAccounts[0].id).toBe('account-1');
    });

    it('should handle mixed supported and unsupported accounts in same group', async () => {
      // Arrange - Account1 supported and opted in, Account2 unsupported, Account3 supported and opted out
      const mockResponse: OptInStatusDto = {
        ois: [true, false], // Account1: true, Account3: false (Account2 not included)
        sids: ['sub_123', null], // Account1: sub_123, Account3: null
      };

      mockEngineCall.mockImplementation((method: string, ...args) => {
        if (method === 'RewardsController:isOptInSupported') {
          // Account2 is not supported
          const account = args[0];
          return account !== mockAccount2;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      // Assert
      const wallet1 = result.current.byWallet[0];
      expect(wallet1.groups[0].optedInAccounts).toHaveLength(1);
      expect(wallet1.groups[0].optedInAccounts[0].id).toBe('account-1');
      expect(wallet1.groups[0].optedOutAccounts).toHaveLength(0);
      expect(wallet1.groups[0].unsupportedAccounts).toHaveLength(1);
      expect(wallet1.groups[0].unsupportedAccounts[0].id).toBe('account-2');

      const wallet2 = result.current.byWallet[1];
      expect(wallet2.groups[0].optedInAccounts).toHaveLength(0);
      expect(wallet2.groups[0].optedOutAccounts).toHaveLength(1);
      expect(wallet2.groups[0].optedOutAccounts[0].id).toBe('account-3');
      expect(wallet2.groups[0].unsupportedAccounts).toHaveLength(0);
    });
  });
});
