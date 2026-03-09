import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useRewardCampaigns } from './useRewardCampaigns';
import Engine from '../../../../core/Engine';
import {
  setCampaigns,
  setCampaignsLoading,
  setCampaignsError,
} from '../../../../reducers/rewards';
import {
  selectCampaigns,
  selectCampaignsLoading,
  selectCampaignsError,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import type {
  CampaignDto,
  CampaignType,
} from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../reducers/rewards', () => ({
  setCampaigns: jest.fn(),
  setCampaignsLoading: jest.fn(),
  setCampaignsError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaigns: jest.fn(),
  selectCampaignsLoading: jest.fn(),
  selectCampaignsError: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/rewards', () => ({
  selectCampaignsRewardsEnabledFlag: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

const createTestCampaign = (
  overrides: Partial<CampaignDto> = {},
): CampaignDto => ({
  id: 'campaign-1',
  type: 'ONDO_HOLDING' as CampaignType,
  name: 'ONDO Holding Campaign',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2027-01-01T00:00:00.000Z',
  termsAndConditions: null,
  excludedRegions: [],
  statusLabel: 'Active',
  ...overrides,
});

describe('useRewardCampaigns', () => {
  const mockDispatch = jest.fn();
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockUseInvalidateByRewardEvents =
    useInvalidateByRewardEvents as jest.MockedFunction<
      typeof useInvalidateByRewardEvents
    >;
  const mockSetCampaigns = setCampaigns as jest.MockedFunction<
    typeof setCampaigns
  >;
  const mockSetCampaignsLoading = setCampaignsLoading as jest.MockedFunction<
    typeof setCampaignsLoading
  >;
  const mockSetCampaignsError = setCampaignsError as jest.MockedFunction<
    typeof setCampaignsError
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockSetCampaigns.mockReturnValue({
      type: 'rewards/setCampaigns',
      payload: [],
    });
    mockSetCampaignsLoading.mockReturnValue({
      type: 'rewards/setCampaignsLoading',
      payload: false,
    });
    mockSetCampaignsError.mockReturnValue({
      type: 'rewards/setCampaignsError',
      payload: false,
    });
    mockUseFocusEffect.mockClear();
    mockUseInvalidateByRewardEvents.mockClear();
  });

  const setupSelectorMocks = (
    options: {
      subscriptionId?: string | null;
      campaigns?: CampaignDto[];
      isLoading?: boolean;
      hasError?: boolean;
      isCampaignsEnabled?: boolean;
    } = {},
  ) => {
    const {
      subscriptionId = 'subscription-1',
      campaigns = [],
      isLoading = false,
      hasError = false,
      isCampaignsEnabled = true,
    } = options;

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return subscriptionId;
      if (selector === selectCampaigns) return campaigns;
      if (selector === selectCampaignsLoading) return isLoading;
      if (selector === selectCampaignsError) return hasError;
      if (selector === selectCampaignsRewardsEnabledFlag)
        return isCampaignsEnabled;
      return undefined;
    });
  };

  describe('initial state', () => {
    it('returns initial state from selectors', () => {
      const testCampaigns = [createTestCampaign()];
      setupSelectorMocks({ campaigns: testCampaigns });

      const { result } = renderHook(() => useRewardCampaigns());

      expect(result.current.campaigns).toEqual(testCampaigns);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(typeof result.current.fetchCampaigns).toBe('function');
    });

    it('returns empty array when campaigns selector returns undefined', () => {
      setupSelectorMocks({ campaigns: undefined as unknown as CampaignDto[] });
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectCampaigns) return undefined;
        if (selector === selectRewardsSubscriptionId) return 'subscription-1';
        if (selector === selectCampaignsLoading) return false;
        if (selector === selectCampaignsError) return false;
        if (selector === selectCampaignsRewardsEnabledFlag) return true;
        return undefined;
      });

      const { result } = renderHook(() => useRewardCampaigns());

      expect(result.current.campaigns).toEqual([]);
    });
  });

  describe('fetchCampaigns', () => {
    it('calls Engine controller when fetching campaigns', async () => {
      setupSelectorMocks();
      const mockCampaignsData = [createTestCampaign()];
      mockEngineCall.mockResolvedValueOnce(mockCampaignsData);

      const { result } = renderHook(() => useRewardCampaigns());

      await act(async () => {
        await result.current.fetchCampaigns();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCampaigns',
        'subscription-1',
      );
    });

    it('dispatches loading state before fetch', async () => {
      setupSelectorMocks();
      mockEngineCall.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useRewardCampaigns());

      await act(async () => {
        await result.current.fetchCampaigns();
      });

      expect(mockDispatch).toHaveBeenCalledWith(mockSetCampaignsLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetCampaignsError(false));
    });

    it('dispatches campaigns on successful fetch', async () => {
      setupSelectorMocks();
      const mockCampaignsData = [createTestCampaign()];
      mockEngineCall.mockResolvedValueOnce(mockCampaignsData);

      const { result } = renderHook(() => useRewardCampaigns());

      await act(async () => {
        await result.current.fetchCampaigns();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        mockSetCampaigns(mockCampaignsData),
      );
      expect(mockDispatch).toHaveBeenCalledWith(mockSetCampaignsLoading(false));
    });

    it('dispatches error state on fetch failure', async () => {
      setupSelectorMocks();
      const mockError = new Error('Network failed');
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useRewardCampaigns());

      await act(async () => {
        await result.current.fetchCampaigns();
      });

      expect(mockDispatch).toHaveBeenCalledWith(mockSetCampaignsError(true));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetCampaignsLoading(false));
    });

    it('returns empty list and does not fetch when feature flag is disabled', async () => {
      setupSelectorMocks({ isCampaignsEnabled: false });

      const { result } = renderHook(() => useRewardCampaigns());

      await act(async () => {
        await result.current.fetchCampaigns();
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(mockSetCampaigns([]));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetCampaignsLoading(false));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetCampaignsError(false));
    });

    it('does not fetch when subscriptionId is null', async () => {
      setupSelectorMocks({ subscriptionId: null });

      const { result } = renderHook(() => useRewardCampaigns());

      await act(async () => {
        await result.current.fetchCampaigns();
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(mockSetCampaigns([]));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetCampaignsLoading(false));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetCampaignsError(false));
    });

    it('does not trigger concurrent fetches when already loading', async () => {
      setupSelectorMocks();
      let resolveFirstFetch: (value: CampaignDto[]) => void;
      const firstFetchPromise = new Promise<CampaignDto[]>((resolve) => {
        resolveFirstFetch = resolve;
      });
      mockEngineCall.mockReturnValueOnce(firstFetchPromise);

      const { result } = renderHook(() => useRewardCampaigns());

      // Start first fetch without awaiting
      act(() => {
        result.current.fetchCampaigns();
      });

      // Attempt concurrent fetch — should be skipped
      await act(async () => {
        await result.current.fetchCampaigns();
      });

      // Engine should only be called once
      expect(mockEngineCall).toHaveBeenCalledTimes(1);

      // Resolve the first fetch
      await act(async () => {
        resolveFirstFetch([]);
        await firstFetchPromise;
      });
    });
  });

  describe('useFocusEffect integration', () => {
    it('registers focus effect callback', () => {
      setupSelectorMocks();

      renderHook(() => useRewardCampaigns());

      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
    });

    it('fetches campaigns when focus effect is triggered', async () => {
      setupSelectorMocks();
      const mockCampaignsData = [createTestCampaign()];
      mockEngineCall.mockResolvedValueOnce(mockCampaignsData);

      renderHook(() => useRewardCampaigns());

      const focusCallback = mockUseFocusEffect.mock.calls[0][0];

      await act(async () => {
        focusCallback();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCampaigns',
        'subscription-1',
      );
    });
  });

  describe('useInvalidateByRewardEvents integration', () => {
    it('registers invalidation events', () => {
      setupSelectorMocks();

      renderHook(() => useRewardCampaigns());

      expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
        ['RewardsController:accountLinked', 'RewardsController:balanceUpdated'],
        expect.any(Function),
      );
    });

    it('passes fetchCampaigns as callback to invalidation hook', async () => {
      setupSelectorMocks();
      const mockCampaignsData = [createTestCampaign()];
      mockEngineCall.mockResolvedValueOnce(mockCampaignsData);

      renderHook(() => useRewardCampaigns());

      const invalidationCallback =
        mockUseInvalidateByRewardEvents.mock.calls[0][1];

      await act(async () => {
        await invalidationCallback();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCampaigns',
        'subscription-1',
      );
    });
  });
});
