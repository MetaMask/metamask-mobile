import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useGetMoneyAccountSweepstakesDrawProof } from './useGetMoneyAccountSweepstakesDrawProof';
import {
  setMoneyAccountSweepstakesDrawProof,
  setMoneyAccountSweepstakesDrawProofLoading,
  setMoneyAccountSweepstakesDrawProofError,
  initialState,
  type RewardsState,
} from '../../../../reducers/rewards';
import type { RootState } from '../../../../reducers';
import type { MoneyAccountSweepstakesDrawProofDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

const mockCall = jest.mocked(Engine.controllerMessenger.call);
const mockUseSelector = jest.mocked(useSelector);
const mockUseDispatch = jest.mocked(useDispatch);

const CAMPAIGN_ID = 'mas-campaign-1';
const MOCK_DRAW_PROOF: MoneyAccountSweepstakesDrawProofDto = {
  explanation: {
    merkleRoot: '0xabc',
    formula: 'hash(seed)',
    entryCount: 100,
    winnerCount: 3,
    reserveCount: 2,
  },
  originalDraw: [],
  finalWinners: [],
  adjustmentTrail: [],
};

function setupSelectors(rewardsOverrides: Partial<RewardsState>) {
  const mockRootState = {
    rewards: { ...initialState, ...rewardsOverrides },
  } as RootState;
  mockUseSelector.mockImplementation((selector) => selector(mockRootState));
}

function createDrawProofCache(
  campaignId: string,
  overrides: {
    data?: MoneyAccountSweepstakesDrawProofDto | null;
    loading?: boolean;
    error?: boolean;
  } = {},
): Partial<RewardsState> {
  return {
    moneyAccountSweepstakesDrawProofs: {
      [campaignId]: {
        data: overrides.data ?? null,
        loading: overrides.loading ?? false,
        error: overrides.error ?? false,
      },
    },
  };
}

describe('useGetMoneyAccountSweepstakesDrawProof', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors(createDrawProofCache(CAMPAIGN_ID));
  });

  it('does not fetch when campaignId is undefined', () => {
    renderHook(() => useGetMoneyAccountSweepstakesDrawProof(undefined));

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('does not fetch when the hook is disabled', () => {
    renderHook(() =>
      useGetMoneyAccountSweepstakesDrawProof(CAMPAIGN_ID, false),
    );

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches the draw proof and dispatches the success action', async () => {
    mockCall.mockResolvedValueOnce(MOCK_DRAW_PROOF as never);

    renderHook(() => useGetMoneyAccountSweepstakesDrawProof(CAMPAIGN_ID, true));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getMoneyAccountSweepstakesDrawProof',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setMoneyAccountSweepstakesDrawProof({
        campaignId: CAMPAIGN_ID,
        drawProof: MOCK_DRAW_PROOF,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setMoneyAccountSweepstakesDrawProofLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('dispatches the error action when the request fails', async () => {
    mockCall.mockRejectedValueOnce(new Error('network') as never);

    renderHook(() => useGetMoneyAccountSweepstakesDrawProof(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setMoneyAccountSweepstakesDrawProofError({
        campaignId: CAMPAIGN_ID,
        error: true,
      }),
    );
  });

  it('returns cached state and refetches on demand', async () => {
    setupSelectors(
      createDrawProofCache(CAMPAIGN_ID, {
        data: MOCK_DRAW_PROOF,
        loading: true,
        error: true,
      }),
    );
    mockCall.mockResolvedValue(MOCK_DRAW_PROOF as never);

    const { result } = renderHook(() =>
      useGetMoneyAccountSweepstakesDrawProof(CAMPAIGN_ID),
    );

    expect(result.current.drawProof).toEqual(MOCK_DRAW_PROOF);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(true);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
  });
});
