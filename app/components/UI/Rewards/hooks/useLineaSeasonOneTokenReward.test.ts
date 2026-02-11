import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useLineaSeasonOneTokenReward } from './useLineaSeasonOneTokenReward';
import Engine from '../../../../core/Engine';
import type { LineaTokenRewardDto } from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

describe('useLineaSeasonOneTokenReward', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;

  const mockSubscriptionId = 'test-subscription-id';
  const mockLineaTokenReward: LineaTokenRewardDto = {
    subscriptionId: mockSubscriptionId,
    amount: '1000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {
      // Suppress console.error in tests
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('returns correct structure with initial values', () => {
      mockUseSelector.mockReturnValue(null);
      mockEngineCall.mockResolvedValue(mockLineaTokenReward);

      const { result } = renderHook(() => useLineaSeasonOneTokenReward());

      expect(result.current).toEqual({
        lineaTokenReward: null,
        isLoading: false,
        error: false,
        refetch: expect.any(Function),
      });
      expect(typeof result.current.refetch).toBe('function');
    });

    it('fetches data on mount when subscriptionId is available', async () => {
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      mockEngineCall.mockResolvedValue(mockLineaTokenReward);

      const { result, waitForNextUpdate } = renderHook(() =>
        useLineaSeasonOneTokenReward(),
      );

      await waitForNextUpdate();

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSeasonOneLineaRewardTokens',
        mockSubscriptionId,
      );
      expect(result.current.lineaTokenReward).toEqual(mockLineaTokenReward);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });
  });

  describe('when subscriptionId is missing', () => {
    it('does not fetch when subscriptionId is null', async () => {
      mockUseSelector.mockReturnValue(null);

      const { result } = renderHook(() => useLineaSeasonOneTokenReward());

      // Wait for useEffect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.lineaTokenReward).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('does not fetch when subscriptionId is undefined', async () => {
      mockUseSelector.mockReturnValue(undefined);

      const { result } = renderHook(() => useLineaSeasonOneTokenReward());

      // Wait for useEffect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.lineaTokenReward).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });
  });

  describe('successful fetch', () => {
    it('fetches and sets lineaTokenReward successfully', async () => {
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      mockEngineCall.mockResolvedValue(mockLineaTokenReward);

      const { result, waitForNextUpdate } = renderHook(() =>
        useLineaSeasonOneTokenReward(),
      );

      await waitForNextUpdate();

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSeasonOneLineaRewardTokens',
        mockSubscriptionId,
      );
      expect(result.current.lineaTokenReward).toEqual(mockLineaTokenReward);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('handles null response from controller', async () => {
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      mockEngineCall.mockResolvedValue(null);

      const { result, waitForNextUpdate } = renderHook(() =>
        useLineaSeasonOneTokenReward(),
      );

      await waitForNextUpdate();

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSeasonOneLineaRewardTokens',
        mockSubscriptionId,
      );
      expect(result.current.lineaTokenReward).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });

    it('manages loading state correctly during fetch', async () => {
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      let resolvePromise: (value: LineaTokenRewardDto | null) => void;
      const promise = new Promise<LineaTokenRewardDto | null>((resolve) => {
        resolvePromise = resolve;
      });
      mockEngineCall.mockReturnValue(promise);

      const { result } = renderHook(() => useLineaSeasonOneTokenReward());

      // Check loading state while fetching
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Loading should be true during fetch
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(false);

      // Resolve the promise
      await act(async () => {
        resolvePromise(mockLineaTokenReward);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.lineaTokenReward).toEqual(mockLineaTokenReward);
    });
  });

  describe('error handling', () => {
    it('handles fetch error and sets error state', async () => {
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      const mockError = new Error('Network error');
      mockEngineCall.mockRejectedValue(mockError);

      const { result, waitForNextUpdate } = renderHook(() =>
        useLineaSeasonOneTokenReward(),
      );

      await waitForNextUpdate();

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSeasonOneLineaRewardTokens',
        mockSubscriptionId,
      );
      expect(result.current.error).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.lineaTokenReward).toBe(null);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching Linea token reward',
      );
    });

    it('sets loading to false even when error occurs', async () => {
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      const mockError = new Error('Network error');
      mockEngineCall.mockRejectedValue(mockError);

      const { result, waitForNextUpdate } = renderHook(() =>
        useLineaSeasonOneTokenReward(),
      );

      await waitForNextUpdate();

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(true);
    });
  });

  describe('refetch functionality', () => {
    it('refetch function triggers a new fetch', async () => {
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      mockEngineCall
        .mockResolvedValueOnce(mockLineaTokenReward)
        .mockResolvedValueOnce({
          ...mockLineaTokenReward,
          amount: '2000',
        });

      const { result, waitForNextUpdate } = renderHook(() =>
        useLineaSeasonOneTokenReward(),
      );

      await waitForNextUpdate();

      expect(result.current.lineaTokenReward?.amount).toBe('1000');

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(result.current.lineaTokenReward?.amount).toBe('2000');
    });

    it('refetch handles errors correctly', async () => {
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      mockEngineCall
        .mockResolvedValueOnce(mockLineaTokenReward)
        .mockRejectedValueOnce(new Error('Refetch error'));

      const { result, waitForNextUpdate } = renderHook(() =>
        useLineaSeasonOneTokenReward(),
      );

      await waitForNextUpdate();

      expect(result.current.error).toBe(false);

      // Call refetch with error
      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('refetch does nothing when subscriptionId is missing', async () => {
      mockUseSelector.mockReturnValue(null);

      const { result } = renderHook(() => useLineaSeasonOneTokenReward());

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.lineaTokenReward).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });
  });

  describe('subscriptionId changes', () => {
    it('refetches when subscriptionId changes from null to valid', async () => {
      mockUseSelector
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockSubscriptionId);
      mockEngineCall.mockResolvedValue(mockLineaTokenReward);

      const { result, rerender, waitForNextUpdate } = renderHook(() =>
        useLineaSeasonOneTokenReward(),
      );

      // Initial render with null subscriptionId
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockEngineCall).not.toHaveBeenCalled();

      // Rerender with valid subscriptionId
      rerender();

      await waitForNextUpdate();

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSeasonOneLineaRewardTokens',
        mockSubscriptionId,
      );
      expect(result.current.lineaTokenReward).toEqual(mockLineaTokenReward);
    });

    it('resets state when subscriptionId changes from valid to null', async () => {
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      mockEngineCall.mockResolvedValue(mockLineaTokenReward);

      const { result, waitForNextUpdate, rerender } = renderHook(() =>
        useLineaSeasonOneTokenReward(),
      );

      // Initial render with valid subscriptionId
      await waitForNextUpdate();

      expect(result.current.lineaTokenReward).toEqual(mockLineaTokenReward);

      // Change subscriptionId to null and rerender
      mockUseSelector.mockReturnValue(null);
      rerender();

      // Wait for useEffect to process the change
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.lineaTokenReward).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
    });
  });
});
