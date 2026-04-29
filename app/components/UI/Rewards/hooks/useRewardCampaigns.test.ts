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
  selectCampaignsHasLoaded,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import {
  type CampaignDto,
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
  selectCampaignsHasLoaded: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

jest.mock('../components/Campaigns/CampaignTile.utils', () => ({
  getCampaignStatus: jest.fn(
    (campaign: { startDate: string; endDate: string }) => {
      const now = new Date();
      const startDate = new Date(campaign.startDate);
      const endDate = new Date(campaign.endDate);
      if (now < startDate) return 'upcoming';
      if (now >= startDate && now < endDate) return 'active';
      return 'complete';
    },
  ),
}));

const createTestCampaign = (
  overrides: Partial<CampaignDto> = {},
): CampaignDto => ({
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'ONDO Holding Campaign',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2027-01-01T00:00:00.000Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
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
      hasLoaded?: boolean;
    } = {},
  ) => {
    const {
      subscriptionId = 'subscription-1',
      campaigns = [],
      isLoading = false,
      hasError = false,
      hasLoaded = true,
    } = options;

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return subscriptionId;
      if (selector === selectCampaigns) return campaigns;
      if (selector === selectCampaignsLoading) return isLoading;
      if (selector === selectCampaignsError) return hasError;
      if (selector === selectCampaignsHasLoaded) return hasLoaded;
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
      expect(result.current.hasLoaded).toBe(true);
      expect(typeof result.current.fetchCampaigns).toBe('function');
    });

    it('returns hasLoaded as false when campaigns have never been loaded', () => {
      setupSelectorMocks({ hasLoaded: false });

      const { result } = renderHook(() => useRewardCampaigns());

      expect(result.current.hasLoaded).toBe(false);
    });

    it('returns empty array when campaigns selector returns undefined', () => {
      setupSelectorMocks({ campaigns: undefined as unknown as CampaignDto[] });
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectCampaigns) return undefined;
        if (selector === selectRewardsSubscriptionId) return 'subscription-1';
        if (selector === selectCampaignsLoading) return false;
        if (selector === selectCampaignsError) return false;
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

    it('dispatches setCampaignsLoading(true) when campaigns have not been loaded before', async () => {
      setupSelectorMocks({ hasLoaded: false });
      mockEngineCall.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useRewardCampaigns());

      await act(async () => {
        await result.current.fetchCampaigns();
      });

      expect(mockSetCampaignsLoading).toHaveBeenCalledWith(true);
    });

    it('does not dispatch setCampaignsLoading(true) when campaigns were already loaded', async () => {
      setupSelectorMocks({ hasLoaded: true });
      mockEngineCall.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useRewardCampaigns());

      await act(async () => {
        await result.current.fetchCampaigns();
      });

      expect(mockSetCampaignsLoading).not.toHaveBeenCalledWith(true);
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

  describe('categorizedCampaigns', () => {
    it('categorizes campaigns into active, upcoming, and previous', () => {
      const activeCampaign = createTestCampaign({
        id: 'active-1',
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: '2099-12-31T23:59:59.999Z',
      });
      const upcomingCampaign = createTestCampaign({
        id: 'upcoming-1',
        startDate: '2099-06-01T00:00:00.000Z',
        endDate: '2099-12-31T23:59:59.999Z',
      });
      const completeCampaign = createTestCampaign({
        id: 'complete-1',
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: '2020-12-31T23:59:59.999Z',
      });

      setupSelectorMocks({
        campaigns: [activeCampaign, upcomingCampaign, completeCampaign],
      });

      const { result } = renderHook(() => useRewardCampaigns());

      expect(result.current.categorizedCampaigns.active).toEqual([
        activeCampaign,
      ]);
      expect(result.current.categorizedCampaigns.upcoming).toEqual([
        upcomingCampaign,
      ]);
      expect(result.current.categorizedCampaigns.previous).toEqual([
        completeCampaign,
      ]);
    });

    it('returns empty categories when no campaigns', () => {
      setupSelectorMocks({ campaigns: [] });

      const { result } = renderHook(() => useRewardCampaigns());

      expect(result.current.categorizedCampaigns).toEqual({
        active: [],
        upcoming: [],
        previous: [],
      });
    });

    it('preserves API order for active campaigns', () => {
      const activeFirst = createTestCampaign({
        id: 'active-1',
        startDate: '2022-06-01T00:00:00.000Z',
        endDate: '2099-12-31T23:59:59.999Z',
      });
      const activeSecond = createTestCampaign({
        id: 'active-2',
        startDate: '2021-01-01T00:00:00.000Z',
        endDate: '2099-12-31T23:59:59.999Z',
      });

      setupSelectorMocks({
        campaigns: [activeFirst, activeSecond],
      });

      const { result } = renderHook(() => useRewardCampaigns());

      expect(result.current.categorizedCampaigns.active[0].id).toBe('active-1');
      expect(result.current.categorizedCampaigns.active[1].id).toBe('active-2');
    });

    it('preserves API order for upcoming campaigns', () => {
      const upcomingFirst = createTestCampaign({
        id: 'upcoming-1',
        startDate: '2099-09-01T00:00:00.000Z',
        endDate: '2099-12-31T23:59:59.999Z',
      });
      const upcomingSecond = createTestCampaign({
        id: 'upcoming-2',
        startDate: '2099-06-01T00:00:00.000Z',
        endDate: '2099-12-31T23:59:59.999Z',
      });

      setupSelectorMocks({
        campaigns: [upcomingFirst, upcomingSecond],
      });

      const { result } = renderHook(() => useRewardCampaigns());

      expect(result.current.categorizedCampaigns.upcoming[0].id).toBe(
        'upcoming-1',
      );
      expect(result.current.categorizedCampaigns.upcoming[1].id).toBe(
        'upcoming-2',
      );
    });

    it('preserves API order for previous campaigns', () => {
      const completeFirst = createTestCampaign({
        id: 'complete-1',
        startDate: '2020-07-01T00:00:00.000Z',
        endDate: '2020-12-31T23:59:59.999Z',
      });
      const completeSecond = createTestCampaign({
        id: 'complete-2',
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: '2020-06-30T23:59:59.999Z',
      });

      setupSelectorMocks({
        campaigns: [completeFirst, completeSecond],
      });

      const { result } = renderHook(() => useRewardCampaigns());

      expect(result.current.categorizedCampaigns.previous[0].id).toBe(
        'complete-1',
      );
      expect(result.current.categorizedCampaigns.previous[1].id).toBe(
        'complete-2',
      );
    });

    it('returns all campaigns', () => {
      const activeCampaign = createTestCampaign({
        id: 'active-1',
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: '2099-12-31T23:59:59.999Z',
      });
      const upcomingCampaign = createTestCampaign({
        id: 'upcoming-1',
        startDate: '2099-06-01T00:00:00.000Z',
        endDate: '2099-12-31T23:59:59.999Z',
      });
      const completeCampaign = createTestCampaign({
        id: 'complete-1',
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: '2020-12-31T23:59:59.999Z',
      });

      setupSelectorMocks({
        campaigns: [activeCampaign, upcomingCampaign, completeCampaign],
      });

      const { result } = renderHook(() => useRewardCampaigns());

      expect(result.current.campaigns).toEqual([
        activeCampaign,
        upcomingCampaign,
        completeCampaign,
      ]);
      expect(result.current.categorizedCampaigns.active).toEqual([
        activeCampaign,
      ]);
      expect(result.current.categorizedCampaigns.upcoming).toEqual([
        upcomingCampaign,
      ]);
      expect(result.current.categorizedCampaigns.previous).toEqual([
        completeCampaign,
      ]);
    });
  });
});
