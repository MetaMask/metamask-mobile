import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useRewardOptinSummary } from './useRewardOptinSummary';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { OptInStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

describe('useRewardOptinSummary', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockLoggerLog = Logger.log as jest.MockedFunction<typeof Logger.log>;

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
      .mockReturnValueOnce(mockAccount1); // selectSelectedInternalAccount
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

      // Assert
      expect(result.current.linkedAccounts).toEqual([]);
      expect(result.current.unlinkedAccounts).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasError).toBe(false);
      expect(result.current.currentAccountOptedIn).toBeNull();
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('successful data fetching', () => {
    it('should fetch opt-in status and categorize accounts correctly', async () => {
      // Arrange - Account1 and Account3 opted in, Account2 not opted in
      const mockResponse: OptInStatusDto = {
        ois: [true, false, true], // Account1: true, Account2: false, Account3: true
      };
      mockEngineCall.mockResolvedValueOnce(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      // Wait for the effect to complete
      await waitForNextUpdate();

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.currentAccountOptedIn).toBe(true); // Account1 is selected and opted in

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
      };
      mockEngineCall.mockResolvedValueOnce(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      // Assert
      expect(result.current.linkedAccounts).toHaveLength(0);
      expect(result.current.unlinkedAccounts).toHaveLength(3);
      expect(result.current.currentAccountOptedIn).toBe(false);
    });

    it('should handle all accounts opted in', async () => {
      // Arrange
      const mockResponse: OptInStatusDto = {
        ois: [true, true, true],
      };
      mockEngineCall.mockResolvedValueOnce(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      // Assert
      expect(result.current.linkedAccounts).toHaveLength(3);
      expect(result.current.unlinkedAccounts).toHaveLength(0);
      expect(result.current.currentAccountOptedIn).toBe(true);
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
      };
      mockEngineCall.mockResolvedValueOnce(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      // Assert
      expect(result.current.currentAccountOptedIn).toBe(false); // Should default to false
    });
  });

  describe('error handling', () => {
    it('should handle API errors and set error state', async () => {
      // Arrange
      const mockError = new Error('Network error');
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(true);
      expect(result.current.linkedAccounts).toEqual([]);
      expect(result.current.unlinkedAccounts).toEqual([]);
      expect(result.current.currentAccountOptedIn).toBeNull();

      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useRewardOptinSummary: Failed to fetch opt-in status',
        mockError,
      );
    });
  });

  describe('enabled/disabled functionality', () => {
    it('should not fetch data when disabled', () => {
      renderHook(() => useRewardOptinSummary({ enabled: false }));

      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should not refetch when enabled changes from true to false', async () => {
      // Arrange
      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
      };
      mockEngineCall.mockResolvedValueOnce(mockResponse);

      const { rerender, waitForNextUpdate } = renderHook(
        ({ enabled }) => useRewardOptinSummary({ enabled }),
        {
          initialProps: { enabled: true },
        },
      );

      await waitForNextUpdate();

      // Assert initial call
      expect(mockEngineCall).toHaveBeenCalledTimes(1);

      // Act - disable
      rerender({ enabled: false });

      // Assert - no additional calls
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('account changes', () => {
    it('should refetch data when accounts change', async () => {
      // Arrange - initial call
      const initialResponse: OptInStatusDto = {
        ois: [true, false, true],
      };
      mockEngineCall.mockResolvedValueOnce(initialResponse);

      const { rerender, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      expect(mockEngineCall).toHaveBeenCalledTimes(1);

      // Arrange - accounts change
      const newAccounts = [mockAccount1, mockAccount2]; // Remove account3
      const newResponse: OptInStatusDto = {
        ois: [true, false],
      };

      mockUseSelector
        .mockReset()
        .mockReturnValueOnce(newAccounts) // selectInternalAccounts
        .mockReturnValueOnce(mockAccount1); // selectSelectedInternalAccount

      mockEngineCall.mockResolvedValueOnce(newResponse);

      // Act - rerender to trigger useEffect
      rerender();
      await waitForNextUpdate();

      // Assert - should call API again with new accounts
      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(mockEngineCall).toHaveBeenLastCalledWith(
        'RewardsController:getOptInStatus',
        {
          addresses: ['0x123456789abcdef', '0xabcdef123456789'],
        },
      );
    });
  });

  describe('memoization', () => {
    it('should memoize linked/unlinked separation', async () => {
      // Arrange
      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
      };
      mockEngineCall.mockResolvedValueOnce(mockResponse);

      const { result, rerender, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

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
    it('should handle empty accounts array', () => {
      // Arrange
      mockUseSelector
        .mockReset()
        .mockReturnValueOnce([]) // selectInternalAccounts - empty
        .mockReturnValueOnce(null); // selectSelectedInternalAccount

      const { result } = renderHook(() => useRewardOptinSummary());

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.linkedAccounts).toEqual([]);
      expect(result.current.unlinkedAccounts).toEqual([]);
      expect(result.current.currentAccountOptedIn).toBeNull();
      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should handle null internal accounts selector', () => {
      // Arrange
      mockUseSelector
        .mockReset()
        .mockReturnValueOnce(null) // selectInternalAccounts - null
        .mockReturnValueOnce(null); // selectSelectedInternalAccount

      const { result } = renderHook(() => useRewardOptinSummary());

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.linkedAccounts).toEqual([]);
      expect(result.current.unlinkedAccounts).toEqual([]);
      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should handle single account', async () => {
      // Arrange
      const singleAccount = [mockAccount1];
      mockUseSelector
        .mockReset()
        .mockReturnValueOnce(singleAccount) // selectInternalAccounts
        .mockReturnValueOnce(mockAccount1); // selectSelectedInternalAccount

      const mockResponse: OptInStatusDto = {
        ois: [true],
      };
      mockEngineCall.mockResolvedValueOnce(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      // Assert
      expect(result.current.linkedAccounts).toHaveLength(1);
      expect(result.current.unlinkedAccounts).toHaveLength(0);
      expect(result.current.currentAccountOptedIn).toBe(true);
    });

    it('should handle no selected account', async () => {
      // Arrange
      mockUseSelector
        .mockReset()
        .mockReturnValueOnce(mockAccounts) // selectInternalAccounts
        .mockReturnValueOnce(null); // selectSelectedInternalAccount - null

      const mockResponse: OptInStatusDto = {
        ois: [true, false, true],
      };
      mockEngineCall.mockResolvedValueOnce(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() =>
        useRewardOptinSummary(),
      );

      await waitForNextUpdate();

      // Assert
      expect(result.current.currentAccountOptedIn).toBe(false); // Should default to false
    });
  });
});
