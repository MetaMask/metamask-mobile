import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useGetOndoCampaignDeposits } from './useGetOndoCampaignDeposits';
import Engine from '../../../../core/Engine';
import {
  selectOndoCampaignDeposits,
  selectOndoCampaignDepositsLoading,
  selectOndoCampaignDepositsError,
} from '../../../../reducers/rewards/selectors';
import {
  setOndoCampaignDeposits,
  setOndoCampaignDepositsLoading,
  setOndoCampaignDepositsError,
} from '../../../../reducers/rewards';
import type { OndoGmCampaignDepositsDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectOndoCampaignDeposits: jest.fn(),
  selectOndoCampaignDepositsLoading: jest.fn(),
  selectOndoCampaignDepositsError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
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
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

const CAMPAIGN_ID = 'campaign-123';
const MOCK_DEPOSITS: OndoGmCampaignDepositsDto = {
  totalUsdDeposited: '1250000.000000',
};

interface SelectorState {
  deposits: OndoGmCampaignDepositsDto | null;
  isLoading: boolean;
  hasError: boolean;
}

function setupSelectors(state: SelectorState) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectOndoCampaignDeposits) return state.deposits;
    if (selector === selectOndoCampaignDepositsLoading) return state.isLoading;
    if (selector === selectOndoCampaignDepositsError) return state.hasError;
    return undefined;
  });
}

describe('useGetOndoCampaignDeposits', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({
      deposits: null,
      isLoading: false,
      hasError: false,
    });
  });

  it('does not fetch when campaignId is undefined but resets loading and error', async () => {
    renderHook(() => useGetOndoCampaignDeposits(undefined));

    expect(mockCall).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsLoading(false),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsError(false),
    );
  });

  it('fetches deposits and dispatches actions on success', async () => {
    mockCall.mockResolvedValueOnce(MOCK_DEPOSITS as never);

    renderHook(() => useGetOndoCampaignDeposits(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsLoading(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsError(false),
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getOndoCampaignDeposits',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDeposits(MOCK_DEPOSITS),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsLoading(false),
    );
  });

  it('dispatches error action on fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    renderHook(() => useGetOndoCampaignDeposits(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsError(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignDepositsLoading(false),
    );
  });

  it('returns deposits data from selector', () => {
    setupSelectors({
      deposits: MOCK_DEPOSITS,
      isLoading: false,
      hasError: false,
    });

    const { result } = renderHook(() =>
      useGetOndoCampaignDeposits(CAMPAIGN_ID),
    );

    expect(result.current.deposits).toEqual(MOCK_DEPOSITS);
  });

  it('returns loading state from selector', () => {
    setupSelectors({
      deposits: null,
      isLoading: true,
      hasError: false,
    });

    const { result } = renderHook(() =>
      useGetOndoCampaignDeposits(CAMPAIGN_ID),
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state from selector', () => {
    setupSelectors({
      deposits: null,
      isLoading: false,
      hasError: true,
    });

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
      setOndoCampaignDepositsLoading(true),
    );
  });
});
