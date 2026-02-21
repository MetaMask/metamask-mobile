import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useDropCommittedAddress } from './useDropCommittedAddress';
import Engine from '../../../../core/Engine';
import { RECENT_COMMIT_VALIDITY_WINDOW_MS } from '../../../../reducers/rewards';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

describe('useDropCommittedAddress', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;

  const mockSubscriptionId = 'sub-123';
  const mockDropId = 'drop-456';
  const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';

  const mockAccountGroups = [
    {
      metadata: { name: 'Account 1' },
      accounts: [
        {
          address: mockAddress,
          id: 'acc-1',
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return loading state initially when dropId and subscriptionId exist', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSubscriptionId)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockAccountGroups);

      const { result } = renderHook(() => useDropCommittedAddress(mockDropId));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.committedAddress).toBeNull();
      expect(result.current.accountGroupInfo).toBeNull();
    });

    it('should not load when dropId is missing', () => {
      mockUseSelector
        .mockReturnValueOnce(mockSubscriptionId)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockAccountGroups);

      const { result } = renderHook(() => useDropCommittedAddress(undefined));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.committedAddress).toBeNull();
    });
  });

  describe('fetchCommittedAddress', () => {
    it('should successfully fetch committed address', async () => {
      let callIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [mockSubscriptionId, null, mockAccountGroups];
        return values[callIndex++ % values.length];
      });

      mockEngineCall.mockResolvedValueOnce(mockAddress);

      const { result, waitForNextUpdate } = renderHook(() =>
        useDropCommittedAddress(mockDropId),
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getDropCommittedAddress',
        mockDropId,
        mockSubscriptionId,
      );
      expect(result.current.committedAddress).toBe(mockAddress);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fetch error gracefully', async () => {
      let callIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [mockSubscriptionId, null, mockAccountGroups];
        return values[callIndex++ % values.length];
      });

      mockEngineCall.mockRejectedValueOnce(new Error('Network error'));

      const { result, waitForNextUpdate } = renderHook(() =>
        useDropCommittedAddress(mockDropId),
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.committedAddress).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should skip fetch when subscriptionId is missing', async () => {
      let callIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [null, null, mockAccountGroups]; // subscriptionId is null
        return values[callIndex++ % values.length];
      });

      const { result } = renderHook(() => useDropCommittedAddress(mockDropId));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.committedAddress).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('recent address commit handling', () => {
    it('should prefer recent commit address within validity window', async () => {
      const recentAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
      const recentCommit = {
        address: recentAddress,
        committedAt: Date.now() - 1000,
      };

      let callIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [mockSubscriptionId, recentCommit, mockAccountGroups];
        return values[callIndex++ % values.length];
      });

      mockEngineCall.mockResolvedValueOnce(mockAddress);

      const { result, waitForNextUpdate } = renderHook(() =>
        useDropCommittedAddress(mockDropId),
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.committedAddress).toBe(recentAddress);
    });

    it('should fall back to fetched address when recent commit is expired', async () => {
      const recentCommit = {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        committedAt: Date.now() - RECENT_COMMIT_VALIDITY_WINDOW_MS - 1000,
      };

      let callIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [mockSubscriptionId, recentCommit, mockAccountGroups];
        return values[callIndex++ % values.length];
      });

      mockEngineCall.mockResolvedValueOnce(mockAddress);

      const { result, waitForNextUpdate } = renderHook(() =>
        useDropCommittedAddress(mockDropId),
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.committedAddress).toBe(mockAddress);
    });
  });

  describe('account group resolution', () => {
    it('should resolve account group info when address matches', async () => {
      let callIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [mockSubscriptionId, null, mockAccountGroups];
        return values[callIndex++ % values.length];
      });

      mockEngineCall.mockResolvedValueOnce(mockAddress);

      const { result, waitForNextUpdate } = renderHook(() =>
        useDropCommittedAddress(mockDropId),
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.accountGroupInfo).toEqual({
        name: 'Account 1',
        evmAddress: mockAddress,
      });
    });

    it('should handle case-insensitive address matching', async () => {
      let callIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [mockSubscriptionId, null, mockAccountGroups];
        return values[callIndex++ % values.length];
      });

      const upperAddress = mockAddress.toUpperCase();
      mockEngineCall.mockResolvedValueOnce(upperAddress);

      const { result, waitForNextUpdate } = renderHook(() =>
        useDropCommittedAddress(mockDropId),
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.accountGroupInfo).toEqual({
        name: 'Account 1',
        evmAddress: mockAddress,
      });
    });

    it('should return null when address does not match any account', async () => {
      let callIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [mockSubscriptionId, null, mockAccountGroups];
        return values[callIndex++ % values.length];
      });

      const unknownAddress = '0xunknown000000000000000000000000000000000';
      mockEngineCall.mockResolvedValueOnce(unknownAddress);

      const { result, waitForNextUpdate } = renderHook(() =>
        useDropCommittedAddress(mockDropId),
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.committedAddress).toBe(unknownAddress);
      expect(result.current.accountGroupInfo).toBeNull();
    });

    it('should prefer EVM address for avatar', async () => {
      const solanaAddress = 'SomeBase58SolanaAddress';
      const evmAddress = '0xevm1234567890abcdef1234567890abcdef1234';

      const mixedAccountGroup = [
        {
          metadata: { name: 'Multi-chain Account' },
          accounts: [
            { address: solanaAddress, id: 'acc-sol' },
            { address: evmAddress, id: 'acc-evm' },
          ],
        },
      ];

      let callIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [mockSubscriptionId, null, mixedAccountGroup];
        return values[callIndex++ % values.length];
      });

      mockEngineCall.mockResolvedValueOnce(solanaAddress);

      const { result, waitForNextUpdate } = renderHook(() =>
        useDropCommittedAddress(mockDropId),
      );

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.accountGroupInfo).toEqual({
        name: 'Multi-chain Account',
        evmAddress,
      });
    });
  });
});
