import { renderHook } from '@testing-library/react-hooks';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  setEarningsSummary,
  setEarningsSummaryError,
  setEarningsSummaryLoading,
} from '../../../../reducers/rewardsMoney';
import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useEarningsSummary } from './useEarningsSummary';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

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
  lifetime_total: '41750000',
  window: null,
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
    lifetime: '41750000',
    pending: '0',
    claimed: '0',
    forfeited: '0',
    by_claim_family: {},
  },
} as EarningsSummaryDto;

describe('useEarningsSummary', () => {
  const mockDispatch = jest.fn();
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;

  // The focus effect does not return its promise (a returned value would be
  // treated as a cleanup), so drain the queue instead.
  const flushPromises = () => new Promise(process.nextTick);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseFocusEffect.mockImplementation((effect) => {
      effect();
    });
    mockEngineCall.mockResolvedValue(mockSummary);
  });

  it('fetches on focus and writes the summary under the profile it was asked for', async () => {
    renderHook(() => useEarningsSummary(PROFILE_A));
    await flushPromises();

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      { forceFresh: undefined },
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setEarningsSummary({ profileId: PROFILE_A, data: mockSummary }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setEarningsSummaryLoading({ profileId: PROFILE_A, loading: false }),
    );
  });

  it('asks for the whole summary, so both heroes read one cached response', async () => {
    renderHook(() => useEarningsSummary(PROFILE_A));
    await flushPromises();

    expect(mockEngineCall).toHaveBeenCalledTimes(1);
    expect(mockEngineCall.mock.calls[0][1]).not.toHaveProperty('originTypes');
  });

  it('does not call the controller without a profile id', async () => {
    renderHook(() => useEarningsSummary(undefined));
    await flushPromises();

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('records a failure as an error and settles loading', async () => {
    mockEngineCall.mockRejectedValue(new Error('network'));

    renderHook(() => useEarningsSummary(PROFILE_A));
    await flushPromises();

    expect(mockDispatch).toHaveBeenCalledWith(
      setEarningsSummaryError({ profileId: PROFILE_A, error: true }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setEarningsSummaryLoading({ profileId: PROFILE_A, loading: false }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setEarningsSummary({ profileId: PROFILE_A, data: mockSummary }),
    );
  });

  it('passes forceFresh through to the controller', async () => {
    const { result } = renderHook(() => useEarningsSummary(PROFILE_A));
    await flushPromises();
    mockEngineCall.mockClear();

    await result.current.fetchEarningsSummary({ forceFresh: true });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      { forceFresh: true },
    );
  });
});
