import { act, renderHook } from '@testing-library/react-hooks';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  last7DaysUtcWindow,
  useLast7DaysEarnings,
} from './useLast7DaysEarnings';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

const PROFILE_A = 'profile-a';

const mockSummary = {
  lifetime_total: '2000000',
  window: { from: '2026-09-22', to: '2026-09-28' },
  pending: '0',
  claimed: '0',
  forfeited: '0',
  minimum_musd_base_units: '1000000',
  self_earned: {
    lifetime: '0',
    pending: '0',
    claimed: '0',
    forfeited: '0',
    by_claim_family: {},
  },
  earned_by_others: {
    lifetime: '2000000',
    pending: '0',
    claimed: '0',
    forfeited: '0',
    by_claim_family: {},
  },
} as EarningsSummaryDto;

describe('last7DaysUtcWindow', () => {
  it('is the seven UTC dates ending today', () => {
    expect(last7DaysUtcWindow(new Date('2026-09-28T15:00:00.000Z'))).toEqual({
      from: '2026-09-22',
      to: '2026-09-28',
    });
  });

  it('crosses a month boundary in UTC', () => {
    expect(last7DaysUtcWindow(new Date('2026-03-02T01:00:00.000Z'))).toEqual({
      from: '2026-02-24',
      to: '2026-03-02',
    });
  });
});

describe('useLast7DaysEarnings', () => {
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;
  const flushPromises = () => new Promise(process.nextTick);
  let focusEffect: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    focusEffect = undefined;
    mockUseFocusEffect.mockImplementation((effect) => {
      focusEffect = effect;
    });
    mockEngineCall.mockResolvedValue(mockSummary);
  });

  it('fetches a windowed summary with claimability off and keeps it out of Redux', async () => {
    const { result } = renderHook(() => useLast7DaysEarnings(PROFILE_A));
    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      expect.objectContaining({
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        includeClaimable: false,
      }),
    );
    expect(result.current.data).toEqual(mockSummary);
    expect(result.current.error).toBe(false);
  });

  it('keeps the previous total when a refresh fails', async () => {
    const { result } = renderHook(() => useLast7DaysEarnings(PROFILE_A));
    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    mockEngineCall.mockRejectedValueOnce(new Error('down'));
    await act(async () => {
      result.current.retry();
      await flushPromises();
    });

    expect(result.current.data).toEqual(mockSummary);
    expect(result.current.error).toBe(true);
    expect(mockEngineCall).toHaveBeenLastCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      expect.objectContaining({ forceFresh: true, includeClaimable: false }),
    );
  });

  it('skips a second fetch while one is still in flight', async () => {
    let resolveInFlight: (value: typeof mockSummary) => void = () => undefined;
    mockEngineCall.mockReturnValue(
      new Promise((resolve) => {
        resolveInFlight = resolve;
      }),
    );

    const { result } = renderHook(() => useLast7DaysEarnings(PROFILE_A));
    await act(async () => {
      focusEffect?.();
    });
    await act(async () => {
      result.current.retry();
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveInFlight(mockSummary);
      await flushPromises();
    });

    mockEngineCall.mockResolvedValue(mockSummary);
    await act(async () => {
      result.current.retry();
      await flushPromises();
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(2);
  });
});
