import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useGetOndoCampaignDeposits } from './useGetOndoCampaignDeposits';
import Engine from '../../../../core/Engine';
import {
  setOndoCampaignDeposits,
  setOndoCampaignDepositsLoading,
  setOndoCampaignDepositsError,
  initialState,
  type RewardsState,
} from '../../../../reducers/rewards';
import type { RootState } from '../../../../reducers';
import type { OndoGmCampaignDepositsDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../reducers/rewards', () => {
  const actual = jest.requireActual('../../../../reducers/rewards');
  return {
    ...actual,
    setOndoCampaignDeposits: jest.fn((payload) => ({
      type: 'rewards/setOndoCampaignDeposits',
      payload,
    })),
    setOndoCampaignDepositsLoading: jest.fn((payload) => ({
      type: 'rewards/setOndoCampaignDepositsLoading',
      payload,
    })),
    setOndoCampaignDepositsError: jest.fn((payload) => ({
      type: 'rewards/setOndoCampaignDepositsError',
      payload,
    })),
  };
});

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

const CAMPAIGN_ID = 'campaign-123';
const MOCK_DEPOSITS: OndoGmCampaignDepositsDto = {
  totalUsdDeposited: '1250000.000000',
};

function setupSelectors(rewardsOverrides: Partial<RewardsState>) {
  const mockRootState = {
    rewards: { ...initialState, ...rewardsOverrides },
  } as RootState;
  mockUseSelector.mockImplementation((selector) => selector(mockRootState));
}

function createDepositsCache(
  campaignId: string,
  overrides: {
    data?: OndoGmCampaignDepositsDto | null;
    loading?: boolean;
    error?: boolean;
  } = {},
): Partial<RewardsState> {
  return {
    ondoCampaignDeposits: {
      [campaignId]: {
        data: overrides.data ?? null,
        loading: overrides.loading ?? false,
        error: overrides.error ?? false,
      },
    },
  };
}

describe('useGetOndoCampaignDeposits', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors(createDepositsCache(CAMPAIGN_ID));
  });

  it('does not fetch when campaignId is undefined', async () => {
    renderHook(() => useGetOndoCampaignDeposits(undefined));

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches deposits and dispatches actions on success', async () => {
    mockCall.mockResolvedValueOnce(MOCK_DEPOSITS as never);

    renderHook(() => useGetOndoCampaignDeposits(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsError({ campaignId: CAMPAIGN_ID, error: false }),
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getOndoCampaignDeposits',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDeposits({
        campaignId: CAMPAIGN_ID,
        deposits: MOCK_DEPOSITS,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('dispatches error action on fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    renderHook(() => useGetOndoCampaignDeposits(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsError({ campaignId: CAMPAIGN_ID, error: true }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('returns deposits data from selector', () => {
    setupSelectors(createDepositsCache(CAMPAIGN_ID, { data: MOCK_DEPOSITS }));

    const { result } = renderHook(() =>
      useGetOndoCampaignDeposits(CAMPAIGN_ID),
    );

    expect(result.current.deposits).toEqual(MOCK_DEPOSITS);
  });

  it('returns loading state from selector', () => {
    setupSelectors(createDepositsCache(CAMPAIGN_ID, { loading: true }));

    const { result } = renderHook(() =>
      useGetOndoCampaignDeposits(CAMPAIGN_ID),
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state from selector', () => {
    setupSelectors(createDepositsCache(CAMPAIGN_ID, { error: true }));

    const { result } = renderHook(() =>
      useGetOndoCampaignDeposits(CAMPAIGN_ID),
    );

    expect(result.current.hasError).toBe(true);
  });

  it('refetch function re-fetches deposits', async () => {
    mockCall.mockResolvedValue(MOCK_DEPOSITS as never);

    const { result } = renderHook(() =>
      useGetOndoCampaignDeposits(CAMPAIGN_ID),
    );

    await act(async () => {
      await Promise.resolve();
    });

    mockDispatch.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
  });
});
