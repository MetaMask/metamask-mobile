import { act, renderHook } from '@testing-library/react-hooks';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { VipRefereeMeState } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  setVipRefereeDashboard,
  setVipRefereeDashboardError,
  setVipRefereeDashboardLoading,
} from '../../../../reducers/rewards';
import {
  selectIsVipReferee,
  selectVipRefereeDashboard,
  selectVipRefereeDashboardError,
  selectVipRefereeDashboardLoading,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useVipRefereeDashboard } from './useVipRefereeDashboard';

const mockVipRefereeDashboardSelector = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectIsVipReferee: jest.fn(),
  selectVipRefereeDashboard: jest.fn(() => mockVipRefereeDashboardSelector),
  selectVipRefereeDashboardLoading: jest.fn(),
  selectVipRefereeDashboardError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setVipRefereeDashboard: jest.fn((payload) => ({
    type: 'setVipRefereeDashboard',
    payload,
  })),
  setVipRefereeDashboardError: jest.fn((payload) => ({
    type: 'setVipRefereeDashboardError',
    payload,
  })),
  setVipRefereeDashboardLoading: jest.fn((payload) => ({
    type: 'setVipRefereeDashboardLoading',
    payload,
  })),
}));

describe('useVipRefereeDashboard', () => {
  const mockDispatch = jest.fn();
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockSetVipRefereeDashboard =
    setVipRefereeDashboard as jest.MockedFunction<
      typeof setVipRefereeDashboard
    >;
  const mockSetVipRefereeDashboardError =
    setVipRefereeDashboardError as jest.MockedFunction<
      typeof setVipRefereeDashboardError
    >;
  const mockSetVipRefereeDashboardLoading =
    setVipRefereeDashboardLoading as jest.MockedFunction<
      typeof setVipRefereeDashboardLoading
    >;

  // Obviously-synthetic fixture — never real VIP codes/figures.
  const refereeDashboard: VipRefereeMeState = {
    referredByCode: 'TESTCODE',
    points: 1234,
    swapsVolume: 1000,
    perpsVolume: 2000,
    computedAt: '2099-06-30T14:52:00.000Z',
    lastFetched: 123,
  };

  const baseSelector = (selector: unknown) => {
    if (selector === selectRewardsSubscriptionId) return 'test-subscription-id';
    if (selector === selectIsVipReferee) return true;
    if (selector === mockVipRefereeDashboardSelector) return null;
    if (selector === selectVipRefereeDashboardLoading) return false;
    if (selector === selectVipRefereeDashboardError) return false;
    return undefined;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockImplementation(baseSelector);
  });

  it('fetches and stores the referee dashboard when the user is a referee', async () => {
    mockEngineCall.mockResolvedValue(refereeDashboard);

    const { result } = renderHook(() => useVipRefereeDashboard());

    await result.current.fetchVipRefereeDashboard();

    expect(selectVipRefereeDashboard).toHaveBeenCalledWith(
      'test-subscription-id',
    );
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getVipRefereeDashboard',
      'test-subscription-id',
    );
    expect(mockSetVipRefereeDashboardLoading).toHaveBeenCalledWith(true);
    expect(mockSetVipRefereeDashboard).toHaveBeenCalledWith({
      subscriptionId: 'test-subscription-id',
      dashboard: refereeDashboard,
    });
    expect(mockSetVipRefereeDashboardLoading).toHaveBeenCalledWith(false);
  });

  it('clears state and skips fetch when the user is not a referee', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsVipReferee) return false;
      return baseSelector(selector);
    });

    const { result } = renderHook(() => useVipRefereeDashboard());

    await result.current.fetchVipRefereeDashboard();

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockSetVipRefereeDashboard).toHaveBeenCalledWith({
      subscriptionId: 'test-subscription-id',
      dashboard: null,
    });
    expect(mockSetVipRefereeDashboardError).toHaveBeenCalledWith(false);
    expect(mockSetVipRefereeDashboardLoading).toHaveBeenCalledWith(false);
  });

  it('sets error state when fetching the referee dashboard fails', async () => {
    mockEngineCall.mockRejectedValue(new Error('referee fetch failed'));

    const { result } = renderHook(() => useVipRefereeDashboard());

    await result.current.fetchVipRefereeDashboard();

    expect(mockSetVipRefereeDashboardError).toHaveBeenCalledWith(true);
    expect(mockSetVipRefereeDashboardLoading).toHaveBeenCalledWith(false);
  });

  it('registers the focus refresh callback that refetches', async () => {
    mockEngineCall.mockResolvedValue(refereeDashboard);

    renderHook(() => useVipRefereeDashboard());

    const focusCallback = (useFocusEffect as jest.Mock).mock.calls.at(-1)?.[0];
    expect(focusCallback).toBeInstanceOf(Function);

    await act(async () => {
      await focusCallback();
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getVipRefereeDashboard',
      'test-subscription-id',
    );
  });

  it('flips hasAttemptedFetch=true once a fetch resolves', async () => {
    mockEngineCall.mockResolvedValue(refereeDashboard);

    const { result } = renderHook(() => useVipRefereeDashboard());

    expect(result.current.hasAttemptedFetch).toBe(false);

    await act(async () => {
      await result.current.fetchVipRefereeDashboard();
    });

    expect(result.current.hasAttemptedFetch).toBe(true);
  });
});
