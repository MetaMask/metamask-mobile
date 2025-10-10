import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useRewardOptinSummary } from './useRewardOptinSummary';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { OptInStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useFocusEffect } from '@react-navigation/native';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useAccountsOperationsLoadingStates } from '../../../../util/accounts/useAccountsOperationsLoadingStates';
import { convertInternalAccountToCaipAccountId } from '../utils';
import { useMetrics } from '../../../hooks/useMetrics';

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

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
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

// Mock utility functions
jest.mock('../utils', () => ({
  convertInternalAccountToCaipAccountId: jest.fn(),
}));

// Mock useMetrics hook
jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
}));

describe('useRewardOptinSummary', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockLoggerLog = Logger.log as jest.MockedFunction<typeof Logger.log>;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockUseDebouncedValue = useDebouncedValue as jest.MockedFunction<
    typeof useDebouncedValue
  >;
  const mockUseAccountsOperationsLoadingStates =
    useAccountsOperationsLoadingStates as jest.MockedFunction<
      typeof useAccountsOperationsLoadingStates
    >;
  const mockConvertInternalAccountToCaipAccountId =
    convertInternalAccountToCaipAccountId as jest.MockedFunction<
      typeof convertInternalAccountToCaipAccountId
    >;
  const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;

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

  const mockAccounts = [mockAccount1, mockAccount2, mockAccount3];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector
      .mockReturnValueOnce(mockAccounts) // selectInternalAccounts
      .mockReturnValueOnce(mockAccount1) // selectSelectedInternalAccount
      .mockReturnValueOnce(null); // selectRewardsActiveAccountSubscriptionId

    // Mock useDebouncedValue to return accounts by default
    mockUseDebouncedValue.mockReturnValue(mockAccounts);

    // Mock useAccountsOperationsLoadingStates to return not syncing by default
    mockUseAccountsOperationsLoadingStates.mockReturnValue({
      areAnyOperationsLoading: false,
      isAccountSyncingInProgress: false,
      loadingMessage: null,
    });

    // Mock utility functions
    mockConvertInternalAccountToCaipAccountId.mockImplementation(
      (account) => `eip155:1:${account.address}`,
    );

    // Mock useMetrics hook
    mockUseMetrics.mockReturnValue({
      addTraitsToUser: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useMetrics>);

    // Mock RewardsController methods
    mockEngineCall.mockImplementation((method: string, ..._args) => {
      if (method === 'RewardsController:isOptInSupported') {
        return true; // Default: all accounts are supported
      }
      if (method === 'RewardsController:getOptInStatus') {
        return Promise.resolve({ ois: [true, false, true] }); // Default response
      }
      if (method === 'RewardsController:getActualSubscriptionId') {
        return 'first-subscription-id'; // Default actual subscription ID
      }
      return Promise.resolve();
    });

    // Reset the mocked hooks
    mockUseFocusEffect.mockClear();
  });

  describe('initial state', () => {
    it('should initialize with correct default values when enabled', () => {
      // Arrange
      mockEngineCall.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          }),
      ); // Never resolves

      const { result } = renderHook(() => useRewardOptinSummary());

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      // Assert
      expect(result.current.linkedAccounts).toEqual([]);
      expect(result.current.unlinkedAccounts).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasError).toBe(false);
      expect(result.current.currentAccountOptedIn).toBeNull();
      expect(result.current.currentAccountSupported).toBeNull();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should return a refresh function', () => {
      const { result } = renderHook(() => useRewardOptinSummary());

      expect(result.current.refresh).toBeDefined();
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('successful data fetching', () => {
    it('should fetch opt-in status and categorize accounts correctly', async () => {
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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      // Wait for the effect to complete
      await waitForNextUpdate();

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.currentAccountOptedIn).toBe(true); // Account1 is selected and opted in
      expect(result.current.currentAccountSupported).toBe(true); // Account1 is supported

      // Check linked accounts (opted in)
      expect(result.current.linkedAccounts).toHaveLength(2);
      expect(result.current.linkedAccounts[0]).toMatchObject({
        ...mockAccount1,
        hasOptedIn: true,
      });
      expect(result.current.linkedAccounts[1]).toMatchObject({
        ...mockAccount3,
        hasOptedIn: true,
      });

      // Check unlinked accounts (not opted in)
      expect(result.current.unlinkedAccounts).toHaveLength(1);
      expect(result.current.unlinkedAccounts[0]).toMatchObject({
        ...mockAccount2,
        hasOptedIn: false,
      });

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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      await waitForNextUpdate();

      // Assert
      expect(result.current.linkedAccounts).toHaveLength(0);
      expect(result.current.unlinkedAccounts).toHaveLength(3);
      expect(result.current.currentAccountOptedIn).toBe(false);
      expect(result.current.currentAccountSupported).toBe(true);
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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      await waitForNextUpdate();

      // Assert
      expect(result.current.linkedAccounts).toHaveLength(3);
      expect(result.current.unlinkedAccounts).toHaveLength(0);
      expect(result.current.currentAccountOptedIn).toBe(true);
      expect(result.current.currentAccountSupported).toBe(true);
    });

    it('should handle selected account not in accounts list', async () => {
      // Arrange
      const differentAccount: InternalAccount = {
        ...mockAccount1,
        id: 'different-account',
        address: '0xdifferentaddress',
      } as InternalAccount;

      mockUseSelector
        .mockReset()
        .mockReturnValueOnce(mockAccounts) // selectInternalAccounts
        .mockReturnValueOnce(differentAccount); // selectSelectedInternalAccount - not in accounts

      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
        sids: ['sub_123', null, 'sub_456'],
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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      await waitForNextUpdate();

      // Assert
      expect(result.current.currentAccountOptedIn).toBe(false); // Should default to false
      expect(result.current.currentAccountSupported).toBe(false); // Different account not in supported list
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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      await waitForNextUpdate();

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(true);
      expect(result.current.linkedAccounts).toEqual([]);
      expect(result.current.unlinkedAccounts).toEqual([]);
      expect(result.current.currentAccountOptedIn).toBeNull();
      expect(result.current.currentAccountSupported).toBeNull();

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

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      // Assert - loading should be true initially when there's data to fetch
      expect(result.current.isLoading).toBe(true);

      await waitForNextUpdate();

      // Assert - loading should be false after error
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(true);
    });
  });

  describe('enabled/disabled functionality', () => {
    it('should not fetch data when disabled', () => {
      renderHook(() => useRewardOptinSummary({ enabled: false }));

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      // Should not call the data fetching methods, but coercedLinkedAccounts may still call getFirstSubscriptionId
      expect(mockEngineCall).not.toHaveBeenCalledWith(
        'RewardsController:isOptInSupported',
        expect.anything(),
      );
      expect(mockEngineCall).not.toHaveBeenCalledWith(
        'RewardsController:getOptInStatus',
        expect.anything(),
      );
    });
  });

  describe('memoization', () => {
    it('should memoize linked/unlinked separation', async () => {
      // Arrange
      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
        sids: ['sub_123', null, 'sub_456'],
      };
      mockEngineCall.mockResolvedValueOnce(mockResponse);

      const { result, rerender, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      await waitForNextUpdate();

      const firstLinkedAccounts = result.current.linkedAccounts;
      const firstUnlinkedAccounts = result.current.unlinkedAccounts;

      // Rerender without changing data
      rerender();

      // Should maintain same references due to memoization
      expect(result.current.linkedAccounts).toBe(firstLinkedAccounts);
      expect(result.current.unlinkedAccounts).toBe(firstUnlinkedAccounts);
    });
  });

  describe('edge cases', () => {
    it('should handle no selected account', async () => {
      // Arrange
      mockUseSelector
        .mockReset()
        .mockReturnValueOnce(mockAccounts) // selectInternalAccounts
        .mockReturnValueOnce(null); // selectSelectedInternalAccount - null

      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
        sids: ['sub_123', null, 'sub_456'],
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

      // Verify that the focus effect callback was registered
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      await waitForNextUpdate();

      // Assert
      expect(result.current.currentAccountOptedIn).toBe(false); // Should default to false
      expect(result.current.currentAccountSupported).toBe(false); // No selected account
    });
  });

  describe('account support filtering', () => {
    it('should only fetch opt-in status for supported accounts', async () => {
      // Arrange - Only account1 and account3 are supported
      const mockResponse: OptInStatusDto = {
        ois: [true, false],
        sids: ['sub_123', null], // Only 2 accounts supported: account1 (true), account3 (false)
      };

      mockEngineCall.mockImplementation((method: string, ...args) => {
        if (method === 'RewardsController:isOptInSupported') {
          const [account] = args as [InternalAccount];
          // Only account1 and account3 are supported
          return (
            account.address === mockAccount1.address ||
            account.address === mockAccount3.address
          );
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      await waitForNextUpdate();

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.currentAccountOptedIn).toBe(true); // Account1 is selected and opted in
      expect(result.current.currentAccountSupported).toBe(true); // Account1 is supported

      // Should only have 2 accounts total (account2 was filtered out)
      expect(result.current.linkedAccounts).toHaveLength(1); // Only account1 opted in
      expect(result.current.unlinkedAccounts).toHaveLength(1); // Only account3 not opted in

      expect(result.current.linkedAccounts[0]).toMatchObject({
        ...mockAccount1,
        hasOptedIn: true,
      });
      expect(result.current.unlinkedAccounts[0]).toMatchObject({
        ...mockAccount3,
        hasOptedIn: false,
      });

      // Verify that getOptInStatus was called with only supported account addresses
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getOptInStatus',
        {
          addresses: [mockAccount1.address, mockAccount3.address],
        },
      );
    });

    it('should handle when selected account is unsupported but others are supported', async () => {
      // Arrange - Account1 (selected) is unsupported, but account2 and account3 are supported
      const mockResponse: OptInStatusDto = {
        ois: [true, false],
        sids: ['sub_123', null], // account2 (true), account3 (false)
      };

      mockEngineCall.mockImplementation((method: string, ...args) => {
        if (method === 'RewardsController:isOptInSupported') {
          const [account] = args as [InternalAccount];
          // Only account2 and account3 are supported (not account1)
          return (
            account.address === mockAccount2.address ||
            account.address === mockAccount3.address
          );
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      await waitForNextUpdate();

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.currentAccountOptedIn).toBe(false); // Account1 is selected but unsupported
      expect(result.current.currentAccountSupported).toBe(false); // Account1 is not supported

      // Should have data for the 2 supported accounts
      expect(result.current.linkedAccounts).toHaveLength(1); // account2 opted in
      expect(result.current.unlinkedAccounts).toHaveLength(1); // account3 not opted in

      expect(result.current.linkedAccounts[0]).toMatchObject({
        ...mockAccount2,
        hasOptedIn: true,
      });
      expect(result.current.unlinkedAccounts[0]).toMatchObject({
        ...mockAccount3,
        hasOptedIn: false,
      });

      // Verify that getOptInStatus was called with only supported account addresses
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getOptInStatus',
        {
          addresses: [mockAccount2.address, mockAccount3.address],
        },
      );
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
      expect(mockUseDebouncedValue).toHaveBeenCalledWith(mockAccounts, 0);
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
      expect(mockUseDebouncedValue).toHaveBeenCalledWith(mockAccounts, 10000);
    });

    it('should refetch when debounced accounts change', async () => {
      // Arrange - initial accounts
      const initialAccounts = [mockAccount1];
      const updatedAccounts = [mockAccount1, mockAccount2];

      mockUseDebouncedValue
        .mockReturnValueOnce(initialAccounts)
        .mockReturnValueOnce(updatedAccounts);

      const mockResponse: OptInStatusDto = {
        ois: [true],
        sids: ['sub_123'],
      };
      mockEngineCall
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce({ ois: [true, false] });

      // Act - first render
      const { rerender, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Trigger initial fetch
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();
      await waitForNextUpdate();

      // Clear previous calls
      jest.clearAllMocks();
      mockUseDebouncedValue.mockReturnValue(updatedAccounts);
      mockEngineCall.mockResolvedValueOnce({ ois: [true, false] });

      // Act - rerender with updated accounts
      rerender();

      // Trigger fetch again
      const newFocusCallback = mockUseFocusEffect.mock.calls[0][0];
      newFocusCallback();
      await waitForNextUpdate();

      // Assert - should call with updated accounts
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getOptInStatus',
        {
          addresses: [mockAccount1.address, mockAccount2.address],
        },
      );
    });
  });

  describe('focus effect registration', () => {
    it('should register focus effect callback', () => {
      renderHook(() => useRewardOptinSummary());

      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should register focus effect callback even when disabled', () => {
      renderHook(() => useRewardOptinSummary({ enabled: false }));

      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('loading state management', () => {
    it('should show loading false when accounts are already populated', async () => {
      // Arrange - accounts already exist
      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
        sids: ['sub_123', null, 'sub_456'],
      };
      mockEngineCall.mockResolvedValueOnce(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Trigger fetch
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();
      await waitForNextUpdate();

      // Assert - loading should be false because optedInAccounts has data
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });

    it('should show loading true when no accounts are populated yet', () => {
      // Arrange - loading state with no resolved accounts
      mockEngineCall.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          }),
      );

      const { result } = renderHook(() => useRewardOptinSummary());

      // Trigger fetch
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      // Assert - should show loading when no accounts populated
      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasError).toBe(false);
    });

    it('should set loading to true at start and false after successful completion', async () => {
      // Arrange
      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
        sids: ['sub_123', null, 'sub_456'],
      };
      mockEngineCall.mockResolvedValueOnce(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Execute the focus effect callback to trigger the fetch logic
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      // Assert - loading should be true initially
      expect(result.current.isLoading).toBe(true);

      await waitForNextUpdate();

      // Assert - loading should be false after completion
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });
  });

  describe('coercedLinkedAccounts logic', () => {
    it('should return all linked accounts when activeAccountSubscriptionId is null', async () => {
      // Arrange
      mockUseSelector
        .mockReset()
        .mockReturnValueOnce(mockAccounts) // selectInternalAccounts
        .mockReturnValueOnce(mockAccount1) // selectSelectedInternalAccount
        .mockReturnValueOnce(null); // selectRewardsActiveAccountSubscriptionId (null)

      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
        sids: ['sub_123', null, 'sub_456'], // Account1 and Account3 opted in
      };

      mockEngineCall.mockImplementation((method: string, ..._args) => {
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        if (method === 'RewardsController:getFirstSubscriptionId') {
          return 'first-subscription-id';
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Trigger fetch
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();
      await waitForNextUpdate();

      // Assert - should return all linked accounts since activeAccountSubscriptionId is null
      expect(result.current.linkedAccounts).toHaveLength(2);
      expect(result.current.linkedAccounts[0]).toMatchObject({
        ...mockAccount1,
        hasOptedIn: true,
      });
      expect(result.current.linkedAccounts[1]).toMatchObject({
        ...mockAccount3,
        hasOptedIn: true,
      });

      // Should not call getActualSubscriptionId since activeAccountSubscriptionId is null
      expect(mockEngineCall).not.toHaveBeenCalledWith(
        'RewardsController:getActualSubscriptionId',
        expect.anything(),
      );
    });

    it('should return empty array when no accounts match the active subscription', async () => {
      // Arrange
      const activeSubscriptionId = 'active-subscription-id';

      let selectorCallCount = 0;
      mockUseSelector.mockReset().mockImplementation(() => {
        selectorCallCount++;
        if (selectorCallCount % 3 === 1) return mockAccounts; // selectInternalAccounts
        if (selectorCallCount % 3 === 2) return mockAccount1; // selectSelectedInternalAccount
        if (selectorCallCount % 3 === 0) return activeSubscriptionId; // selectRewardsActiveAccountSubscriptionId
        return null;
      });

      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
        sids: ['sub_123', null, 'sub_456'], // Account1 and Account3 opted in
      };

      mockEngineCall.mockImplementation((method: string, ..._args) => {
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        if (method === 'RewardsController:getActualSubscriptionId') {
          // All accounts return different subscription ID (none match active)
          return 'different-subscription-id';
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Trigger fetch
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();
      await waitForNextUpdate();

      // Assert - should return empty array since no accounts match active subscription
      expect(result.current.linkedAccounts).toHaveLength(0);
      expect(result.current.unlinkedAccounts).toHaveLength(1); // Account2 is unlinked
    });

    it('should handle convertInternalAccountToCaipAccountId returning null', async () => {
      // Arrange
      const activeSubscriptionId = 'active-subscription-id';

      let selectorCallCount = 0;
      mockUseSelector.mockReset().mockImplementation(() => {
        selectorCallCount++;
        if (selectorCallCount % 3 === 1) return mockAccounts; // selectInternalAccounts
        if (selectorCallCount % 3 === 2) return mockAccount1; // selectSelectedInternalAccount
        if (selectorCallCount % 3 === 0) return activeSubscriptionId; // selectRewardsActiveAccountSubscriptionId
        return null;
      });

      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
        sids: ['sub_123', null, 'sub_456'], // Account1 and Account3 opted in
      };

      // Mock convertInternalAccountToCaipAccountId to return null for Account3
      mockConvertInternalAccountToCaipAccountId.mockImplementation(
        (account) => {
          if (account.address === mockAccount3.address) {
            return null; // Conversion fails for Account3
          }
          return `eip155:1:${account.address}`;
        },
      );

      mockEngineCall.mockImplementation((method: string, ...args) => {
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        if (method === 'RewardsController:getActualSubscriptionId') {
          const [caipAccountId] = args as [string];
          if (caipAccountId === `eip155:1:${mockAccount1.address}`) {
            return activeSubscriptionId; // Account1 matches
          }
          return 'different-subscription-id';
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Trigger fetch
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();
      await waitForNextUpdate();

      // Assert - should only return Account1 since Account3 conversion failed
      expect(result.current.linkedAccounts).toHaveLength(1);
      expect(result.current.linkedAccounts[0]).toMatchObject({
        ...mockAccount1,
        hasOptedIn: true,
      });

      // Should only call getActualSubscriptionId for Account1
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getActualSubscriptionId',
        `eip155:1:${mockAccount1.address}`,
      );
      expect(mockEngineCall).not.toHaveBeenCalledWith(
        'RewardsController:getActualSubscriptionId',
        `eip155:1:${mockAccount3.address}`,
      );
    });

    it('should handle errors from getActualSubscriptionId calls', async () => {
      // Arrange
      const activeSubscriptionId = 'active-subscription-id';

      let selectorCallCount = 0;
      mockUseSelector.mockReset().mockImplementation(() => {
        selectorCallCount++;
        if (selectorCallCount % 3 === 1) return mockAccounts; // selectInternalAccounts
        if (selectorCallCount % 3 === 2) return mockAccount1; // selectSelectedInternalAccount
        if (selectorCallCount % 3 === 0) return activeSubscriptionId; // selectRewardsActiveAccountSubscriptionId
        return null;
      });

      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
        sids: ['sub_123', null, 'sub_456'], // Account1 and Account3 opted in
      };

      mockEngineCall.mockImplementation((method: string, ...args) => {
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return Promise.resolve(mockResponse);
        }
        if (method === 'RewardsController:getActualSubscriptionId') {
          const [caipAccountId] = args as [string];
          if (caipAccountId === `eip155:1:${mockAccount1.address}`) {
            return activeSubscriptionId; // Account1 matches
          }
          if (caipAccountId === `eip155:1:${mockAccount3.address}`) {
            throw new Error('Failed to get actual subscription ID'); // Account3 throws error
          }
          return 'different-subscription-id';
        }
        return Promise.resolve();
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Trigger fetch
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();
      await waitForNextUpdate();

      // Assert - should only return Account1 since Account3 threw an error
      expect(result.current.linkedAccounts).toHaveLength(1);
      expect(result.current.linkedAccounts[0]).toMatchObject({
        ...mockAccount1,
        hasOptedIn: true,
      });

      // Should call getActualSubscriptionId for both accounts
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getActualSubscriptionId',
        `eip155:1:${mockAccount1.address}`,
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getActualSubscriptionId',
        `eip155:1:${mockAccount3.address}`,
      );
    });
  });
});
